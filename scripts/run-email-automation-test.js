#!/usr/bin/env node

/**
 * Test script to continuously run email automation for 5-minute intervals
 * This script runs the dev email automation endpoint every minute
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function runEmailAutomation() {
  try {
    console.log(`🔄 Running email automation at ${new Date().toLocaleTimeString()}...`);
    
    const response = await fetch(`${BASE_URL}/api/dev-email-automation`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (data.success) {
      const { totalLeads, emailsSent, errors } = data.results;
      console.log(`✅ Success: ${emailsSent} emails sent, ${errors} errors, ${totalLeads} leads processed`);
      
      if (data.results.details && data.results.details.length > 0) {
        console.log('📧 Email Details:');
        data.results.details.forEach((detail, index) => {
          console.log(`  ${index + 1}. ${detail.leadName} - ${detail.success ? '✅' : '❌'} - Step ${detail.step}/7`);
          if (detail.nextEmailDate) {
            console.log(`     Next email: ${new Date(detail.nextEmailDate).toLocaleString()}`);
          }
        });
      }
    } else {
      console.log(`❌ Error: ${data.error}`);
    }
    
  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

async function startContinuousAutomation() {
  console.log('🚀 Starting continuous email automation for testing...');
  console.log('📅 This will run every 60 seconds to process 5-minute email intervals');
  console.log('⏹️  Press Ctrl+C to stop\n');
  
  // Run immediately
  await runEmailAutomation();
  
  // Then run every minute
  setInterval(async () => {
    await runEmailAutomation();
  }, 60000); // Run every 60 seconds
}

// Start the automation
startContinuousAutomation().catch(console.error); 