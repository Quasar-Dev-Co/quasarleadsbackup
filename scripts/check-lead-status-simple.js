#!/usr/bin/env node

async function checkLeadStatus() {
  try {
    console.log('🔍 CHECKING LEAD STATUS AFTER UPDATE');
    console.log('====================================');
    
    const baseUrl = 'https://text-gpt-test.vercel.app';
    
    const leadsResponse = await fetch(`${baseUrl}/api/leads`);
    const leadsData = await leadsResponse.json();
    const pravasLead = leadsData.leads?.find(lead => 
      lead.name?.includes('Pravas') || lead.email?.includes('pravas')
    );
    
    if (!pravasLead) {
      console.log('❌ Lead not found');
      return;
    }
    
    console.log('📧 CURRENT LEAD STATUS:');
    console.log(`Name: ${pravasLead.name}`);
    console.log(`Email: ${pravasLead.email}`);
    console.log(`Stage: ${pravasLead.stage}`);
    console.log(`Email Automation Enabled: ${pravasLead.emailAutomationEnabled}`);
    console.log(`Email Sequence Active: ${pravasLead.emailSequenceActive}`);
    console.log(`Email Sequence Step: ${pravasLead.emailSequenceStep}`);
    console.log(`Email Sequence Stage: ${pravasLead.emailSequenceStage}`);
    console.log(`Next Scheduled Email: ${pravasLead.nextScheduledEmail}`);
    console.log(`Emails Sent: ${pravasLead.emailHistory?.length || 0}`);
    
    if (pravasLead.nextScheduledEmail) {
      const nextEmailDate = new Date(pravasLead.nextScheduledEmail);
      const now = new Date();
      const timeDiff = nextEmailDate.getTime() - now.getTime();
      const minutesDiff = Math.round(timeDiff / (1000 * 60));
      
      console.log(`Next email is in: ${minutesDiff} minutes`);
      console.log(`Next email date: ${nextEmailDate.toLocaleString()}`);
      console.log(`Current time: ${now.toLocaleString()}`);
      console.log(`Should send now: ${timeDiff <= 0 ? 'YES' : 'NO'}`);
    }
    
    if (pravasLead.emailHistory && pravasLead.emailHistory.length > 0) {
      console.log('\n📧 EMAIL HISTORY:');
      pravasLead.emailHistory.forEach((email, i) => {
        console.log(`${i+1}. ${email.stage} - ${new Date(email.sentAt).toLocaleString()} - ${email.status}`);
      });
    }
    
    // Analysis
    console.log('\n🧮 ANALYSIS:');
    
    if (!pravasLead.emailAutomationEnabled) {
      console.log('❌ Email automation is DISABLED');
    } else if (!pravasLead.emailSequenceActive) {
      console.log('❌ Email sequence is INACTIVE');
    } else if (pravasLead.nextScheduledEmail) {
      const nextEmailDate = new Date(pravasLead.nextScheduledEmail);
      const now = new Date();
      
      if (nextEmailDate > now) {
        console.log('⏰ Next email is scheduled for the future');
      } else {
        console.log('✅ Next email should be sent NOW (past due)');
      }
    } else {
      console.log('❓ No next email date set');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

checkLeadStatus(); 