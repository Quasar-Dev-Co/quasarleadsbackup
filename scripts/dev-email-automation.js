#!/usr/bin/env node

/**
 * Development Email Automation Runner
 * 
 * This script runs email automation every minute for development/testing purposes.
 * Use this when you want to test minute-by-minute email sending.
 * 
 * Usage:
 *   node scripts/dev-email-automation.js
 * 
 * Note: Make sure your Next.js development server is running on http://localhost:3000
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function runEmailAutomation() {
  try {
    console.log(`🚀 [${new Date().toISOString()}] Running development email automation...`);
    
    const response = await fetch(`${BASE_URL}/api/dev-email-automation`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (data.success) {
      const results = data.results;
      console.log(`✅ [${new Date().toISOString()}] Email automation completed:`);
      console.log(`   📧 Emails sent: ${results.emailsSent}`);
      console.log(`   ❌ Errors: ${results.errors}`);
      console.log(`   ⏭️ Skipped: ${results.skipped}`);
      console.log(`   📊 Total leads: ${results.totalLeads}`);
      
      if (results.emailsSent > 0) {
        console.log(`🎉 SUCCESS: ${results.emailsSent} emails sent successfully!`);
      } else if (results.totalLeads === 0) {
        console.log(`😴 No emails to send at this time.`);
      }
    } else {
      console.error(`❌ [${new Date().toISOString()}] Email automation failed:`, data.error);
    }
  } catch (error) {
    console.error(`💥 [${new Date().toISOString()}] Error running email automation:`, error.message);
  }
}

async function startDevEmailAutomation() {
  console.log('🔥 Starting development email automation runner...');
  console.log('📧 This will check for and send emails every 60 seconds');
  console.log('🛑 Press Ctrl+C to stop');
  console.log('');
  
  // Run immediately
  await runEmailAutomation();
  
  // Then run every minute
  const interval = setInterval(async () => {
    await runEmailAutomation();
  }, 60000); // 60 seconds = 1 minute
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development email automation...');
    clearInterval(interval);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development email automation...');
    clearInterval(interval);
    process.exit(0);
  });
}

// Check if this script is being run directly
if (require.main === module) {
  startDevEmailAutomation().catch(error => {
    console.error('💥 Failed to start development email automation:', error);
    process.exit(1);
  });
}

module.exports = { runEmailAutomation, startDevEmailAutomation }; 