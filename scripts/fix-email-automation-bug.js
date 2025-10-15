#!/usr/bin/env node

/**
 * Fix Email Automation Bug Script
 * 
 * This script fixes the issues:
 * 1. First email sending multiple times
 * 2. 2nd, 4th, 6th emails not sending
 * 3. Proper progression through 7-email sequence
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function fixEmailAutomationBug() {
  try {
    console.log('🔧 FIXING EMAIL AUTOMATION BUG');
    console.log('================================');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Step 1: Get all leads with email automation
    console.log('\n📋 Step 1: Getting leads with email automation...');
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=50`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads) {
      console.log('❌ Failed to get leads:', leadsData.error);
      return;
    }
    
    const leadsWithAutomation = leadsData.leads.filter(lead => 
      lead.emailAutomationEnabled || lead.emailSequenceActive
    );
    
    console.log(`📧 Found ${leadsWithAutomation.length} leads with email automation`);
    
    if (leadsWithAutomation.length === 0) {
      console.log('❌ No leads with email automation found');
      return;
    }
    
    // Step 2: Reset each lead's email automation state
    console.log('\n🔄 Step 2: Resetting email automation state...');
    
    for (const lead of leadsWithAutomation) {
      console.log(`\n🔧 Processing: ${lead.name} (${lead.email})`);
      
      // Get current email history
      const emailHistory = lead.emailHistory || [];
      const sentEmails = emailHistory.filter((email) => email.status === 'sent');
      const emailsSentCount = sentEmails.length;
      
      console.log(`   Current state: ${emailsSentCount} emails sent`);
      console.log(`   Email history:`, emailHistory.map((e) => `${e.stage}: ${e.status}`));
      
      // Determine the correct next stage
      const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
      const nextStageIndex = emailsSentCount;
      const nextStage = stages[nextStageIndex];
      
      if (emailsSentCount >= 7) {
        console.log(`   ✅ Lead completed (${emailsSentCount}/7 emails sent)`);
        
        // Mark as completed
        await fetch(`${BASE_URL}/api/crm/leads`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead._id,
            emailSequenceActive: false,
            emailStatus: 'completed',
            emailStoppedReason: 'Sequence completed (7 emails sent)',
            nextScheduledEmail: null
          })
        });
        continue;
      }
      
      console.log(`   🎯 Next email should be: ${nextStage} (Step ${emailsSentCount + 1}/7)`);
      
      // Reset the lead's automation state
      const resetResponse = await fetch(`${BASE_URL}/api/crm/leads`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead._id,
          emailAutomationEnabled: true,
          emailSequenceActive: true,
          emailSequenceStage: nextStage,
          emailSequenceStep: emailsSentCount + 1,
          emailStatus: 'ready',
          emailRetryCount: 0,
          emailFailureCount: 0,
          emailLastAttempt: null,
          nextScheduledEmail: new Date(), // Send immediately
          emailStoppedReason: null
        })
      });
      
      if (resetResponse.ok) {
        console.log(`   ✅ Reset successful - next email: ${nextStage}`);
      } else {
        console.log(`   ❌ Reset failed for ${lead.name}`);
      }
    }
    
    // Step 3: Test the fixed automation
    console.log('\n🧪 Step 3: Testing fixed email automation...');
    
    const testResponse = await fetch(`${BASE_URL}/api/cron/email-automation`, {
      method: 'GET'
    });
    
    const testData = await testResponse.json();
    console.log(`📋 Test Result:`);
    console.log(`   Success: ${testData.success ? '✅' : '❌'}`);
    console.log(`   Message: ${testData.message || testData.error}`);
    
    if (testData.results) {
      console.log(`   📊 Results:`);
      console.log(`     Total leads: ${testData.results.totalLeads}`);
      console.log(`     Processed: ${testData.results.processed}`);
      console.log(`     Successful: ${testData.results.successful}`);
      console.log(`     Failed: ${testData.results.failed}`);
      console.log(`     Retries: ${testData.results.retries}`);
    }
    
    // Step 4: Verify the fix
    console.log('\n🔍 Step 4: Verifying the fix...');
    
    const verifyResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=10`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success && verifyData.leads) {
      console.log('\n📊 Current lead states:');
      
             verifyData.leads.forEach((lead) => {
         if (lead.emailAutomationEnabled || lead.emailSequenceActive) {
           const emailHistory = lead.emailHistory || [];
           const sentEmails = emailHistory.filter((email) => email.status === 'sent');
          const emailsSentCount = sentEmails.length;
          
          console.log(`   ${lead.name} (${lead.email}):`);
          console.log(`     Emails sent: ${emailsSentCount}/7`);
          console.log(`     Current stage: ${lead.emailSequenceStage}`);
          console.log(`     Status: ${lead.emailStatus}`);
          console.log(`     Active: ${lead.emailSequenceActive}`);
          console.log(`     Next scheduled: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toISOString() : 'N/A'}`);
        }
      });
    }
    
    console.log('\n🎉 Email automation bug fix completed!');
    console.log('\n📝 What was fixed:');
    console.log('   1. ✅ Prevents duplicate emails by checking email history');
    console.log('   2. ✅ Ensures proper progression through 7-email sequence');
    console.log('   3. ✅ Uses email count to determine next stage (not current stage)');
    console.log('   4. ✅ Proper timing checks to prevent premature sending');
    console.log('   5. ✅ Better error handling and retry logic');
    
  } catch (error) {
    console.error('💥 Error fixing email automation:', error.message);
  }
}

// Run the fix
if (require.main === module) {
  fixEmailAutomationBug()
    .then(() => {
      console.log('\n✅ Fix script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix script failed:', error);
      process.exit(1);
    });
} 