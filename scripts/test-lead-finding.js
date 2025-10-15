#!/usr/bin/env node

/**
 * Lead Finding System Test Script
 * 
 * This script tests the complete lead finding workflow:
 * 1. Health check
 * 2. Queue test jobs (normal and high-value)
 * 3. Monitor progress
 * 4. Verify results
 * 
 * Usage: node scripts/test-lead-finding.js
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_SERVICE = 'web design';
const TEST_LOCATION = 'Miami FL';
const TEST_QUANTITY = 10;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
    }
    
    return data;
  } catch (err) {
    throw new Error(`Request to ${endpoint} failed: ${err.message}`);
  }
}

async function testHealthCheck() {
  log('\n🏥 Testing Health Check...', 'cyan');
  
  try {
    const health = await makeRequest('/api/cron/health');
    
    success('Health check passed');
    info(`Environment: ${health.environment}`);
    info(`Database: ${health.database}`);
    info(`Total jobs: ${health.jobStats.total}`);
    info(`Pending jobs: ${health.jobStats.pending}`);
    
    // Check environment variables
    const envVars = health.environmentVariables;
    const criticalVars = ['SERPAPI_KEY', 'MONGODB_URI'];
    const missingVars = criticalVars.filter(key => envVars[key] === '❌ Missing');
    
    if (missingVars.length > 0) {
      error(`Missing critical environment variables: ${missingVars.join(', ')}`);
      return false;
    }
    
    success('All critical environment variables are set');
    return true;
  } catch (err) {
    error(`Health check failed: ${err.message}`);
    return false;
  }
}

async function testNormalLeadCollection() {
  log('\n⚡ Testing Normal Lead Collection...', 'cyan');
  
  try {
    const jobData = await makeRequest('/api/jobs/queue-normal', {
      method: 'POST',
      body: JSON.stringify({
        services: TEST_SERVICE,
        locations: TEST_LOCATION,
        leadQuantity: TEST_QUANTITY
      })
    });
    
    success(`Normal job queued: ${jobData.job.jobId}`);
    info(`Services: ${jobData.job.services.join(', ')}`);
    info(`Locations: ${jobData.job.locations.join(', ')}`);
    info(`Quantity: ${jobData.job.leadQuantity}`);
    
    return jobData.job.jobId;
  } catch (err) {
    error(`Normal job queuing failed: ${err.message}`);
    return null;
  }
}

async function testHighValueLeadCollection() {
  log('\n💎 Testing High-Value Lead Collection...', 'cyan');
  
  try {
    const jobData = await makeRequest('/api/jobs/queue-high-value', {
      method: 'POST',
      body: JSON.stringify({
        services: TEST_SERVICE,
        locations: TEST_LOCATION,
        leadQuantity: TEST_QUANTITY
      })
    });
    
    success(`High-value job queued: ${jobData.job.jobId}`);
    info(`Services: ${jobData.job.services.join(', ')}`);
    info(`Locations: ${jobData.job.locations.join(', ')}`);
    info(`Quantity: ${jobData.job.leadQuantity}`);
    
    return jobData.job.jobId;
  } catch (err) {
    error(`High-value job queuing failed: ${err.message}`);
    return null;
  }
}

async function triggerJobProcessing() {
  log('\n🚀 Triggering Job Processing...', 'cyan');
  
  try {
    const result = await makeRequest('/api/cron/health?trigger=true');
    
    if (result.jobTriggerResult) {
      if (result.jobTriggerResult.success) {
        success(`Job processing triggered: ${result.jobTriggerResult.message}`);
      } else {
        warning(`Job trigger warning: ${result.jobTriggerResult.error}`);
      }
    } else {
      info('No jobs to trigger');
    }
    
    return true;
  } catch (err) {
    error(`Job triggering failed: ${err.message}`);
    return false;
  }
}

async function monitorJobProgress(jobIds, maxWaitTime = 300000) { // 5 minutes max
  log('\n📊 Monitoring Job Progress...', 'cyan');
  
  const startTime = Date.now();
  const checkInterval = 10000; // 10 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const health = await makeRequest('/api/cron/health');
      const pendingJobs = health.jobStats.pending;
      const runningJobs = health.jobStats.running;
      const completedJobs = health.jobStats.completed;
      
      info(`Jobs status - Pending: ${pendingJobs}, Running: ${runningJobs}, Completed: ${completedJobs}`);
      
      // Check recent jobs for our test jobs
      const recentJobs = health.recentJobs;
      const ourJobs = recentJobs.filter(job => jobIds.includes(job.jobId));
      
      let allCompleted = true;
      for (const job of ourJobs) {
        info(`Job ${job.jobId}: ${job.status} (${job.progress || 0}%) - ${job.message || 'No message'}`);
        if (job.status === 'pending' || job.status === 'running') {
          allCompleted = false;
        }
      }
      
      if (allCompleted && ourJobs.length === jobIds.length) {
        success('All test jobs completed!');
        return true;
      }
      
      await delay(checkInterval);
    } catch (err) {
      warning(`Error checking job progress: ${err.message}`);
      await delay(checkInterval);
    }
  }
  
  warning('Monitoring timed out - jobs may still be processing');
  return false;
}

async function verifyResults() {
  log('\n📋 Verifying Results...', 'cyan');
  
  try {
    const leads = await makeRequest('/api/leads?limit=20');
    
    success(`Found ${leads.leads.length} recent leads`);
    
    const normalLeads = leads.leads.filter(lead => !lead.isHighValue);
    const highValueLeads = leads.leads.filter(lead => lead.isHighValue);
    
    info(`Normal leads: ${normalLeads.length}`);
    info(`High-value leads: ${highValueLeads.length}`);
    
    // Show sample leads
    if (leads.leads.length > 0) {
      const sampleLead = leads.leads[0];
      info(`Sample lead: ${sampleLead.company} (${sampleLead.email})`);
      
      if (sampleLead.isHighValue) {
        info(`High-value features: Google Ads: ${sampleLead.googleAds ? 'Yes' : 'No'}`);
      }
    }
    
    return leads.leads.length > 0;
  } catch (err) {
    error(`Results verification failed: ${err.message}`);
    return false;
  }
}

async function runFullTest() {
  log('🧪 Starting Lead Finding System Test...', 'bright');
  log(`Testing against: ${BASE_URL}`, 'blue');
  
  // Step 1: Health check
  const healthPassed = await testHealthCheck();
  if (!healthPassed) {
    error('Health check failed - aborting test');
    process.exit(1);
  }
  
  // Step 2: Queue test jobs
  const normalJobId = await testNormalLeadCollection();
  const highValueJobId = await testHighValueLeadCollection();
  
  const jobIds = [normalJobId, highValueJobId].filter(Boolean);
  
  if (jobIds.length === 0) {
    error('No jobs were queued successfully - aborting test');
    process.exit(1);
  }
  
  // Step 3: Trigger processing
  await triggerJobProcessing();
  
  // Step 4: Monitor progress
  await delay(5000); // Wait 5 seconds before monitoring
  const progressCompleted = await monitorJobProgress(jobIds);
  
  // Step 5: Verify results
  const resultsFound = await verifyResults();
  
  // Final summary
  log('\n📈 Test Summary:', 'bright');
  success(`Health check: ${healthPassed ? 'PASSED' : 'FAILED'}`);
  success(`Jobs queued: ${jobIds.length}/2`);
  success(`Progress monitoring: ${progressCompleted ? 'COMPLETED' : 'TIMED OUT'}`);
  success(`Results found: ${resultsFound ? 'YES' : 'NO'}`);
  
  if (healthPassed && jobIds.length > 0 && resultsFound) {
    log('\n🎉 LEAD FINDING SYSTEM IS WORKING PERFECTLY!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some issues detected - check the output above', 'yellow');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--health-only')) {
  testHealthCheck().then(passed => {
    process.exit(passed ? 0 : 1);
  });
} else if (process.argv.includes('--trigger-only')) {
  triggerJobProcessing().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  runFullTest();
} 