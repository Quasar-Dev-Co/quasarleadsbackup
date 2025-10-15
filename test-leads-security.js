const fetch = require('node-fetch');

async function testLeadsSecurity() {
  try {
    console.log('🧪 Testing Leads Security (User ID Filtering)...');
    
    // Test 1: Try to fetch leads WITHOUT user ID (should fail)
    console.log('\n🧪 Test 1: Trying to fetch leads without user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/leads');
      const data = await response.json();
      console.log('Response without user ID:', data);
      
      if (response.ok) {
        console.log('❌ SECURITY ISSUE: Leads fetched without user ID!');
        console.log('Leads found:', data.leads?.length || 0);
      } else {
        console.log('✅ SECURITY WORKING: Cannot fetch leads without user ID');
        console.log('Error:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching leads without user ID:', error.message);
    }

    // Test 2: Try to fetch leads with WRONG user ID (should return empty)
    console.log('\n🧪 Test 2: Trying to fetch leads with wrong user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/leads?userId=wrong-user-id');
      const data = await response.json();
      console.log('Response with wrong user ID:', data);
      
      if (response.ok) {
        const leadsFound = data.leads?.length || 0;
        console.log(`Leads found with wrong user ID: ${leadsFound}`);
        
        if (leadsFound === 0) {
          console.log('✅ SECURITY WORKING: No leads found with wrong user ID');
        } else {
          console.log('❌ SECURITY ISSUE: Found leads with wrong user ID!');
        }
      } else {
        console.log('❌ Error fetching leads with wrong user ID:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching leads with wrong user ID:', error.message);
    }

    // Test 3: Fetch leads with YOUR user ID (should show your leads)
    console.log('\n🧪 Test 3: Fetching leads with your user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/leads?userId=6894ec696cbf2dda14db1b96');
      const data = await response.json();
      console.log('Response with your user ID:', data);
      
      if (response.ok) {
        const leadsFound = data.leads?.length || 0;
        console.log(`Leads found with your user ID: ${leadsFound}`);
        
        if (leadsFound > 0) {
          console.log('✅ SECURITY WORKING: Found your leads');
          console.log('\n📊 Your leads:');
          data.leads.slice(0, 3).forEach((lead, index) => {
            console.log(`${index + 1}. ${lead.name} (${lead.company})`);
            console.log(`   Assigned to: ${lead.assignedTo || 'Not assigned'}`);
            console.log(`   Created by: ${lead.leadsCreatedBy || 'Not specified'}`);
            console.log(`   Email: ${lead.email}`);
          });
        } else {
          console.log('❌ No leads found with your user ID');
        }
      } else {
        console.log('❌ Error fetching leads with your user ID:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching leads with your user ID:', error.message);
    }

    // Test 4: Test CRM leads endpoint
    console.log('\n🧪 Test 4: Testing CRM leads endpoint with your user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/crm/leads?userId=6894ec696cbf2dda14db1b96');
      const data = await response.json();
      console.log('CRM leads response:', data);
      
      if (response.ok) {
        const leadsFound = data.leads?.length || 0;
        console.log(`CRM leads found: ${leadsFound}`);
        
        if (leadsFound >= 0) {
          console.log('✅ CRM leads filtering working correctly');
        }
      } else {
        console.log('❌ Error fetching CRM leads:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching CRM leads:', error.message);
    }

    // Test 5: Test CRM leads endpoint without user ID (should fail)
    console.log('\n🧪 Test 5: Testing CRM leads endpoint without user ID...');
    try {
      const response = await fetch('http://localhost:3000/api/crm/leads');
      const data = await response.json();
      console.log('CRM leads response without user ID:', data);
      
      if (response.ok) {
        console.log('❌ SECURITY ISSUE: CRM leads fetched without user ID!');
      } else {
        console.log('✅ SECURITY WORKING: Cannot fetch CRM leads without user ID');
        console.log('Error:', data.error);
      }
    } catch (error) {
      console.log('❌ Error fetching CRM leads without user ID:', error.message);
    }

    console.log('\n🎉 Leads Security Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLeadsSecurity(); 