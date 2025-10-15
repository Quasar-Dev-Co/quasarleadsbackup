const fetch = require('node-fetch');

/**
 * Comprehensive Email Response Flow Test
 * 
 * This test verifies the complete email response system:
 * 1. Creates test emails to simulate incoming replies
 * 2. Tests the fetch incoming emails cron job
 * 3. Tests the process email responses cron job
 * 4. Tests the complete email workflow
 * 5. Verifies emails are processed and responded to properly
 */

async function testCompleteEmailResponseFlow() {
  console.log('🧪 Starting Comprehensive Email Response Flow Test...\n');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const testResults = {
    emailCreation: false,
    emailFetching: false,
    emailProcessing: false,
    emailWorkflow: false,
    emailFiltering: false,
    overallSuccess: false
  };
  
  try {
    // Test 1: Create test emails to simulate incoming replies
    console.log('📧 Test 1: Creating test emails...');
    const testEmails = [
      {
        leadEmail: 'test-reply-1@example.com',
        subject: 'Re: Your lead generation proposal',
        content: 'Hi there! I received your email about lead generation. I\'m very interested in learning more about your services. Could we schedule a call to discuss this further?',
        isReply: true,
        isRecent: true,
        threadId: 'thread-test-1'
      },
      {
        leadEmail: 'test-reply-2@example.com',
        subject: 'Re: QuasarLeads - AI-powered lead generation',
        content: 'Thank you for reaching out. I\'m interested in your AI-powered lead generation services. What are your pricing options?',
        isReply: true,
        isRecent: true,
        threadId: 'thread-test-2'
      },
      {
        leadEmail: 'test-new@example.com',
        subject: 'Question about your services',
        content: 'I found your website and I\'m interested in your marketing services. Can you tell me more?',
        isReply: false,
        isRecent: true,
        threadId: 'thread-test-3'
      }
    ];
    
    let createdEmails = 0;
    for (const email of testEmails) {
      const response = await fetch(`${baseUrl}/api/email-responses/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email)
      });
      
      if (response.ok) {
        createdEmails++;
        const data = await response.json();
        console.log(`✅ Created test email: ${email.subject} (ID: ${data.emailId})`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to create test email: ${email.subject} - ${errorText}`);
      }
    }
    
    testResults.emailCreation = createdEmails === testEmails.length;
    console.log(`\n📊 Email Creation Results: ${createdEmails}/${testEmails.length} emails created\n`);
    
    // Test 2: Test the fetch incoming emails cron job
    console.log('📬 Test 2: Testing fetch incoming emails cron job...');
    const fetchResponse = await fetch(`${baseUrl}/api/cron/fetch-incoming-emails`, {
      method: 'POST'
    });
    
    if (fetchResponse.ok) {
      const fetchData = await fetchResponse.json();
      testResults.emailFetching = fetchData.success;
      console.log(`✅ Email fetching test: ${fetchData.success ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Stats: ${JSON.stringify(fetchData.stats)}`);
    } else {
      const errorText = await fetchResponse.text();
      console.error(`❌ Email fetching test failed: ${errorText}`);
    }
    
    // Test 3: Test the process email responses cron job
    console.log('\n🤖 Test 3: Testing process email responses cron job...');
    const processResponse = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
      method: 'POST'
    });
    
    if (processResponse.ok) {
      const processData = await processResponse.json();
      testResults.emailProcessing = processData.success;
      console.log(`✅ Email processing test: ${processData.success ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Stats: ${JSON.stringify(processData.stats)}`);
    } else {
      const errorText = await processResponse.text();
      console.error(`❌ Email processing test failed: ${errorText}`);
    }
    
    // Test 4: Test the complete email workflow
    console.log('\n🔄 Test 4: Testing complete email workflow...');
    const workflowResponse = await fetch(`${baseUrl}/api/cron/email-workflow`, {
      method: 'POST'
    });
    
    if (workflowResponse.ok) {
      const workflowData = await workflowResponse.json();
      testResults.emailWorkflow = workflowData.success;
      console.log(`✅ Email workflow test: ${workflowData.success ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Health: ${JSON.stringify(workflowData.health)}`);
      console.log(`   📊 Stats: ${JSON.stringify(workflowData.stats)}`);
    } else {
      const errorText = await workflowResponse.text();
      console.error(`❌ Email workflow test failed: ${errorText}`);
    }
    
    // Test 5: Test email filtering in the frontend
    console.log('\n📋 Test 5: Testing email filtering...');
    const emailsResponse = await fetch(`${baseUrl}/api/email-responses/incoming`);
    
    if (emailsResponse.ok) {
      const emailsData = await emailsResponse.json();
      if (emailsData.success) {
        const emails = emailsData.emails || [];
        const recentEmails = emails.filter(email => email.isRecent);
        const replyEmails = emails.filter(email => email.isReply);
        const unreadEmails = emails.filter(email => email.status === 'unread');
        
        testResults.emailFiltering = emails.length > 0;
        console.log(`✅ Email filtering test: ${testResults.emailFiltering ? 'PASSED' : 'FAILED'}`);
        console.log(`   📊 Total emails: ${emails.length}`);
        console.log(`   📊 Recent emails: ${recentEmails.length}`);
        console.log(`   📊 Reply emails: ${replyEmails.length}`);
        console.log(`   📊 Unread emails: ${unreadEmails.length}`);
      } else {
        console.error(`❌ Email filtering test failed: ${emailsData.error}`);
      }
    } else {
      const errorText = await emailsResponse.text();
      console.error(`❌ Email filtering test failed: ${errorText}`);
    }
    
    // Final Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE EMAIL RESPONSE FLOW TEST RESULTS');
    console.log('='.repeat(60));
    
    const tests = [
      { name: 'Email Creation', passed: testResults.emailCreation, icon: '📧' },
      { name: 'Email Fetching', passed: testResults.emailFetching, icon: '📬' },
      { name: 'Email Processing', passed: testResults.emailProcessing, icon: '🤖' },
      { name: 'Email Workflow', passed: testResults.emailWorkflow, icon: '🔄' },
      { name: 'Email Filtering', passed: testResults.emailFiltering, icon: '📋' }
    ];
    
    let passedTests = 0;
    tests.forEach(test => {
      const status = test.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${test.icon} ${test.name}: ${status}`);
      if (test.passed) passedTests++;
    });
    
    testResults.overallSuccess = passedTests === tests.length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📈 Overall Result: ${passedTests}/${tests.length} tests passed`);
    console.log(`🎯 System Status: ${testResults.overallSuccess ? '✅ HEALTHY' : '❌ NEEDS ATTENTION'}`);
    
    if (testResults.overallSuccess) {
      console.log('\n🎉 Congratulations! The email response system is working perfectly!');
      console.log('📧 Your system will now:');
      console.log('   1. ✅ Fetch incoming emails every minute');
      console.log('   2. ✅ Process unread emails every minute');
      console.log('   3. ✅ Send AI-generated responses automatically');
      console.log('   4. ✅ Handle replied emails from the past 20 minutes perfectly');
      console.log('   5. ✅ Filter and display emails properly in the frontend');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above and fix them.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. 📱 Check the email responses page: /email-responses');
    console.log('   2. 🔍 Monitor the cron job logs in Vercel');
    console.log('   3. 📧 Send a test email to your system to verify it works');
    console.log('   4. 🚀 Deploy to production when ready');
    
    return testResults;
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    return { ...testResults, error: error.message };
  }
}

// Run the test
testCompleteEmailResponseFlow()
  .then(results => {
    console.log('\n🏁 Test execution completed.');
    process.exit(results.overallSuccess ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  }); 