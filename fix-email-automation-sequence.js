#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function fixEmailAutomationSequence() {
  try {
    console.log('🔧 EMAIL AUTOMATION SEQUENCE FIX');
    console.log('=================================');
    console.log(`⏰ Current Time: ${new Date().toISOString()}`);
    
    // Step 1: Get all leads with email automation enabled
    console.log('\n📊 STEP 1: Getting leads with email automation...');
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=20`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads) {
      console.log('❌ Failed to get leads:', leadsData.error);
      return;
    }
    
    const automationLeads = leadsData.leads.filter(lead => 
      lead.emailAutomationEnabled
    );
    
    console.log(`✅ Found ${automationLeads.length} leads with email automation enabled`);
    
    let fixedLeads = 0;
    let errorsFound = 0;
    
    // Step 2: Fix each lead's automation state
    for (const lead of automationLeads) {
      try {
        console.log(`\n🔧 Checking: ${lead.name} (${lead.email})`);
        
        const emailHistory = lead.emailHistory || [];
        const emailsSentCount = emailHistory.length;
        
        console.log(`   📧 Emails sent: ${emailsSentCount}`);
        console.log(`   🔄 Automation active: ${lead.emailSequenceActive}`);
        console.log(`   📊 Current step: ${lead.emailSequenceStep || 'N/A'}`);
        console.log(`   🎭 Current stage: ${lead.emailSequenceStage || 'N/A'}`);
        console.log(`   ⏰ Next scheduled: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
        
        // Determine what the automation state should be
        const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
        const correctStep = emailsSentCount + 1;
        
        // Check if sequence should be completed
        if (correctStep > 7) {
          if (lead.emailSequenceActive) {
            console.log(`   ✅ Fixing: Marking sequence as completed (7 emails sent)`);
            
            const fixResponse = await fetch(`${BASE_URL}/api/crm/leads`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: lead.id,
                emailSequenceActive: false,
                emailStoppedReason: 'Sequence completed (7 emails sent)',
                nextScheduledEmail: null
              })
            });
            
            if (fixResponse.ok) {
              console.log(`   ✅ Fixed: Sequence marked as completed`);
              fixedLeads++;
            } else {
              console.log(`   ❌ Failed to fix completed sequence`);
              errorsFound++;
            }
          } else {
            console.log(`   ✅ Already correct: Sequence is completed`);
          }
          continue;
        }
        
        // Check if sequence is active but shouldn't be
        if (!lead.emailSequenceActive && emailsSentCount > 0 && emailsSentCount < 7) {
          console.log(`   🔧 Fixing: Sequence should be active (${emailsSentCount}/7 emails sent)`);
          
          const nextStage = stages[correctStep - 1];
          const nextEmailTime = new Date();
          nextEmailTime.setMinutes(nextEmailTime.getMinutes() + 5); // Schedule next email in 5 minutes
          
          const fixResponse = await fetch(`${BASE_URL}/api/crm/leads`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: lead.id,
              emailSequenceActive: true,
              emailSequenceStep: correctStep,
              emailSequenceStage: nextStage,
              nextScheduledEmail: nextEmailTime.toISOString(),
              emailStoppedReason: null
            })
          });
          
          if (fixResponse.ok) {
            console.log(`   ✅ Fixed: Sequence reactivated, next email: ${nextStage} at ${nextEmailTime.toLocaleString()}`);
            fixedLeads++;
          } else {
            console.log(`   ❌ Failed to reactivate sequence`);
            errorsFound++;
          }
          continue;
        }
        
        // Check if next email is missing or overdue
        if (lead.emailSequenceActive) {
          let needsFix = false;
          let fixReason = '';
          
          if (!lead.nextScheduledEmail) {
            needsFix = true;
            fixReason = 'Missing nextScheduledEmail';
          } else {
            const nextEmailDate = new Date(lead.nextScheduledEmail);
            const now = new Date();
            const overdueMinutes = Math.round((now.getTime() - nextEmailDate.getTime()) / (1000 * 60));
            
            if (overdueMinutes > 10) { // If more than 10 minutes overdue
              needsFix = true;
              fixReason = `Email overdue by ${overdueMinutes} minutes`;
            }
          }
          
          // Check if stage matches expected progression
          const expectedStage = stages[correctStep - 1];
          if (lead.emailSequenceStage !== expectedStage) {
            needsFix = true;
            fixReason = `Stage mismatch: has ${lead.emailSequenceStage}, should be ${expectedStage}`;
          }
          
          if (needsFix) {
            console.log(`   🔧 Fixing: ${fixReason}`);
            
            const nextEmailTime = new Date();
            nextEmailTime.setMinutes(nextEmailTime.getMinutes() + 2); // Schedule next email in 2 minutes
            
            const fixResponse = await fetch(`${BASE_URL}/api/crm/leads`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: lead.id,
                emailSequenceStep: correctStep,
                emailSequenceStage: expectedStage,
                nextScheduledEmail: nextEmailTime.toISOString()
              })
            });
            
            if (fixResponse.ok) {
              console.log(`   ✅ Fixed: Next email scheduled for ${expectedStage} at ${nextEmailTime.toLocaleString()}`);
              fixedLeads++;
            } else {
              console.log(`   ❌ Failed to fix email scheduling`);
              errorsFound++;
            }
          } else {
            console.log(`   ✅ Already correct: Email automation is properly configured`);
          }
        }
        
        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (leadError) {
        console.error(`   💥 Error processing ${lead.name}:`, leadError.message);
        errorsFound++;
      }
    }
    
    // Step 3: Force run the email automation cron job
    console.log('\n🤖 STEP 3: Triggering email automation cron job...');
    
    const cronResponse = await fetch(`${BASE_URL}/api/cron/email-automation`, {
      method: 'GET'
    });
    
    const cronData = await cronResponse.json();
    console.log(`📋 Cron Job Result: ${cronData.success ? '✅ Success' : '❌ Failed'}`);
    
    if (cronData.success) {
      console.log(`   📧 Emails sent: ${cronData.results?.emailsSent || 0}`);
      console.log(`   ⚙️ Automation enabled: ${cronData.results?.automationEnabled || 0}`);
      console.log(`   ❌ Errors: ${cronData.results?.errors || 0}`);
    } else {
      console.log(`   ❌ Error: ${cronData.error}`);
    }
    
    // Step 4: Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`✅ Leads fixed: ${fixedLeads}`);
    console.log(`❌ Errors encountered: ${errorsFound}`);
    console.log(`📧 Total leads processed: ${automationLeads.length}`);
    
    if (fixedLeads > 0) {
      console.log('\n🎉 Email automation has been fixed!');
      console.log('⏰ Next emails should be sent within the next 5 minutes by the cron job.');
      console.log('🔍 Run the debug script to verify: node debug-email-automation-issue.js');
    } else if (errorsFound === 0) {
      console.log('\n✅ No issues found - email automation is working correctly.');
      console.log('💡 If emails still aren\'t sending, check:');
      console.log('   - SMTP server connectivity');
      console.log('   - Email rate limits or daily sending limits');
      console.log('   - Vercel cron job execution in deployment logs');
    } else {
      console.log('\n⚠️ Some errors were encountered.');
      console.log('🔧 You may need to manually review the lead data or check API endpoints.');
    }
    
  } catch (error) {
    console.error('💥 Fix script error:', error.message);
  }
}

// Run the fix
fixEmailAutomationSequence(); 