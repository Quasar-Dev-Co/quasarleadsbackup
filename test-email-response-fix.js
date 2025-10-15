// Test script to verify email response saving fix
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testEmailResponseSaving() {
  console.log('🧪 Testing Email Response Saving Fix');
  console.log('=====================================');
  
  // Test 1: Valid email payload
  console.log('\n📧 Test 1: Valid email payload');
  const validEmailPayload = {
    leadEmail: 'test@example.com',
    subject: 'Test Email Response',
    content: 'This is a test email response to verify the fix.',
    htmlContent: '<p>This is a test email response to verify the fix.</p>',
    fromAddress: 'test@example.com',
    toAddress: 'info@quasarseo.nl',
    messageId: `test-${Date.now()}@example.com`,
    inReplyTo: 'previous-message-id'
  };

  try {
    const response = await fetch(`${baseUrl}/api/email-responses/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validEmailPayload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Valid email saved successfully');
      console.log(`   Email ID: ${data.emailId}`);
      console.log(`   Message: ${data.message}`);
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to save valid email');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 2: Invalid email payload (missing required fields)
  console.log('\n📧 Test 2: Invalid email payload (missing subject)');
  const invalidEmailPayload = {
    leadEmail: 'test2@example.com',
    // subject: missing
    content: 'This email is missing a subject.',
    htmlContent: '<p>This email is missing a subject.</p>',
    fromAddress: 'test2@example.com',
    toAddress: 'info@quasarseo.nl',
    messageId: `test-invalid-${Date.now()}@example.com`
  };

  try {
    const response = await fetch(`${baseUrl}/api/email-responses/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEmailPayload)
    });

    if (response.ok) {
      console.log('❌ Invalid email should have failed but succeeded');
    } else {
      const errorText = await response.text();
      console.log('✅ Invalid email correctly rejected');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 3: Email payload with extra fields (like the original issue)
  console.log('\n📧 Test 3: Email with extra fields (original issue)');
  const emailWithExtraFields = {
    leadEmail: 'test3@example.com',
    subject: 'Test Email with Extra Fields',
    content: 'This email has extra fields that should be ignored.',
    htmlContent: '<p>This email has extra fields that should be ignored.</p>',
    fromAddress: 'test3@example.com',
    toAddress: 'info@quasarseo.nl',
    messageId: `test-extra-${Date.now()}@example.com`,
    inReplyTo: '',
    // Extra fields that caused the original issue
    isForwarded: true,
    originalServer: 'gmail',
    extraField: 'this should be ignored'
  };

  try {
    const response = await fetch(`${baseUrl}/api/email-responses/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailWithExtraFields)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Email with extra fields saved successfully (extra fields ignored)');
      console.log(`   Email ID: ${data.emailId}`);
      console.log(`   Message: ${data.message}`);
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to save email with extra fields');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 4: Check if emails are in database and ready for processing
  console.log('\n📊 Test 4: Check unread emails in database');
  try {
    const response = await fetch(`${baseUrl}/api/email-responses/incoming?status=unread&limit=5`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.emails?.length || 0} unread emails in database`);
      
      if (data.emails && data.emails.length > 0) {
        console.log('📧 Recent unread emails:');
        data.emails.forEach((email, index) => {
          console.log(`   ${index + 1}. "${email.subject}" from ${email.leadEmail}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch emails from database');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 5: Test the email processing cron job
  console.log('\n🤖 Test 5: Test email processing cron job');
  try {
    const response = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Email processing cron job executed');
      console.log(`   Processed: ${data.stats?.processed || 0}`);
      console.log(`   Success: ${data.stats?.success || 0}`);
      console.log(`   Failures: ${data.stats?.failures || 0}`);
      
      if (data.stats?.processed > 0) {
        console.log('🎉 Email processing is working!');
      } else {
        console.log('⚠️ No emails were processed (might be normal if no unread emails)');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Email processing cron job failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n🏁 Test completed!');
  console.log('================');
  console.log('💡 If all tests passed, the email response system should be working correctly.');
  console.log('💡 Check the logs above for any issues that need attention.');
}

// Run the test
testEmailResponseSaving().catch(console.error); 