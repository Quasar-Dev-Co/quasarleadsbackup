const fetch = require('node-fetch');

async function testDirect() {
  console.log('🔧 DIRECT TEST OF EMAIL AUTOMATION WORKFLOW');
  console.log('==========================================');
  
  const baseUrl = 'http://localhost:3000';
  
  // Step 1: Create a fresh test email
  console.log('\n📧 STEP 1: Create fresh test email');
  console.log('=================================');
  
  const testEmailPayload = {
    leadEmail: 'info.pravas.cs@gmail.com',
    subject: `Re: Direct Test ${Date.now()}`,
    content: 'This is a direct test to verify the complete email automation workflow is working.',
    fromAddress: 'info.pravas.cs@gmail.com',
    toAddress: 'info@quasarseo.nl',
    messageId: `direct-test-${Date.now()}@gmail.com`
  };
  
  try {
    const createResponse = await fetch(`${baseUrl}/api/email-responses/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEmailPayload)
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Fresh test email created!');
      console.log(`   ID: ${createData.email?.id}`);
      console.log(`   Status: ${createData.email?.status}`);
      console.log(`   Sentiment: ${createData.email?.sentiment}`);
      
      const emailId = createData.email.id;
      
      // Step 2: Test AI response generation
      console.log('\n🤖 STEP 2: Generate AI response');
      console.log('==============================');
      
      const generateResponse = await fetch(`${baseUrl}/api/email-responses/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: emailId })
      });
      
      if (generateResponse.ok) {
        const generateData = await generateResponse.json();
        console.log('✅ AI Response Generated!');
        console.log(`   Response ID: ${generateData.response?.id}`);
        console.log(`   Confidence: ${generateData.response?.confidence}%`);
        console.log(`   Response Type: ${generateData.response?.responseType}`);
        console.log(`   Auto-send recommended: ${generateData.response?.autoSendRecommended}`);
        console.log(`   Subject: "${generateData.response?.subject}"`);
        console.log(`   Content Preview: ${generateData.response?.content?.substring(0, 150)}...`);
        
        const responseId = generateData.response.id;
        
        // Step 3: Test SMTP sending
        console.log('\n📧 STEP 3: Send email via SMTP');
        console.log('=============================');
        
        const sendResponse = await fetch(`${baseUrl}/api/email-responses/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responseId: responseId })
        });
        
        if (sendResponse.ok) {
          const sendData = await sendResponse.json();
          console.log('✅ EMAIL SENT SUCCESSFULLY!');
          console.log(`   To: ${sendData.emailInfo?.to}`);
          console.log(`   Subject: ${sendData.emailInfo?.subject}`);
          console.log(`   Message ID: ${sendData.emailInfo?.messageId}`);
          console.log(`   Sent At: ${sendData.emailInfo?.sentAt}`);
          
          console.log('\n🎉🎉🎉 COMPLETE SUCCESS!');
          console.log('=======================');
          console.log('✅ Database: Working');
          console.log('✅ Email Creation: Working');
          console.log('✅ AI Generation: Working');
          console.log('✅ SMTP Sending: Working');
          console.log('📧 CHECK YOUR EMAIL INBOX NOW!');
          console.log('');
          console.log('🔥 THE EMAIL AUTOMATION SYSTEM IS 100% FUNCTIONAL!');
          
        } else {
          const sendError = await sendResponse.text();
          console.log('❌ SMTP sending failed:');
          console.log(`   Status: ${sendResponse.status}`);
          console.log(`   Error: ${sendError}`);
        }
        
      } else {
        const generateError = await generateResponse.text();
        console.log('❌ AI generation failed:');
        console.log(`   Status: ${generateResponse.status}`);
        console.log(`   Error: ${generateError}`);
      }
      
    } else {
      const createError = await createResponse.text();
      console.log('❌ Email creation failed:');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Error: ${createError}`);
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
  
  // Step 4: Test the automated cron workflow
  console.log('\n⚙️ STEP 4: Test automated cron workflow');
  console.log('======================================');
  
  try {
    // Create another fresh email for cron test
    const cronTestEmail = {
      leadEmail: 'info.pravas.cs@gmail.com',
      subject: `Re: Cron Test ${Date.now()}`,
      content: 'This email will test the automated cron job workflow for processing and auto-sending responses.',
      fromAddress: 'info.pravas.cs@gmail.com',
      toAddress: 'info@quasarseo.nl',
      messageId: `cron-test-${Date.now()}@gmail.com`
    };
    
    const cronCreateResponse = await fetch(`${baseUrl}/api/email-responses/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cronTestEmail)
    });
    
    if (cronCreateResponse.ok) {
      console.log('✅ Cron test email created');
      
      // Now trigger the cron job
      const cronResponse = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (cronResponse.ok) {
        const cronData = await cronResponse.json();
        console.log('✅ Cron Job Results:');
        console.log(`   Total unread: ${cronData.stats?.totalUnread || 0}`);
        console.log(`   Processed: ${cronData.stats?.processed || 0}`);
        console.log(`   Auto-sent: ${cronData.stats?.autoSent || 0}`);
        console.log(`   Drafts: ${cronData.stats?.drafts || 0}`);
        
        if (cronData.stats?.autoSent > 0) {
          console.log('\n🎉🎉🎉 CRON JOB AUTO-SENT EMAIL!');
          console.log('===============================');
          console.log('✅ AUTOMATED WORKFLOW IS WORKING!');
          console.log('📧 You should receive another auto-response!');
        } else if (cronData.stats?.processed > 0) {
          console.log('\n📝 Cron processed emails but saved as drafts');
          console.log('💡 Check confidence threshold settings');
        } else {
          console.log('\n⚠️ Cron found no unread emails to process');
        }
        
      } else {
        const cronError = await cronResponse.text();
        console.log('❌ Cron job failed:');
        console.log(cronError);
      }
    }
    
  } catch (error) {
    console.log(`❌ Cron test failed: ${error.message}`);
  }
  
  console.log('\n🎯 FINAL VERDICT');
  console.log('===============');
  console.log('If you saw "EMAIL SENT SUCCESSFULLY" above:');
  console.log('✅ Your email automation system is 100% working!');
  console.log('✅ The code is perfect!');
  console.log('✅ SMTP, AI, and database all functional!');
  console.log('');
  console.log('📧 Check your email inbox for the test responses!');
}

testDirect().catch(console.error); 