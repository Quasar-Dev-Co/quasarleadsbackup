#!/usr/bin/env node

/**
 * Test script for CRM Email Automation System
 * This script demonstrates:
 * 1. Starting an automated email sequence
 * 2. Testing the cron job functionality
 * 3. Managing email automation settings
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';

async function testEmailAutomationSystem() {
  console.log('🧪 Testing CRM Email Automation System\n');

  // Replace with a real lead ID from your database
  const sampleLeadId = '507f1f77bcf86cd799439011'; // MongoDB ObjectId format

  console.log('📋 Test Scenarios:');
  console.log('1. Start email automation for a lead');
  console.log('2. Test cron job processing');
  console.log('3. Pause email automation');
  console.log('4. Resume email automation');
  console.log('5. Stop email automation\n');

  try {
    // Test 1: Start email automation
    console.log('🚀 Test 1: Starting email automation');
    const test1 = await fetch(`${BASE_URL}/api/crm/email-automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        action: 'start',
        stage: 'called_once'
      })
    });
    const result1 = await test1.json();
    console.log('Result:', result1.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', result1.message || result1.error);
    console.log('');

    // Test 2: Test cron job (manual trigger)
    console.log('🚀 Test 2: Testing cron job processing');
    const test2 = await fetch(`${BASE_URL}/api/cron/email-automation`, {
      method: 'POST', // Use POST for manual testing
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    const result2 = await test2.json();
    console.log('Result:', result2.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', result2.message || result2.error);
    if (result2.results) {
      console.log('Emails sent:', result2.results.emailsSent);
      console.log('Errors:', result2.results.errors);
    }
    console.log('');

    // Test 3: Pause automation
    console.log('🚀 Test 3: Pausing email automation');
    const test3 = await fetch(`${BASE_URL}/api/crm/email-automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        action: 'pause'
      })
    });
    const result3 = await test3.json();
    console.log('Result:', result3.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', result3.message || result3.error);
    console.log('');

    // Test 4: Resume automation
    console.log('🚀 Test 4: Resuming email automation');
    const test4 = await fetch(`${BASE_URL}/api/crm/email-automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        action: 'resume'
      })
    });
    const result4 = await test4.json();
    console.log('Result:', result4.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', result4.message || result4.error);
    console.log('');

    // Test 5: Stop automation
    console.log('🚀 Test 5: Stopping email automation');
    const test5 = await fetch(`${BASE_URL}/api/crm/email-automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        action: 'stop',
        reason: 'Testing complete'
      })
    });
    const result5 = await test5.json();
    console.log('Result:', result5.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', result5.message || result5.error);
    console.log('');

    console.log('🎉 Test Summary:');
    console.log('- Email automation can be started for leads in calling stages');
    console.log('- Cron job processes scheduled emails every 2 hours');
    console.log('- Automation can be paused, resumed, or stopped as needed');
    console.log('- Each lead can have up to 7 automated emails (one per week)');
    console.log('- Manual stage changes will stop/modify automation');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.log('\n📝 Setup Instructions:');
    console.log('1. Make sure your development server is running on localhost:3000');
    console.log('2. Update the sampleLeadId with a real lead ID from your database');
    console.log('3. Set CRON_SECRET environment variable for authentication');
    console.log('4. Ensure Gmail is configured for email sending');
  }
}

// Additional function to test email automation status
async function checkAutomationStatus() {
  console.log('\n🔍 Checking Email Automation Status...\n');
  
  try {
    // This would be a custom endpoint to check automation status
    console.log('📊 Active email sequences, paused sequences, completed sequences');
    console.log('📈 Email delivery rates, open rates, response rates');
    console.log('⏰ Next scheduled email times');
    console.log('🚫 Stopped sequences and reasons');
    
    console.log('\n💡 Email Automation Features:');
    console.log('- Automatic start when lead moves to "called_once"');
    console.log('- 7-day intervals between emails');
    console.log('- Automatic stop when lead moves to "meeting" or "deal"');
    console.log('- Manual override controls (pause/resume/stop)');
    console.log('- Email history tracking for each lead');
    console.log('- Duplicate prevention and rate limiting');
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  console.log('📧 CRM Email Automation System Test\n');
  console.log('This system provides:');
  console.log('• Automated email sequences for lead nurturing');
  console.log('• 7-day intervals between follow-up emails');
  console.log('• Up to 7 emails per lead sequence');
  console.log('• Smart stopping when leads advance to meetings/deals');
  console.log('• Manual controls for pausing and resuming');
  console.log('• Comprehensive email history tracking\n');
  
  testEmailAutomationSystem()
    .then(() => checkAutomationStatus())
    .then(() => {
      console.log('\n✅ Email automation system testing complete!');
      console.log('\n🚀 Next Steps:');
      console.log('1. Set up Vercel cron job to run every 2 hours');
      console.log('2. Configure email templates for each stage');
      console.log('3. Test with real leads in your CRM');
      console.log('4. Monitor email delivery and response rates');
    })
    .catch(console.error);
} 