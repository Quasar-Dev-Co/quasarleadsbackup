const fetch = require('node-fetch');

async function testAuthSession() {
  try {
    console.log('🧪 Testing Authentication Session...');
    
    // Test 1: Check if we can get user data from the /api/auth/me endpoint
    console.log('\n🧪 Test 1: Checking /api/auth/me endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/auth/me');
      const data = await response.json();
      console.log('Response:', data);
      
      if (response.ok) {
        console.log('✅ User data retrieved successfully');
        console.log('User ID:', data.user?.id);
        console.log('Email:', data.user?.email);
        console.log('Username:', data.user?.username);
        console.log('Admin:', data.user?.admin);
        console.log('Verified:', data.user?.verified);
      } else {
        console.log('❌ Failed to get user data:', data.error);
      }
    } catch (error) {
      console.log('❌ Error getting user data:', error.message);
    }

    // Test 2: Try to login with your credentials
    console.log('\n🧪 Test 2: Testing login...');
    try {
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'info@quasarseo.nl',
          password: 'quasarseo1234'
        }),
      });

      const loginData = await loginResponse.json();
      console.log('Login Response:', loginData);
      
      if (loginResponse.ok) {
        console.log('✅ Login successful');
        console.log('User ID from login:', loginData.user?.id);
      } else {
        console.log('❌ Login failed:', loginData.error);
      }
    } catch (error) {
      console.log('❌ Error during login:', error.message);
    }

    // Test 3: Check if we can get user ID directly
    console.log('\n🧪 Test 3: Testing direct user ID retrieval...');
    try {
      // Try with a known user ID
      const userIdResponse = await fetch('http://localhost:3000/api/auth/me?userId=6894ec696cbf2dda14db1b96');
      const userIdData = await userIdResponse.json();
      console.log('User ID Response:', userIdData);
      
      if (userIdResponse.ok) {
        console.log('✅ User ID retrieval successful');
        console.log('User ID:', userIdData.user?.id);
      } else {
        console.log('❌ User ID retrieval failed:', userIdData.error);
      }
    } catch (error) {
      console.log('❌ Error getting user ID:', error.message);
    }

    // Test 4: Test the complete flow with a hardcoded user ID
    console.log('\n🧪 Test 4: Testing job creation with hardcoded user ID...');
    try {
      const jobResponse = await fetch('http://localhost:3000/api/jobs/queue-normal', {
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
          userId: '6894ec696cbf2dda14db1b96'
        }),
      });

      const jobData = await jobResponse.json();
      console.log('Job Creation Response:', jobData);
      
      if (jobResponse.ok) {
        console.log('✅ Job created successfully with hardcoded user ID');
        console.log('Job ID:', jobData.job?.jobId);
        console.log('User ID in job:', jobData.job?.userId);
      } else {
        console.log('❌ Job creation failed:', jobData.error);
      }
    } catch (error) {
      console.log('❌ Error creating job:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAuthSession(); 