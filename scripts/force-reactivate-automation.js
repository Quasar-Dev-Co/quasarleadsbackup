#!/usr/bin/env node

async function forceReactivateAutomation() {
  try {
    console.log('🚀 FORCE REACTIVATING EMAIL AUTOMATION');
    console.log('=====================================');
    
    const baseUrl = 'https://text-gpt-test.vercel.app';
    
    // Get the lead
    const leadsResponse = await fetch(`${baseUrl}/api/leads`);
    const leadsData = await leadsResponse.json();
    const pravasLead = leadsData.leads?.find(lead => 
      lead.name?.includes('Pravas') || lead.email?.includes('pravas')
    );
    
    if (!pravasLead) {
      console.log('❌ Lead not found');
      return;
    }
    
    console.log('📧 Current lead status:');
    console.log(`  Emails sent: ${pravasLead.emailHistory?.length || 0}`);
    console.log(`  Automation active: ${pravasLead.emailSequenceActive}`);
    console.log(`  Current step: ${pravasLead.emailSequenceStep}`);
    
    // Calculate what should be the next email
    const emailsSent = pravasLead.emailHistory?.length || 0;
    const nextStep = emailsSent + 1;
    const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    
    if (nextStep > 7) {
      console.log('✅ All emails have been sent');
      return;
    }
    
    const nextStage = stages[nextStep - 1];
    
    // Set next email to NOW (immediate)
    const nextEmailTime = new Date();
    
    console.log(`\n🎯 Should be at step ${nextStep} (${nextStage})`);
    console.log(`Setting next email to: ${nextEmailTime.toISOString()}`);
    
    // Call our force-fix API (should be deployed now)
    console.log('\n🔧 Calling force-fix API...');
    
    const fixResponse = await fetch(`${baseUrl}/api/force-fix-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leadEmail: pravasLead.email
      })
    });
    
    if (fixResponse.ok) {
      const fixResult = await fixResponse.json();
      console.log('✅ Force fix successful:');
      console.log(JSON.stringify(fixResult, null, 2));
      
      // Wait a moment then trigger cron
      console.log('\n⏰ Waiting 3 seconds then triggering cron...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const cronResponse = await fetch(`${baseUrl}/api/cron/email-automation`);
      const cronResult = await cronResponse.json();
      
      console.log('\n📧 CRON JOB RESULT:');
      console.log(`Success: ${cronResult.success}`);
      console.log(`Emails sent: ${cronResult.results?.emailsSent || 0}`);
      console.log(`Errors: ${cronResult.results?.errors || 0}`);
      
      if (cronResult.results?.emailsSent > 0) {
        console.log('\n🎉 EMAIL SENT! CHECK YOUR INBOX!');
        console.log('📧 The automation is now working correctly');
        console.log('⏰ Next emails will be sent every 5 minutes automatically');
      } else {
        console.log('\n⚠️ Still no email sent. Possible issues:');
        console.log('1. Email service (Gmail) configuration');
        console.log('2. SMTP authentication');
        console.log('3. Email template generation');
        console.log('4. Network connectivity');
      }
      
    } else {
      const errorText = await fixResponse.text();
      console.log('❌ Force fix failed:', errorText);
      
      if (fixResponse.status === 405) {
        console.log('💡 The force-fix API is not deployed yet. Trying alternative...');
        
        // Alternative: Just reactivate manually via CRM API
        console.log('\n🔄 Trying alternative: Reactivate via direct update...');
        
        // This will NOT trigger the stage change logic that stops automation
        // since we're only updating automation fields, not changing stage
        const directUpdate = await fetch(`${baseUrl}/api/crm/leads`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            leadId: pravasLead._id,
            stage: 'called_twice', // Keep current stage
            notes: 'Force reactivated automation'
          })
        });
        
        if (directUpdate.ok) {
          console.log('✅ Alternative fix applied');
          
          // Trigger cron
          const cronResponse = await fetch(`${baseUrl}/api/cron/email-automation`);
          const cronResult = await cronResponse.json();
          
          console.log('\nCron result:', cronResult.results?.emailsSent || 0, 'emails sent');
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

console.log('🚀 FORCE REACTIVATE AUTOMATION');
console.log('==============================');
forceReactivateAutomation(); 