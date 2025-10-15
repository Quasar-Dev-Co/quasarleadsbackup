#!/usr/bin/env node

// Fix your lead through the live Vercel API
async function fixLeadViaAPI() {
  try {
    console.log('🔧 FIXING YOUR LEAD VIA LIVE API');
    console.log('================================');
    
    const baseUrl = 'https://text-gpt-test.vercel.app';
    
    // First, let's get the current lead status
    console.log('📋 Getting current lead status...');
    
    const leadsResponse = await fetch(`${baseUrl}/api/leads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!leadsResponse.ok) {
      throw new Error(`Failed to get leads: ${leadsResponse.status}`);
    }
    
    const leadsData = await leadsResponse.json();
    console.log(`📧 Found ${leadsData.leads?.length || 0} leads`);
    
    // Find Pravas Sarkar
    const pravasLead = leadsData.leads?.find(lead => 
      lead.name?.includes('Pravas') || lead.email?.includes('pravas')
    );
    
    if (!pravasLead) {
      console.log('❌ Pravas Sarkar lead not found!');
      console.log('Available leads:');
      leadsData.leads?.forEach(lead => {
        console.log(`  - ${lead.name} (${lead.email})`);
      });
      return;
    }
    
    console.log('\n🔍 CURRENT LEAD STATUS:');
    console.log(`Name: ${pravasLead.name}`);
    console.log(`Email: ${pravasLead.email}`);
    console.log(`Stage: ${pravasLead.stage}`);
    console.log(`Email Automation: ${pravasLead.emailAutomationEnabled}`);
    console.log(`Sequence Active: ${pravasLead.emailSequenceActive}`);
    console.log(`Email Step: ${pravasLead.emailSequenceStep}`);
    console.log(`Email Stage: ${pravasLead.emailSequenceStage}`);
    console.log(`Next Email: ${pravasLead.nextScheduledEmail}`);
    console.log(`Emails Sent: ${pravasLead.emailHistory?.length || 0}`);
    
    if (pravasLead.emailHistory && pravasLead.emailHistory.length > 0) {
      console.log('\nEmail History:');
      pravasLead.emailHistory.forEach((email, i) => {
        console.log(`  ${i+1}. ${email.stage} - ${new Date(email.sentAt).toLocaleString()} - ${email.status}`);
      });
    }
    
    // Calculate what should be the correct state
    const emailsSent = pravasLead.emailHistory?.length || 0;
    const nextStep = emailsSent + 1;
    const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    
    console.log(`\n🧮 CALCULATION:`);
    console.log(`Emails sent: ${emailsSent}`);
    console.log(`Should be at step: ${nextStep}`);
    
    if (nextStep > 7) {
      console.log('✅ Email sequence should be complete');
      return;
    }
    
    const nextStage = stages[nextStep - 1];
    console.log(`Next stage should be: ${nextStage}`);
    
    // Calculate next email time (should be NOW + 5 minutes)
    const nextEmailTime = new Date();
    nextEmailTime.setMinutes(nextEmailTime.getMinutes() + 5);
    
    console.log(`Next email should be: ${nextEmailTime.toISOString()}`);
    
    // Now fix the lead using the special force-fix API
    console.log('\n🔧 FORCE FIXING THE LEAD...');
    
    const updateResponse = await fetch(`${baseUrl}/api/force-fix-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leadEmail: pravasLead.email
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update lead: ${updateResponse.status} - ${errorText}`);
    }
    
    const updateResult = await updateResponse.json();
    console.log('\n✅ LEAD UPDATE RESULT:');
    console.log(JSON.stringify(updateResult, null, 2));
    
    // Now trigger the cron job immediately
    console.log('\n📧 TRIGGERING CRON JOB...');
    
    const cronResponse = await fetch(`${baseUrl}/api/cron/email-automation`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const cronResult = await cronResponse.json();
    console.log('\n📧 CRON JOB RESULT:');
    console.log(JSON.stringify(cronResult, null, 2));
    
    if (cronResult.success && cronResult.results?.emailsSent > 0) {
      console.log('\n🎉 SUCCESS! EMAIL SENT!');
      console.log(`📧 Emails sent: ${cronResult.results.emailsSent}`);
    } else {
      console.log('\n⚠️ No email sent yet. Checking why...');
      
      if (cronResult.results?.skipped > 0) {
        console.log('Lead was skipped. Possible reasons:');
        console.log('1. Email already sent recently (within 24 hours)');
        console.log('2. Invalid email format');
        console.log('3. nextScheduledEmail is still in the future');
        console.log('4. Lead not found in automation query');
      }
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Check your email in the next 5 minutes');
    console.log('2. The Vercel cron job runs every minute automatically');
    console.log('3. If no email arrives, check the Vercel function logs');
    
  } catch (error) {
    console.error('💥 ERROR:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your Vercel app is deployed');
    console.log('2. Check if the API endpoints exist');
    console.log('3. Verify the lead exists in the database');
  }
}

console.log('🚀 LIVE API LEAD FIX');
console.log('===================');
fixLeadViaAPI(); 