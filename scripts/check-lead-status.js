#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

async function checkLeadStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/crm/leads?limit=10`);
    const data = await response.json();
    
    if (data.success && data.leads) {
      console.log('📊 All Leads Status:');
      console.log('='.repeat(50));
      
      let activeCount = 0;
      let totalCount = 0;
      
      data.leads.forEach((lead, i) => {
        totalCount++;
        console.log(`${i+1}. ${lead.name} (${lead.email})`);
        console.log(`   - Stage: ${lead.stage || 'N/A'}`);
        console.log(`   - Email Automation Enabled: ${lead.emailAutomationEnabled || false}`);
        console.log(`   - Email Sequence Active: ${lead.emailSequenceActive || false}`);
        console.log(`   - Email Sequence Step: ${lead.emailSequenceStep || 'N/A'}`);
        console.log(`   - Email Sequence Stage: ${lead.emailSequenceStage || 'N/A'}`);
        console.log(`   - Next Email: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
        console.log(`   - Emails Sent: ${lead.emailHistory?.length || 0}`);
        
        if (lead.emailStoppedReason) {
          console.log(`   - Stopped Reason: ${lead.emailStoppedReason}`);
        }
        
        if (lead.emailHistory && lead.emailHistory.length > 0) {
          console.log(`   - Last Email: ${new Date(lead.emailHistory[lead.emailHistory.length - 1].sentAt).toLocaleString()}`);
          console.log(`   - Last Email Stage: ${lead.emailHistory[lead.emailHistory.length - 1].stage}`);
        }
        
        if (lead.emailSequenceActive) {
          activeCount++;
        }
        
        console.log('');
      });
      
      console.log(`Total leads: ${totalCount}, Active email automation: ${activeCount}`);
    } else {
      console.log('Failed to fetch leads:', data.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLeadStatus(); 