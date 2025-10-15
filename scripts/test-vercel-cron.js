#!/usr/bin/env node

// Test the actual Vercel cron job endpoint
async function testVercelCron() {
  try {
    console.log('🧪 TESTING VERCEL CRON JOB ENDPOINT');
    console.log('====================================');
    
    // Your actual Vercel URL - replace with your actual domain
    const baseUrl = 'https://text-gpt-test.vercel.app'; // Update this with your actual Vercel URL
    const cronEndpoint = `${baseUrl}/api/cron/email-automation`;
    
    console.log(`📧 Calling: ${cronEndpoint}`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    const response = await fetch(cronEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Manual-Test-Script'
      }
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    console.log('\n📧 CRON JOB RESPONSE:');
    console.log('=====================');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ CRON JOB IS WORKING!');
      
      if (data.results) {
        console.log(`📧 Emails sent: ${data.results.emailsSent || 0}`);
        console.log(`⚙️ Automation enabled: ${data.results.automationEnabled || 0}`);
        console.log(`⏭️ Skipped: ${data.results.skipped || 0}`);
        console.log(`❌ Errors: ${data.results.errors || 0}`);
        
        if (data.results.details && data.results.details.length > 0) {
          console.log('\n📋 Email Details:');
          data.results.details.forEach((detail, i) => {
            console.log(`${i+1}. ${detail.leadName} (${detail.email}): ${detail.success ? '✅' : '❌'} - Step ${detail.step}`);
          });
        }
      }
      
      if (data.results?.emailsSent > 0) {
        console.log('\n🎉 EMAILS ARE BEING SENT!');
      } else {
        console.log('\n⚠️ No emails sent - checking lead status...');
      }
      
    } else {
      console.log('\n❌ CRON JOB FAILED!');
      console.log(`Error: ${data.error || 'Unknown error'}`);
    }
    
    // Also test the health endpoint
    console.log('\n🏥 TESTING HEALTH ENDPOINT...');
    const healthResponse = await fetch(`${baseUrl}/api/cron/health`);
    const healthData = await healthResponse.json();
    
    console.log('Health Status:', healthData.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY');
    if (healthData.issues && healthData.issues.length > 0) {
      console.log('Issues found:');
      healthData.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
  } catch (error) {
    console.error('💥 ERROR TESTING CRON JOB:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 POSSIBLE SOLUTIONS:');
      console.log('1. Check if your Vercel app is deployed and running');
      console.log('2. Update the baseUrl in this script with your actual Vercel URL');
      console.log('3. Make sure the cron endpoint exists at /api/cron/email-automation');
    }
  }
}

// Also test the manual trigger endpoint
async function testManualTrigger() {
  try {
    console.log('\n🔧 TESTING MANUAL TRIGGER...');
    
    const baseUrl = 'https://text-gpt-test.vercel.app';
    const manualEndpoint = `${baseUrl}/api/cron/email-automation`;
    
    const response = await fetch(manualEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('Manual Trigger Result:', data.success ? '✅' : '❌');
    if (data.testResult) {
      console.log('Test Result:', JSON.stringify(data.testResult, null, 2));
    }
    
  } catch (error) {
    console.log('Manual trigger failed:', error.message);
  }
}

// Run the tests
console.log('🚀 VERCEL EMAIL AUTOMATION TEST');
console.log('===============================');
console.log('Testing your actual Vercel deployment...\n');

testVercelCron()
  .then(() => testManualTrigger())
  .then(() => {
    console.log('\n🎯 TEST COMPLETE!');
    console.log('\nIf the cron job is working but no emails are being sent:');
    console.log('1. Check if your lead has the right stage and timing');
    console.log('2. Verify email automation is enabled for the lead');
    console.log('3. Check if nextScheduledEmail is set correctly');
    console.log('4. Make sure email service configuration is working');
  }); 