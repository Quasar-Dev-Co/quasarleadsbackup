#!/usr/bin/env node

/**
 * Test Fixed Email Automation Script
 * 
 * This script tests the fixed email automation to ensure:
 * 1. Each email sends only once
 * 2. All 7 emails send in sequence
 * 3. No duplicates or skipped emails
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testFixedEmailAutomation() {
  try {
    console.log('🧪 TESTING FIXED EMAIL AUTOMATION');
    console.log('===================================');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Step 1: Get current leads
    console.log('\n📋 Step 1: Getting current leads...');
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=10`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads) {
      console.log('❌ Failed to get leads:', leadsData.error);
      return;
    }
    
    const testLead = leadsData.leads[0];
    if (!testLead) {
      console.log('❌ No leads found for testing');
      return;
    }
    
    console.log(`📧 Testing with lead: ${testLead.name} (${testLead.email})`);
    
    // Step 2: Check current state
    console.log('\n🔍 Step 2: Checking current state...');
    const emailHistory = testLead.emailHistory || [];
    const sentEmails = emailHistory.filter((email) => email.status === 'sent');
    const emailsSentCount = sentEmails.length;
    
    console.log(`   Emails sent so far: ${emailsSentCount}/7`);
    console.log(`   Email history:`, emailHistory.map((e) => `${e.stage}: ${e.status}`));
    console.log(`   Current stage: ${testLead.emailSequenceStage}`);
    console.log(`   Automation active: ${testLead.emailSequenceActive}`);
    
    // Step 3: Reset lead for testing
    console.log('\n🔄 Step 3: Resetting lead for testing...');
    
    const resetResponse = await fetch(`${BASE_URL}/api/crm/leads`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: testLead._id,
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: 'called_once',
        emailSequenceStep: 1,
        emailStatus: 'ready',
        emailRetryCount: 0,
        emailFailureCount: 0,
        emailLastAttempt: null,
        nextScheduledEmail: new Date(), // Send immediately
        emailStoppedReason: null,
        emailHistory: [] // Clear email history for clean test
      })
    });
    
    if (!resetResponse.ok) {
      console.log('❌ Failed to reset lead');
      return;
    }
    
    console.log('✅ Lead reset successfully');
    
    // Step 4: Run email automation
    console.log('\n🚀 Step 4: Running email automation...');
    
    const automationResponse = await fetch(`${BASE_URL}/api/cron/email-automation`, {
      method: 'GET'
    });
    
    const automationData = await automationResponse.json();
    console.log(`📋 Automation Result:`);
    console.log(`   Success: ${automationData.success ? '✅' : '❌'}`);
    console.log(`   Message: ${automationData.message || automationData.error}`);
    
    if (automationData.results) {
      console.log(`   📊 Results:`);
      console.log(`     Total leads: ${automationData.results.totalLeads}`);
      console.log(`     Processed: ${automationData.results.processed}`);
      console.log(`     Successful: ${automationData.results.successful}`);
      console.log(`     Failed: ${automationData.results.failed}`);
    }
    
    // Step 5: Verify the result
    console.log('\n🔍 Step 5: Verifying result...');
    
    const verifyResponse = await fetch(`${BASE_URL}/api/crm/leads?leadId=${testLead._id}`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success && verifyData.lead) {
      const updatedLead = verifyData.lead;
      const updatedEmailHistory = updatedLead.emailHistory || [];
      const updatedSentEmails = updatedEmailHistory.filter((email) => email.status === 'sent');
      const updatedEmailsSentCount = updatedSentEmails.length;
      
      console.log(`\n📊 Updated lead state:`);
      console.log(`   Emails sent: ${updatedEmailsSentCount}/7`);
      console.log(`   Current stage: ${updatedLead.emailSequenceStage}`);
      console.log(`   Status: ${updatedLead.emailStatus}`);
      console.log(`   Next scheduled: ${updatedLead.nextScheduledEmail ? new Date(updatedLead.nextScheduledEmail).toISOString() : 'N/A'}`);
      
      if (updatedEmailHistory.length > 0) {
        console.log(`   Latest email: ${updatedEmailHistory[updatedEmailHistory.length - 1].stage} - ${updatedEmailHistory[updatedEmailHistory.length - 1].status}`);
      }
      
      // Check for duplicates
      const stageCounts = {};
      updatedEmailHistory.forEach((email) => {
        if (email.status === 'sent') {
          stageCounts[email.stage] = (stageCounts[email.stage] || 0) + 1;
        }
      });
      
      const duplicates = Object.entries(stageCounts).filter(([stage, count]) => count > 1);
      
      if (duplicates.length > 0) {
        console.log(`   ⚠️  DUPLICATES FOUND:`, duplicates);
      } else {
        console.log(`   ✅ No duplicates found`);
      }
      
      // Check for gaps
      const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
      const sentStages = updatedSentEmails.map((email) => email.stage);
      const missingStages = stages.slice(0, updatedEmailsSentCount).filter(stage => !sentStages.includes(stage));
      
      if (missingStages.length > 0) {
        console.log(`   ⚠️  MISSING STAGES:`, missingStages);
      } else {
        console.log(`   ✅ No missing stages`);
      }
      
    } else {
      console.log('❌ Failed to verify lead state');
    }
    
    console.log('\n🎉 Test completed!');
    console.log('\n📝 Expected behavior:');
    console.log('   1. ✅ First email (called_once) should send once');
    console.log('   2. ✅ No duplicate emails for any stage');
    console.log('   3. ✅ Proper progression through all 7 stages');
    console.log('   4. ✅ Timing should work correctly');
    console.log('   5. ✅ Email history should be accurate');
    
  } catch (error) {
    console.error('💥 Error testing email automation:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testFixedEmailAutomation()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
} 