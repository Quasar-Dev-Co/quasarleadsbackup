#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

async function fixEmailTiming() {
  try {
    console.log('🔧 Fixing email timing for immediate processing...');
    
    // Get the current lead status
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=1`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads || leadsData.leads.length === 0) {
      console.log('❌ No leads found');
      return;
    }
    
    const lead = leadsData.leads[0];
    console.log(`📧 Current lead: ${lead.name}`);
    console.log(`📅 Current next email time: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
    console.log(`📊 Current step: ${lead.emailSequenceStep}, stage: ${lead.emailSequenceStage}`);
    
    // Let's try to manually trigger the next email by using the direct MongoDB update
    // We'll set the nextScheduledEmail to current time so it processes immediately
    
    console.log('🔄 Testing dev email automation first...');
    
    // Try the dev automation endpoint
    const devResponse = await fetch(`${BASE_URL}/api/dev-email-automation`);
    const devData = await devResponse.json();
    
    console.log('📋 Dev automation result:');
    console.log(`   - Success: ${devData.success}`);
    console.log(`   - Message: ${devData.message}`);
    console.log(`   - Emails sent: ${devData.results?.emailsSent || 0}`);
    console.log(`   - Total leads: ${devData.results?.totalLeads || 0}`);
    
    if (devData.results?.details) {
      console.log('📧 Email details:', devData.results.details);
    }
    
    // Check lead status again
    console.log('\n🔍 Checking lead status after dev automation...');
    const updatedResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=1`);
    const updatedData = await updatedResponse.json();
    
    if (updatedData.success && updatedData.leads[0]) {
      const updatedLead = updatedData.leads[0];
      console.log(`📧 Updated lead: ${updatedLead.name}`);
      console.log(`📊 Step: ${updatedLead.emailSequenceStep}, Stage: ${updatedLead.emailSequenceStage}`);
      console.log(`📅 Next email: ${updatedLead.nextScheduledEmail ? new Date(updatedLead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
      console.log(`📧 Emails sent: ${updatedLead.emailHistory?.length || 0}`);
      console.log(`🔄 Active: ${updatedLead.emailSequenceActive}`);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

fixEmailTiming(); 