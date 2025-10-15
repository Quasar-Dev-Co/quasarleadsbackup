#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

async function restartEmailAutomation() {
  try {
    console.log('🚀 Starting Email Automation for Lead...');
    
    // First, get the lead ID
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=10`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads || leadsData.leads.length === 0) {
      console.log('❌ No leads found');
      return;
    }
    
    const lead = leadsData.leads[0]; // Get first lead
    console.log(`📧 Found lead: ${lead.name} (${lead.email})`);
    console.log(`📊 Current stage: ${lead.stage}`);
    
    // Start email automation
    console.log('🔄 Starting email automation...');
    const automationResponse = await fetch(`${BASE_URL}/api/crm/email-automation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: lead.id,
        action: 'start',
        stage: lead.stage || 'called_once'
      }),
    });
    
    const automationData = await automationResponse.json();
    console.log('📋 Automation start result:', automationData);
    
    if (automationData.success) {
      console.log('✅ Email automation started successfully!');
      
      // Wait a moment then check the updated status
      console.log('⏳ Waiting 2 seconds then checking updated status...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedResponse = await fetch(`${BASE_URL}/api/crm/leads?leadId=${lead.id}`);
      const updatedData = await updatedResponse.json();
      
      if (updatedData.success) {
        const updatedLead = updatedData.lead;
        console.log('\n📊 Updated Lead Status:');
        console.log(`   - Email Automation Enabled: ${updatedLead.emailAutomationEnabled}`);
        console.log(`   - Email Sequence Active: ${updatedLead.emailSequenceActive}`);
        console.log(`   - Email Sequence Step: ${updatedLead.emailSequenceStep}`);
        console.log(`   - Email Sequence Stage: ${updatedLead.emailSequenceStage}`);
        console.log(`   - Next Email: ${updatedLead.nextScheduledEmail ? new Date(updatedLead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
        console.log(`   - Emails Sent: ${updatedLead.emailHistory?.length || 0}`);
      }
      
      console.log('\n🔄 Now run the email automation test script to start processing:');
      console.log('node scripts/run-email-automation-test.js');
      
    } else {
      console.log('❌ Failed to start automation:', automationData.error);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

restartEmailAutomation(); 