#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function debugEmailAutomation() {
  try {
    console.log('🔍 EMAIL AUTOMATION DIAGNOSTIC TOOL');
    console.log('====================================');
    
    // Step 1: Check leads status
    console.log('\n📊 STEP 1: Checking leads status...');
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=5`);
    const leadsData = await leadsResponse.json();
    
    if (leadsData.success && leadsData.leads) {
      console.log(`✅ Found ${leadsData.leads.length} leads`);
      
      leadsData.leads.forEach((lead, index) => {
        console.log(`\n👤 Lead ${index + 1}: ${lead.name} (${lead.email})`);
        console.log(`   📊 Stage: ${lead.stage || 'N/A'}`);
        console.log(`   🔄 Email Automation Enabled: ${lead.emailAutomationEnabled || false}`);
        console.log(`   ▶️ Email Sequence Active: ${lead.emailSequenceActive || false}`);
        console.log(`   📧 Email Sequence Step: ${lead.emailSequenceStep || 'N/A'}`);
        console.log(`   🎭 Email Sequence Stage: ${lead.emailSequenceStage || 'N/A'}`);
        console.log(`   ⏰ Next Scheduled Email: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
        console.log(`   📋 Email History: ${lead.emailHistory?.length || 0} emails sent`);
        
        if (lead.emailHistory && lead.emailHistory.length > 0) {
          console.log('   📧 Last Email:', lead.emailHistory[lead.emailHistory.length - 1]);
        }
      });
    } else {
      console.log('❌ Failed to get leads:', leadsData.error);
      return;
    }
    
    // Step 2: Test cron job manually
    console.log('\n🤖 STEP 2: Testing email automation cron job...');
    const cronResponse = await fetch(`${BASE_URL}/api/cron/email-automation`, {
      method: 'GET'
    });
    const cronData = await cronResponse.json();
    
    console.log('📋 Cron job result:');
    console.log(`   Success: ${cronData.success}`);
    console.log(`   Message: ${cronData.message || 'N/A'}`);
    
    if (cronData.results) {
      console.log(`   📧 Emails sent: ${cronData.results.emailsSent}`);
      console.log(`   ❌ Errors: ${cronData.results.errors}`);
      console.log(`   📊 Total leads processed: ${cronData.results.totalLeads || 0}`);
      console.log(`   ⚙️ Automation enabled: ${cronData.results.automationEnabled || 0}`);
    }
    
    // Step 3: Check if any lead needs automation setup
    console.log('\n🔧 STEP 3: Setting up automation for first lead...');
    if (leadsData.leads && leadsData.leads.length > 0) {
      const firstLead = leadsData.leads[0];
      
      // Start automation if not already active
      if (!firstLead.emailSequenceActive) {
        console.log(`🚀 Starting automation for ${firstLead.name}...`);
        
        const startResponse = await fetch(`${BASE_URL}/api/crm/email-automation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: firstLead._id,
            action: 'start',
            stage: firstLead.stage || 'called_once'
          })
        });
        
        const startData = await startResponse.json();
        console.log('📋 Automation start result:');
        console.log(`   Success: ${startData.success}`);
        console.log(`   Message: ${startData.message || startData.error}`);
        
        if (startData.success) {
          // Wait 2 seconds then run cron again
          console.log('\n⏱️ Waiting 2 seconds then testing cron again...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const cronResponse2 = await fetch(`${BASE_URL}/api/cron/email-automation`, {
            method: 'GET'
          });
          const cronData2 = await cronResponse2.json();
          
          console.log('📋 Second cron job result:');
          console.log(`   Success: ${cronData2.success}`);
          console.log(`   Message: ${cronData2.message || 'N/A'}`);
          
          if (cronData2.results) {
            console.log(`   📧 Emails sent: ${cronData2.results.emailsSent}`);
            console.log(`   ❌ Errors: ${cronData2.results.errors}`);
            console.log(`   📊 Total leads processed: ${cronData2.results.totalLeads || 0}`);
          }
        }
      } else {
        console.log(`✅ ${firstLead.name} already has active automation`);
      }
    }
    
    // Step 4: Fix email automation endpoint
    console.log('\n🔧 STEP 4: Testing fix email automation endpoint...');
    const fixResponse = await fetch(`${BASE_URL}/api/fix-email-automation-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const fixData = await fixResponse.json();
    console.log('📋 Fix automation result:');
    console.log(`   Success: ${fixData.success}`);
    console.log(`   Message: ${fixData.message || fixData.error}`);
    
    if (fixData.results) {
      console.log(`   📧 Emails sent: ${fixData.results.emailsSent}`);
      console.log(`   🔧 Leads fixed: ${fixData.results.leadsFixed || 0}`);
    }
    
    console.log('\n🎉 DIAGNOSTIC COMPLETE!');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. If no emails are being sent, check email configuration');
    console.log('2. If timing is wrong, check company email timing settings');
    console.log('3. If automation is not starting, check lead stage settings');
    console.log('4. Run this script again to monitor progress');
    
  } catch (error) {
    console.error('💥 Diagnostic Error:', error.message);
    console.log('\n📝 Make sure:');
    console.log('1. Your development server is running on http://localhost:3000');
    console.log('2. Database connection is working');
    console.log('3. Email service is configured');
  }
}

// Run the diagnostic
debugEmailAutomation(); 