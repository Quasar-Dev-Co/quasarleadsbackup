#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEmailSending() {
  try {
    console.log('🧪 TESTING EMAIL SENDING FUNCTIONALITY');
    console.log('======================================');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Test 1: Check if email service is working
    console.log('\n📧 Test 1: Testing email service directly...');
    
    const emailTestResponse = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: 'test-lead-id',
        stage: 'called_once',
        manual: true
      }),
    });
    
    const emailTestData = await emailTestResponse.json();
    console.log('📋 Email service test result:', emailTestData);
    
    if (emailTestData.success) {
      console.log('✅ Email service is working!');
    } else {
      console.log('❌ Email service failed:', emailTestData.error);
    }
    
    // Test 2: Check AI response generation
    console.log('\n🤖 Test 2: Testing AI response generation...');
    
    // First, create a test incoming email
    const testEmailData = {
      leadEmail: 'test@example.com',
      subject: 'Test Email for AI Response',
      content: 'Hi, I am interested in your services. Can you tell me more about what you offer?',
      fromAddress: 'test@example.com',
      toAddress: 'info@quasarseo.nl',
      isReply: true,
      isRecent: true
    };
    
    const incomingResponse = await fetch(`${BASE_URL}/api/email-responses/incoming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailData)
    });
    
    const incomingData = await incomingResponse.json();
    console.log('📋 Incoming email test result:', incomingData);
    
    if (incomingData.success) {
      console.log('✅ Incoming email created successfully!');
      console.log(`📧 Email ID: ${incomingData.emailId}`);
      
      // Now test AI response generation
      const aiResponse = await fetch(`${BASE_URL}/api/email-responses/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incomingEmailId: incomingData.emailId
        })
      });
      
      const aiData = await aiResponse.json();
      console.log('📋 AI response test result:', aiData);
      
      if (aiData.success) {
        console.log('✅ AI response generated successfully!');
        console.log(`📝 Subject: ${aiData.response.generatedSubject}`);
        console.log(`📝 Content: ${aiData.response.generatedContent.substring(0, 100)}...`);
        
        // Test 3: Send the AI response
        console.log('\n📤 Test 3: Testing AI response sending...');
        
        const sendResponse = await fetch(`${BASE_URL}/api/email-responses/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            responseId: aiData.response.id
          })
        });
        
        const sendData = await sendResponse.json();
        console.log('📋 Send test result:', sendData);
        
        if (sendData.success) {
          console.log('✅ AI response sent successfully!');
          console.log(`📧 Message ID: ${sendData.messageId}`);
        } else {
          console.log('❌ AI response sending failed:', sendData.error);
        }
      } else {
        console.log('❌ AI response generation failed:', aiData.error);
      }
    } else {
      console.log('❌ Incoming email creation failed:', incomingData.error);
    }
    
    // Test 4: Check sequence reply functionality
    console.log('\n🔄 Test 4: Testing sequence reply functionality...');
    
    const sequenceTestData = {
      leadEmail: 'info.pravas.cmp@gmail.com', // Use a real email that has received sequence emails
      subject: 'Re: called_once - Test Sequence Reply',
      content: 'Hi, I received your email and I am interested in learning more about your services.',
      fromAddress: 'info.pravas.cmp@gmail.com',
      toAddress: 'info@quasarseo.nl',
      messageId: `test-sequence-${Date.now()}@example.com`,
      inReplyTo: 'test-message-id',
      references: 'test-message-id',
      isReply: true,
      isRecent: true,
      threadId: `test-sequence-thread-${Date.now()}`
    };
    
    const sequenceResponse = await fetch(`${BASE_URL}/api/email-responses/incoming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sequenceTestData)
    });
    
    const sequenceData = await sequenceResponse.json();
    console.log('📋 Sequence reply test result:', sequenceData);
    
    if (sequenceData.success) {
      console.log('✅ Sequence reply processed successfully!');
      console.log(`🎯 Detected as sequence reply: ${sequenceData.isReplyToSequence}`);
      console.log(`📧 Original stage: ${sequenceData.originalStage}`);
      console.log(`🤖 AI response generated: ${sequenceData.aiResponseGenerated}`);
      
      if (sequenceData.aiResponseGenerated) {
        console.log('🎉 SUCCESS: Sequence reply auto-response worked!');
      } else {
        console.log('⚠️ Sequence reply was detected but AI response was not auto-generated');
      }
    } else {
      console.log('❌ Sequence reply test failed:', sequenceData.error);
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

// Run the test
testEmailSending(); 