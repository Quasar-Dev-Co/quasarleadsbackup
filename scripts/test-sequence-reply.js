#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testSequenceReply() {
  try {
    console.log('🧪 TESTING SEQUENCE REPLY FUNCTIONALITY');
    console.log('========================================');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // First, let's check if we have any leads with email history
    console.log('\n📊 Checking leads with email history...');
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=5`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads) {
      console.log('❌ Failed to get leads:', leadsData.error);
      return;
    }
    
    // Find a lead that has received emails from our sequence
    const leadWithEmails = leadsData.leads.find(lead => 
      lead.emailHistory && lead.emailHistory.length > 0
    );
    
    if (!leadWithEmails) {
      console.log('❌ No leads found with email history');
      return;
    }
    
    console.log(`✅ Found lead with emails: ${leadWithEmails.name} (${leadWithEmails.email})`);
    console.log(`📧 Emails sent: ${leadWithEmails.emailHistory.length}`);
    
    // Show email history
    console.log('\n📋 Email History:');
    leadWithEmails.emailHistory.forEach((email, i) => {
      console.log(`   ${i+1}. ${email.stage} - ${new Date(email.sentAt).toLocaleString()} - ${email.status}`);
    });
    
    // Get the most recent email stage
    const lastEmail = leadWithEmails.emailHistory[leadWithEmails.emailHistory.length - 1];
    console.log(`\n🎯 Most recent email stage: ${lastEmail.stage}`);
    
    // Now test the sequence reply functionality
    console.log('\n🤖 Testing sequence reply detection...');
    
    const testReplyData = {
      leadEmail: leadWithEmails.email,
      subject: `Re: ${lastEmail.stage} - Test Reply`,
      content: `Hi there,

Thanks for reaching out about your services. I'm interested in learning more about what you offer.

Could you tell me more about your pricing and what's included?

Best regards,
Test User`,
      htmlContent: `<p>Hi there,</p><p>Thanks for reaching out about your services. I'm interested in learning more about what you offer.</p><p>Could you tell me more about your pricing and what's included?</p><p>Best regards,<br>Test User</p>`,
      fromAddress: leadWithEmails.email,
      toAddress: 'info@quasarseo.nl',
      messageId: `test-${Date.now()}@example.com`,
      inReplyTo: lastEmail.messageId || 'test-message-id',
      references: lastEmail.messageId || 'test-message-id',
      isReply: true,
      isRecent: true,
      threadId: `test-thread-${Date.now()}`
    };
    
    console.log('📤 Sending test reply to incoming email API...');
    const replyResponse = await fetch(`${BASE_URL}/api/email-responses/incoming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testReplyData)
    });
    
    const replyData = await replyResponse.json();
    console.log('📋 Reply API response:', replyData);
    
    if (replyData.success) {
      console.log('✅ Test reply processed successfully!');
      console.log(`🎯 Detected as sequence reply: ${replyData.isReplyToSequence}`);
      console.log(`📧 Original stage: ${replyData.originalStage}`);
      console.log(`🤖 AI response generated: ${replyData.aiResponseGenerated}`);
      
      if (replyData.aiResponseGenerated) {
        console.log('🎉 SUCCESS: AI response was auto-generated for sequence reply!');
      } else {
        console.log('⚠️ AI response was not auto-generated');
      }
    } else {
      console.log('❌ Test reply failed:', replyData.error);
    }
    
    // Check the email responses to see if our test email was processed
    console.log('\n📧 Checking email responses...');
    const responsesResponse = await fetch(`${BASE_URL}/api/email-responses/incoming`);
    const responsesData = await responsesResponse.json();
    
    if (responsesData.success && responsesData.emails) {
      const testEmail = responsesData.emails.find(email => 
        email.leadEmail === leadWithEmails.email && 
        email.subject.includes('Test Reply')
      );
      
      if (testEmail) {
        console.log('✅ Test email found in responses!');
        console.log(`📧 Status: ${testEmail.status}`);
        console.log(`🔄 Is Reply: ${testEmail.isReply}`);
        console.log(`📋 Metadata:`, testEmail.metadata);
      } else {
        console.log('❌ Test email not found in responses');
      }
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

// Run the test
testSequenceReply(); 