const fetch = require('node-fetch');

async function testGoogleAdsSecurity() {
  try {
    console.log('🧪 Testing Google Ads Intelligence Security (User ID Filtering)...');
    
    // Test 1: Try to fetch Google Ads stats WITHOUT user ID (should fail)
    console.log('\n🧪 Test 1: Trying to fetch Google Ads stats without user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/check-google-ads');
      const data = await response.json();
      console.log('Response without user ID:', data);
      
      if (response.ok) {
        console.log('❌ SECURITY ISSUE: Google Ads stats fetched without user ID!');
        console.log('Total leads found:', data.stats?.totalLeads || 0);
      } else {
        console.log('✅ SECURITY WORKING: Cannot fetch Google Ads stats without user ID');
        console.log('Error:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching Google Ads stats without user ID:', error.message);
    }

    // Test 2: Try to fetch Google Ads stats with WRONG user ID (should return empty)
    console.log('\n🧪 Test 2: Trying to fetch Google Ads stats with wrong user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/check-google-ads?userId=wrong-user-id');
      const data = await response.json();
      console.log('Response with wrong user ID:', data);
      
      if (response.ok) {
        const totalLeads = data.stats?.totalLeads || 0;
        console.log(`Total leads found with wrong user ID: ${totalLeads}`);
        
        if (totalLeads === 0) {
          console.log('✅ SECURITY WORKING: No leads found with wrong user ID');
        } else {
          console.log('❌ SECURITY ISSUE: Found leads with wrong user ID!');
        }
      } else {
        console.log('❌ Error fetching Google Ads stats with wrong user ID:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching Google Ads stats with wrong user ID:', error.message);
    }

    // Test 3: Fetch Google Ads stats with YOUR user ID (should show your leads)
    console.log('\n🧪 Test 3: Fetching Google Ads stats with your user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/check-google-ads?userId=6894ec696cbf2dda14db1b96');
      const data = await response.json();
      console.log('Response with your user ID:', data);
      
      if (response.ok) {
        const stats = data.stats;
        console.log('📊 Your Google Ads Intelligence Stats:');
        console.log(`   Total Leads: ${stats?.totalLeads || 0}`);
        console.log(`   Running Ads: ${stats?.googleAdsLeads || 0}`);
        console.log(`   High-Value: ${stats?.highValueLeads || 0}`);
        console.log(`   Conversion Rate: ${stats?.conversionRate || 0}%`);
        console.log(`   Checked Leads: ${stats?.checkedLeads || 0}`);
        console.log(`   Unchecked Leads: ${stats?.uncheckedLeads || 0}`);
        
        if (stats?.totalLeads > 0) {
          console.log('✅ SECURITY WORKING: Found your leads in Google Ads Intelligence');
        } else {
          console.log('❌ No leads found with your user ID in Google Ads Intelligence');
        }
      } else {
        console.log('❌ Error fetching Google Ads stats with your user ID:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching Google Ads stats with your user ID:', error.message);
    }

    console.log('\n🎉 Google Ads Intelligence Security Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGoogleAdsSecurity();

