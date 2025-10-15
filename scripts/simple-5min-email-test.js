#!/usr/bin/env node

/**
 * Simple 5-minute email test script
 * This bypasses the complex automation and sends emails directly every 5 minutes
 */

const BASE_URL = 'http://localhost:3000';

let emailCount = 0;
const MAX_EMAILS = 7;
const INTERVAL_MINUTES = 5;

async function sendDirectEmail(leadId, stage, emailNumber) {
  try {
    console.log(`📤 Sending email ${emailNumber}/${MAX_EMAILS} for stage: ${stage}`);
    
    const response = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: leadId,
        stage: stage,
        manual: false
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Email ${emailNumber} sent successfully!`);
      console.log(`📧 To: ${data.emailData.to}`);
      console.log(`📋 Stage: ${data.emailData.stage}`);
      console.log(`🆔 Message ID: ${data.emailData.messageId}`);
      return true;
    } else {
      console.log(`❌ Email ${emailNumber} failed:`, data.error);
      return false;
    }
    
  } catch (error) {
    console.error(`💥 Error sending email ${emailNumber}:`, error.message);
    return false;
  }
}

async function startSimpleEmailTest() {
  try {
    console.log('🚀 Starting Simple 5-Minute Email Test');
    console.log('='.repeat(50));
    
    // Get the lead
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=1`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads || leadsData.leads.length === 0) {
      console.log('❌ No leads found');
      return;
    }
    
    const lead = leadsData.leads[0];
    console.log(`📧 Testing with lead: ${lead.name} (${lead.email})`);
    console.log(`⏰ Will send ${MAX_EMAILS} emails every ${INTERVAL_MINUTES} minutes`);
    console.log(`🕒 Started at: ${new Date().toLocaleTimeString()}`);
    console.log('');
    
    const stages = [
      'called_twice',      // Start from the 2nd email since 1st was already sent
      'called_three_times',
      'called_four_times',
      'called_five_times',
      'called_six_times',
      'called_seven_times'
    ];
    
    console.log('📝 Note: Starting from called_twice since called_once was already sent');
    
    // Send first email immediately
    emailCount++;
    const firstEmailSuccess = await sendDirectEmail(lead.id, stages[0], emailCount);
    
    if (firstEmailSuccess) {
      console.log(`⏳ Next email in ${INTERVAL_MINUTES} minutes...`);
      console.log('');
    } else {
      console.log('❌ First email failed, stopping test');
      return;
    }
    
    // Set up interval for remaining emails
    const interval = setInterval(async () => {
      if (emailCount >= MAX_EMAILS) {
        console.log('🎉 All emails sent! Test complete.');
        clearInterval(interval);
        return;
      }
      
      emailCount++;
      const stage = stages[emailCount - 1];
      
      console.log(`🕒 Time: ${new Date().toLocaleTimeString()}`);
      const success = await sendDirectEmail(lead.id, stage, emailCount);
      
      if (success) {
        if (emailCount < MAX_EMAILS) {
          console.log(`⏳ Next email in ${INTERVAL_MINUTES} minutes...`);
        } else {
          console.log('🎉 All emails sent! Test complete.');
          clearInterval(interval);
        }
      } else {
        console.log('❌ Email failed, stopping test');
        clearInterval(interval);
      }
      
      console.log('');
      
    }, INTERVAL_MINUTES * 60 * 1000); // Convert minutes to milliseconds
    
    console.log('📝 Test Status:');
    console.log('- Press Ctrl+C to stop the test');
    console.log('- Check your email inbox for messages');
    console.log('- Each email will be sent exactly 5 minutes apart');
    
  } catch (error) {
    console.error('💥 Setup Error:', error.message);
  }
}

// Start the test
startSimpleEmailTest().catch(console.error); 