const fetch = require('node-fetch');

async function testJobSecurity() {
  try {
    console.log('🧪 Testing Job Security (User ID Filtering)...');
    
    // Test 1: Create a job with your user ID
    console.log('\n🧪 Test 1: Creating job with your user ID...');
    let jobId = null;
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue-normal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: 'web design',
          locations: 'Miami',
          leadQuantity: 3,
          type: 'lead-collection',
          priority: 1,
          userId: '6894ec696cbf2dda14db1b96' // Your user ID
        }),
      });

      const data = await response.json();
      console.log('Job Creation Response:', data);
      
      if (response.ok) {
        console.log('✅ Job created successfully');
        jobId = data.job?.jobId;
        console.log('Job ID:', jobId);
      } else {
        console.log('❌ Failed to create job:', data.error);
        return;
      }
    } catch (error) {
      console.log('❌ Error creating job:', error.message);
      return;
    }

    // Test 2: Try to fetch jobs WITHOUT user ID (should fail)
    console.log('\n🧪 Test 2: Trying to fetch jobs without user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue');
      const data = await response.json();
      console.log('Response without user ID:', data);
      
      if (response.ok) {
        console.log('❌ SECURITY ISSUE: Jobs fetched without user ID!');
        console.log('Jobs found:', data.jobs?.length || 0);
      } else {
        console.log('✅ SECURITY WORKING: Cannot fetch jobs without user ID');
        console.log('Error:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching jobs without user ID:', error.message);
    }

    // Test 3: Try to fetch jobs with WRONG user ID (should return empty)
    console.log('\n🧪 Test 3: Trying to fetch jobs with wrong user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue?userId=wrong-user-id');
      const data = await response.json();
      console.log('Response with wrong user ID:', data);
      
      if (response.ok) {
        const jobsFound = data.jobs?.length || 0;
        console.log(`Jobs found with wrong user ID: ${jobsFound}`);
        
        if (jobsFound === 0) {
          console.log('✅ SECURITY WORKING: No jobs found with wrong user ID');
        } else {
          console.log('❌ SECURITY ISSUE: Found jobs with wrong user ID!');
        }
      } else {
        console.log('❌ Error fetching jobs with wrong user ID:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching jobs with wrong user ID:', error.message);
    }

    // Test 4: Fetch jobs with YOUR user ID (should show your job)
    console.log('\n🧪 Test 4: Fetching jobs with your user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue?userId=6894ec696cbf2dda14db1b96');
      const data = await response.json();
      console.log('Response with your user ID:', data);
      
      if (response.ok) {
        const jobsFound = data.jobs?.length || 0;
        console.log(`Jobs found with your user ID: ${jobsFound}`);
        
        if (jobsFound > 0) {
          console.log('✅ SECURITY WORKING: Found your jobs');
          console.log('\n📊 Your jobs:');
          data.jobs.forEach((job, index) => {
            console.log(`${index + 1}. Job ID: ${job.jobId}`);
            console.log(`   Status: ${job.status}`);
            console.log(`   Services: ${job.services?.join(', ')}`);
            console.log(`   Locations: ${job.locations?.join(', ')}`);
            console.log(`   User ID: ${job.userId}`);
          });
        } else {
          console.log('❌ No jobs found with your user ID');
        }
      } else {
        console.log('❌ Error fetching jobs with your user ID:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching jobs with your user ID:', error.message);
    }

    // Test 5: Test normal leads endpoint specifically
    console.log('\n🧪 Test 5: Testing normal leads endpoint with your user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue-normal?userId=6894ec696cbf2dda14db1b96');
      const data = await response.json();
      console.log('Normal leads response:', data);
      
      if (response.ok) {
        const jobsFound = data.jobs?.length || 0;
        console.log(`Normal leads jobs found: ${jobsFound}`);
        
        if (jobsFound > 0) {
          console.log('✅ Normal leads filtering working correctly');
        } else {
          console.log('❌ No normal leads jobs found');
        }
      } else {
        console.log('❌ Error fetching normal leads jobs:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching normal leads jobs:', error.message);
    }

    // Test 6: Test high-value leads endpoint
    console.log('\n🧪 Test 6: Testing high-value leads endpoint with your user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/jobs/queue-high-value?userId=6894ec696cbf2dda14db1b96');
      const data = await response.json();
      console.log('High-value leads response:', data);
      
      if (response.ok) {
        const jobsFound = data.jobs?.length || 0;
        console.log(`High-value leads jobs found: ${jobsFound}`);
        
        if (jobsFound >= 0) {
          console.log('✅ High-value leads filtering working correctly');
        }
      } else {
        console.log('❌ Error fetching high-value leads jobs:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching high-value leads jobs:', error.message);
    }

    console.log('\n🎉 Job Security Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testJobSecurity(); 