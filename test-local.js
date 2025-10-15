const fetch = require('node-fetch');

async function testLocal() {
  console.log('🔧 TESTING EMAIL AUTOMATION LOCALLY');
  console.log('===================================');
  
  // Test local development server
  const baseUrl = 'http://localhost:3000';
  
  // Wait a bit for the dev server to start
  console.log('⏳ Waiting for dev server to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 1: Test database connection
  console.log('\n📋 STEP 1: Test database connection');
  console.log('==================================');
  try {
    const response = await fetch(`${baseUrl}/api/email-responses/incoming?limit=5`);
    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Database connection working!');
      console.log(`📧 Emails found: ${data.emails?.length || 0}`);
      
      if (data.emails && data.emails.length > 0) {
        console.log('\n📩 Recent emails:');
        data.emails.forEach((email, i) => {
          console.log(`   ${i+1}. "${email.subject}" from ${email.leadEmail} - Status: ${email.status}`);
        });
        
        // Test with existing email
        const testEmail = data.emails[0];
        
        // Step 2: Reset email to unread
        console.log('\n🔄 STEP 2: Reset email to unread');
        console.log('===============================');
        const resetResponse = await fetch(`${baseUrl}/api/email-responses/incoming`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testEmail.id,
            status: 'unread'
          })
        });
        
        if (resetResponse.ok) {
          console.log('✅ Email reset to unread');
          
          // Step 3: Test AI generation
          console.log('\n🤖 STEP 3: Test AI response generation');
          console.log('====================================');
          const generateResponse = await fetch(`${baseUrl}/api/email-responses/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId: testEmail.id })
          });
          
          if (generateResponse.ok) {
            const generateData = await generateResponse.json();
            console.log('✅ AI Generation Success!');
            console.log(`   Response ID: ${generateData.response?.id}`);
            console.log(`   Confidence: ${generateData.response?.confidence}%`);
            console.log(`   Content: ${generateData.response?.content?.substring(0, 200)}...`);
            
            // Step 4: Test SMTP sending
            console.log('\n📧 STEP 4: Test SMTP sending');
            console.log('===========================');
            const sendResponse = await fetch(`${baseUrl}/api/email-responses/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ responseId: generateData.response.id })
            });
            
            if (sendResponse.ok) {
              const sendData = await sendResponse.json();
              console.log('✅ SMTP Send Success!');
              console.log(`   To: ${sendData.emailInfo?.to}`);
              console.log(`   Message ID: ${sendData.emailInfo?.messageId}`);
              
              console.log('\n🎉 COMPLETE WORKFLOW WORKING!');
              console.log('============================');
              console.log('✅ Database: Working');
              console.log('✅ AI Generation: Working');
              console.log('✅ SMTP Sending: Working');
              console.log('📧 Check your email inbox!');
              
            } else {
              const sendError = await sendResponse.text();
              console.log('❌ SMTP sending failed:');
              console.log(sendError);
            }
            
          } else {
            const generateError = await generateResponse.text();
            console.log('❌ AI generation failed:');
            console.log(generateError);
          }
          
        } else {
          console.log('❌ Failed to reset email status');
        }
        
      } else {
        // No emails in database, create a test one
        console.log('\n📧 STEP 2: Create test email');
        console.log('===========================');
        const testEmailPayload = {
          leadEmail: 'info.pravas.cs@gmail.com',
          subject: 'Re: Local Test Email',
          content: 'This is a test email to verify the local email automation system is working properly.',
          fromAddress: 'info.pravas.cs@gmail.com',
          toAddress: 'info@quasarseo.nl',
          messageId: `local-test-${Date.now()}@gmail.com`
        };
        
        const createResponse = await fetch(`${baseUrl}/api/email-responses/incoming`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testEmailPayload)
        });
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('✅ Test email created!');
          console.log(`   ID: ${createData.email?.id}`);
          
          // Now test the complete workflow
          console.log('\n🤖 STEP 3: Test complete workflow');
          console.log('================================');
          const workflowResponse = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (workflowResponse.ok) {
            const workflowData = await workflowResponse.json();
            console.log('✅ Workflow Results:');
            console.log(`   Processed: ${workflowData.stats?.processed || 0}`);
            console.log(`   Auto-sent: ${workflowData.stats?.autoSent || 0}`);
            
            if (workflowData.stats?.autoSent > 0) {
              console.log('\n🎉🎉🎉 SUCCESS! AUTO-RESPONSE SENT!');
              console.log('==================================');
              console.log('✅ The email automation system is working!');
              console.log('📧 Check your email inbox for the response!');
            } else {
              console.log('\n⚠️ Workflow processed but no auto-send');
            }
          }
        }
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Database connection failed:');
      console.log(errorText);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Dev server not running yet. Starting it now...');
    }
  }
  
  console.log('\n🎯 LOCAL TESTING COMPLETE');
  console.log('========================');
  console.log('If everything works locally, the code is fine.');
  console.log('The issue might be with Vercel deployment or environment variables.');
}

// Wait a bit then test
setTimeout(() => {
  testLocal().catch(console.error);
}, 8000); // Wait 8 seconds for dev server to fully start

console.log('🚀 Starting local test in 8 seconds...'); 