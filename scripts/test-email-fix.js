#!/usr/bin/env node

/**
 * Test script to verify the CRM email fix
 * This script demonstrates:
 * 1. Automatic email sending (blocked if already sent)
 * 2. Manual email override (allows resending)
 * 3. Different stages can send their respective emails
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testEmailFunctionality() {
  console.log('🧪 Testing CRM Email System Fix\n');

  // Sample lead ID - replace with a real one from your database
  const sampleLeadId = '507f1f77bcf86cd799439011'; // MongoDB ObjectId format
  const testStage = 'called_once';

  console.log('📋 Test Scenarios:');
  console.log('1. Send automatic email (first time)');
  console.log('2. Try automatic email again (should be blocked)');
  console.log('3. Send manual email (should work with override)');
  console.log('4. Test different stage email\n');

  try {
    // Test 1: First automatic email
    console.log('🚀 Test 1: First automatic email');
    const test1 = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        stage: testStage,
        manual: false
      })
    });
    const result1 = await test1.json();
    console.log('Result:', result1.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', result1.message || result1.error);
    console.log('');

    // Test 2: Second automatic email (should be blocked)
    console.log('🚀 Test 2: Second automatic email (should be blocked)');
    const test2 = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        stage: testStage,
        manual: false
      })
    });
    const result2 = await test2.json();
    console.log('Result:', !result2.success ? '✅ CORRECTLY BLOCKED' : '❌ UNEXPECTED SUCCESS');
    console.log('Message:', result2.error || result2.message);
    console.log('');

    // Test 3: Manual email override (should work)
    console.log('🚀 Test 3: Manual email override (should work)');
    const test3 = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        stage: testStage,
        manual: true
      })
    });
    const result3 = await test3.json();
    console.log('Result:', result3.success ? '✅ SUCCESS (MANUAL OVERRIDE)' : '❌ FAILED');
    console.log('Message:', result3.message || result3.error);
    console.log('');

    // Test 4: Different stage email
    console.log('🚀 Test 4: Different stage email');
    const test4 = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        stage: 'called_twice',
        manual: false
      })
    });
    const result4 = await test4.json();
    console.log('Result:', result4.success ? '✅ SUCCESS (DIFFERENT STAGE)' : '❌ FAILED');
    console.log('Message:', result4.message || result4.error);
    console.log('');

    console.log('🎉 Test Summary:');
    console.log('- Automatic emails: Sent once per stage (prevents duplicates)');
    console.log('- Manual override: Allows resending emails for the same stage');
    console.log('- Different stages: Each stage can send its own email');
    console.log('- Email history: Tracks manual vs automatic sends');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.log('\n📝 Note: Make sure your development server is running on localhost:3000');
    console.log('📝 Update the sampleLeadId with a real lead ID from your database');
  }
}

// Usage instructions
console.log('📧 CRM Email System Test');
console.log('=======================\n');
console.log('This test demonstrates the email fix for QuasarLeads CRM\n');

console.log('📋 Fix Details:');
console.log('- Added manual=true parameter to override duplicate prevention');
console.log('- Manual email buttons in LeadDetails component');
console.log('- Email history tracking (manual vs automatic)');
console.log('- Different stages can send their respective emails\n');

console.log('⚠️  Prerequisites:');
console.log('1. Development server running (npm run dev)');
console.log('2. MongoDB connected with leads in database');
console.log('3. Gmail configuration set up (.env.local)');
console.log('4. Update sampleLeadId in this script with real lead ID\n');

if (process.argv.includes('--run')) {
  testEmailFunctionality();
} else {
  console.log('💡 To run the test, use: node scripts/test-email-fix.js --run');
} 