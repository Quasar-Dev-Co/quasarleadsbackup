#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

async function checkTimingSettings() {
  try {
    console.log('📋 Checking Your Email Timing Settings...');
    console.log('================================================');
    
    const response = await fetch(`${BASE_URL}/api/company-settings`);
    const data = await response.json();
    
    if (data.success && data.settings?.emailTimings) {
      console.log('✅ Found your timing configuration:');
      console.log('');
      
      data.settings.emailTimings.forEach((timing, i) => {
        console.log(`${i+1}. Stage: ${timing.stage || 'N/A'}`);
        console.log(`   Delay: ${timing.delay} ${timing.unit}`);
        console.log(`   Description: ${timing.description}`);
        console.log('');
      });
      
      console.log('🎯 The email automation should use THESE timings, not hardcoded values!');
      
    } else {
      console.log('❌ No timing settings found');
      console.log('You may need to configure email timings in your settings');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

checkTimingSettings(); 