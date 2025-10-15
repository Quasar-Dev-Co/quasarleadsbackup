#!/usr/bin/env node

// Simple direct reset of lead state
async function resetLeadNow() {
  try {
    console.log('🚨 RESETTING LEAD STATE FOR IMMEDIATE EMAIL');
    console.log('===========================================');
    
    const baseUrl = 'https://text-gpt-test.vercel.app';
    
    // Get the lead first
    const leadsResponse = await fetch(`${baseUrl}/api/leads`);
    const leadsData = await leadsResponse.json();
    const pravasLead = leadsData.leads?.find(lead => 
      lead.name?.includes('Pravas') || lead.email?.includes('pravas')
    );
    
    if (!pravasLead) {
      console.log('❌ Lead not found');
      return;
    }
    
    console.log('📧 Current lead state:');
    console.log(`  Name: ${pravasLead.name}`);
    console.log(`  Email: ${pravasLead.email}`);
    console.log(`  Step: ${pravasLead.emailSequenceStep}`);
    console.log(`  Stage: ${pravasLead.emailSequenceStage}`);
    console.log(`  Emails sent: ${pravasLead.emailHistory?.length || 0}`);
    console.log(`  Next email: ${pravasLead.nextScheduledEmail}`);
    
    // Instead of complex logic, let's just move the lead to called_twice stage
    // This will trigger the automation properly
    console.log('\n🔧 Moving lead to called_twice stage...');
    
    const updateResponse = await fetch(`${baseUrl}/api/crm/leads`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leadId: pravasLead._id,
        stage: 'called_twice',
        notes: 'Reset for email automation testing'
      })
    });
    
    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('✅ Lead updated successfully');
      
      // Wait a moment for the update to propagate
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Now trigger the cron job
      console.log('\n📧 Triggering cron job...');
      
      const cronResponse = await fetch(`${baseUrl}/api/cron/email-automation`);
      const cronResult = await cronResponse.json();
      
      console.log('\n📊 CRON JOB RESULT:');
      if (cronResult.success) {
        console.log(`✅ Success: ${cronResult.message}`);
        console.log(`📧 Emails sent: ${cronResult.results?.emailsSent || 0}`);
        console.log(`⚙️ Automation enabled: ${cronResult.results?.automationEnabled || 0}`);
        console.log(`⏭️ Skipped: ${cronResult.results?.skipped || 0}`);
        console.log(`❌ Errors: ${cronResult.results?.errors || 0}`);
        
        if (cronResult.results?.emailsSent > 0) {
          console.log('\n🎉 EMAIL SENT! Check your inbox!');
        } else {
          console.log('\n⚠️ Still no email sent. Issue might be:');
          console.log('1. Email service configuration');
          console.log('2. SMTP settings');
          console.log('3. Email template issues');
          console.log('4. Gmail app password');
        }
      } else {
        console.log('❌ Cron job failed:', cronResult.error);
      }
      
    } else {
      const errorText = await updateResponse.text();
      console.log('❌ Failed to update lead:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

console.log('🚀 LEAD RESET & EMAIL TRIGGER');
console.log('==============================');
resetLeadNow(); 