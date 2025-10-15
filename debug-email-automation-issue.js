#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function debugEmailAutomation() {
  try {
    console.log('🔍 EMAIL AUTOMATION DEBUG TOOL');
    console.log('===============================');
    console.log(`⏰ Current Time: ${new Date().toISOString()}`);
    
    // Step 1: Get all leads with email automation
    console.log('\n📊 STEP 1: Checking all leads with email automation...');
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=10`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads) {
      console.log('❌ Failed to get leads:', leadsData.error);
      return;
    }
    
    const activeLeads = leadsData.leads.filter(lead => 
      lead.emailAutomationEnabled && lead.emailSequenceActive
    );
    
    console.log(`✅ Found ${activeLeads.length} leads with active email automation`);
    
    if (activeLeads.length === 0) {
      console.log('⚠️ No leads have active email automation!');
      
      // Check if any leads have automation enabled but inactive
      const inactiveAutomation = leadsData.leads.filter(lead => 
        lead.emailAutomationEnabled && !lead.emailSequenceActive
      );
      
      if (inactiveAutomation.length > 0) {
        console.log(`🚨 Found ${inactiveAutomation.length} leads with automation ENABLED but INACTIVE:`);
        inactiveAutomation.forEach(lead => {
          console.log(`   - ${lead.name}: Reason: ${lead.emailStoppedReason || 'Unknown'}`);
        });
      }
      
      return;
    }
    
    // Step 2: Analyze each active lead in detail
    console.log('\n🔍 STEP 2: Detailed analysis of active leads...');
    
    for (const lead of activeLeads) {
      console.log(`\n👤 LEAD: ${lead.name} (${lead.email})`);
      console.log(`   📊 Stage: ${lead.stage || 'N/A'}`);
      console.log(`   🔄 Email Automation Enabled: ${lead.emailAutomationEnabled}`);
      console.log(`   ▶️ Email Sequence Active: ${lead.emailSequenceActive}`);
      console.log(`   📧 Email Sequence Step: ${lead.emailSequenceStep || 'N/A'}`);
      console.log(`   🎭 Email Sequence Stage: ${lead.emailSequenceStage || 'N/A'}`);
      console.log(`   ⏰ Next Scheduled Email: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
      console.log(`   📋 Email History Count: ${lead.emailHistory?.length || 0}`);
      
      // Check if next email is overdue
      if (lead.nextScheduledEmail) {
        const nextEmailDate = new Date(lead.nextScheduledEmail);
        const now = new Date();
        const diffMinutes = Math.round((nextEmailDate.getTime() - now.getTime()) / (1000 * 60));
        
        if (diffMinutes < 0) {
          console.log(`   🚨 OVERDUE: Next email was due ${Math.abs(diffMinutes)} minutes ago!`);
        } else {
          console.log(`   ⏰ Next email in ${diffMinutes} minutes`);
        }
      } else {
        console.log(`   ❌ NO NEXT EMAIL SCHEDULED!`);
      }
      
      // Analyze email history
      if (lead.emailHistory && lead.emailHistory.length > 0) {
        console.log(`   📧 Email History:`);
        lead.emailHistory.forEach((email, i) => {
          const sentDate = new Date(email.sentAt);
          console.log(`      ${i+1}. ${email.stage} - ${sentDate.toLocaleString()} - ${email.status} ${email.messageId ? `(ID: ${email.messageId})` : ''}`);
        });
        
        // Check for expected progression
        const expectedStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
        const nextExpectedStage = expectedStages[lead.emailHistory.length];
        
        if (nextExpectedStage) {
          console.log(`   🎯 Next expected email: ${nextExpectedStage} (Step ${lead.emailHistory.length + 1})`);
          
          if (lead.emailSequenceStage !== nextExpectedStage) {
            console.log(`   ⚠️ MISMATCH: Lead stage is ${lead.emailSequenceStage} but should be ${nextExpectedStage}`);
          }
        }
      } else {
        console.log(`   ❌ No email history found!`);
      }
    }
    
    // Step 3: Check cron job status
    console.log('\n🤖 STEP 3: Testing email automation cron job...');
    const cronResponse = await fetch(`${BASE_URL}/api/cron/email-automation`, {
      method: 'GET'
    });
    
    const cronData = await cronResponse.json();
    console.log(`📋 Cron Job Response: ${cronData.success ? '✅ Success' : '❌ Failed'}`);
    
    if (cronData.success) {
      console.log(`   📧 Emails sent: ${cronData.results?.emailsSent || 0}`);
      console.log(`   ⚙️ Automation enabled: ${cronData.results?.automationEnabled || 0}`);
      console.log(`   ❌ Errors: ${cronData.results?.errors || 0}`);
      console.log(`   📊 Total processed: ${cronData.results?.totalLeads || 0}`);
      
      if (cronData.results?.details && cronData.results.details.length > 0) {
        console.log(`   📋 Processing details:`);
        cronData.results.details.forEach(detail => {
          console.log(`      - ${detail.leadName}: ${detail.action} ${detail.error ? `(Error: ${detail.error})` : ''}`);
        });
      }
    } else {
      console.log(`   ❌ Error: ${cronData.error}`);
    }
    
    // Step 4: Check for conflicting systems
    console.log('\n⚡ STEP 4: Checking for conflicting email systems...');
    
    // Check job queue system
    const jobsResponse = await fetch(`${BASE_URL}/api/jobs/status`, {
      method: 'GET'
    });
    
    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json();
      console.log(`📋 Job Queue System: ${jobsData.success ? '✅ Active' : '❌ Inactive'}`);
      
      if (jobsData.jobs) {
        const emailJobs = jobsData.jobs.filter(job => job.type === 'email-sequence');
        console.log(`   📧 Active email sequence jobs: ${emailJobs.length}`);
        
        emailJobs.forEach(job => {
          console.log(`      - Job ${job.jobId}: ${job.status} (${job.progress}%)`);
        });
      }
    } else {
      console.log(`📋 Job Queue System: ❓ Status unknown`);
    }
    
    // Step 5: Recommendations
    console.log('\n💡 STEP 5: Diagnosis and Recommendations...');
    
    const issuesFound = [];
    
    // Check for common issues
    const leadsWithoutNextEmail = activeLeads.filter(lead => !lead.nextScheduledEmail);
    if (leadsWithoutNextEmail.length > 0) {
      issuesFound.push(`${leadsWithoutNextEmail.length} leads missing nextScheduledEmail field`);
    }
    
    const overdueLeads = activeLeads.filter(lead => {
      if (!lead.nextScheduledEmail) return false;
      return new Date(lead.nextScheduledEmail) < new Date();
    });
    
    if (overdueLeads.length > 0) {
      issuesFound.push(`${overdueLeads.length} leads have overdue emails`);
    }
    
    const stageMismatches = activeLeads.filter(lead => {
      if (!lead.emailHistory || lead.emailHistory.length === 0) return false;
      const expectedStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
      const nextExpectedStage = expectedStages[lead.emailHistory.length];
      return lead.emailSequenceStage !== nextExpectedStage;
    });
    
    if (stageMismatches.length > 0) {
      issuesFound.push(`${stageMismatches.length} leads have stage mismatches`);
    }
    
    if (issuesFound.length > 0) {
      console.log('🚨 ISSUES DETECTED:');
      issuesFound.forEach(issue => console.log(`   - ${issue}`));
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('   1. Run the fix automation endpoint: POST /api/fix-email-automation-now');
      console.log('   2. Check email service SMTP settings');
      console.log('   3. Verify timing configuration in company settings');
      console.log('   4. Consider disabling one of the email systems if both are active');
    } else {
      console.log('✅ No obvious issues detected. Email system appears to be configured correctly.');
      console.log('💡 If emails still aren\'t sending, check:');
      console.log('   - SMTP server connectivity');
      console.log('   - Email rate limits');
      console.log('   - Vercel cron job execution logs');
    }
    
  } catch (error) {
    console.error('💥 Debug script error:', error.message);
  }
}

// Run the debug
debugEmailAutomation(); 