const fetch = require('node-fetch');

async function checkJobViaAPI() {
  try {
    console.log('🧪 Checking job details via API...');
    
    // Get recent jobs
    console.log('\n🧪 Getting recent jobs...');
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue-normal');
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Found jobs:');
        data.jobs?.slice(0, 3).forEach((job, index) => {
          console.log(`\n${index + 1}. Job ID: ${job.jobId}`);
          console.log(`   Type: ${job.type}`);
          console.log(`   Status: ${job.status}`);
          console.log(`   Services: ${job.services?.join(', ')}`);
          console.log(`   Locations: ${job.locations?.join(', ')}`);
          console.log(`   Lead Quantity: ${job.leadQuantity}`);
          console.log(`   User ID: ${job.userId || 'NOT SET'}`);
          console.log(`   Created: ${job.createdAt}`);
        });
        
        // Check for jobs with user ID
        const jobsWithUserId = data.jobs?.filter(job => job.userId) || [];
        console.log(`\n📈 Jobs with user ID: ${jobsWithUserId.length}/${data.jobs?.length || 0}`);
        
        if (jobsWithUserId.length > 0) {
          console.log('✅ SUCCESS: Some jobs have user ID!');
        } else {
          console.log('❌ No jobs found with user ID');
        }
      } else {
        console.log('❌ Failed to get jobs:', data.error);
      }
    } catch (error) {
      console.log('❌ Error getting jobs:', error.message);
    }

    // Get all jobs from queue
    console.log('\n🧪 Getting all jobs from queue...');
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue');
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Found jobs in queue:');
        data.jobs?.slice(0, 3).forEach((job, index) => {
          console.log(`\n${index + 1}. Job ID: ${job.jobId}`);
          console.log(`   Type: ${job.type}`);
          console.log(`   Status: ${job.status}`);
          console.log(`   Services: ${job.services?.join(', ')}`);
          console.log(`   Locations: ${job.locations?.join(', ')}`);
          console.log(`   Lead Quantity: ${job.leadQuantity}`);
          console.log(`   User ID: ${job.userId || 'NOT SET'}`);
          console.log(`   Created: ${job.createdAt}`);
        });
        
        // Check for jobs with user ID
        const jobsWithUserId = data.jobs?.filter(job => job.userId) || [];
        console.log(`\n📈 Jobs with user ID: ${jobsWithUserId.length}/${data.jobs?.length || 0}`);
        
        if (jobsWithUserId.length > 0) {
          console.log('✅ SUCCESS: Some jobs have user ID!');
        } else {
          console.log('❌ No jobs found with user ID');
        }
      } else {
        console.log('❌ Failed to get jobs from queue:', data.error);
      }
    } catch (error) {
      console.log('❌ Error getting jobs from queue:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
checkJobViaAPI(); 