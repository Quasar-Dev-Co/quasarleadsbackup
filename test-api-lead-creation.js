const fetch = require('node-fetch');

async function testLeadCreationAPI() {
  try {
    console.log('🧪 Testing Lead Creation API...');
    
    // Test data with timestamp to make emails unique
    const timestamp = Date.now();
    const testLead = {
      name: 'Test Lead API',
      company: 'Test Company API',
      email: `test-api-lead-${timestamp}@example.com`,
      location: 'Test Location',
      status: 'active',
      source: 'test'
    };

    // Test 1: Create lead without user ID (should fail)
    console.log('\n🧪 Test 1: Creating lead without user ID...');
    try {
      const response1 = await fetch('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testLead),
      });

      const data1 = await response1.json();
      console.log('Response:', data1);
      
      if (response1.status === 401) {
        console.log('✅ Correctly rejected without user ID');
      } else {
        console.log('❌ Should have been rejected without user ID');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 2: Create lead with user ID
    console.log('\n🧪 Test 2: Creating lead with user ID...');
    try {
      const response2 = await fetch('http://localhost:3000/api/leads?userId=6894ec696cbf2dda14db1b96', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testLead),
      });

      const data2 = await response2.json();
      console.log('Response:', data2);
      
      if (response2.ok) {
        console.log('✅ Lead created successfully');
        console.log('Lead ID:', data2.lead?._id);
        console.log('Assigned To:', data2.lead?.assignedTo);
        console.log('Created By:', data2.lead?.leadsCreatedBy);
      } else {
        console.log('❌ Failed to create lead:', data2.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 3: Check CRM leads API
    console.log('\n🧪 Test 3: Testing CRM leads API...');
    try {
      const response3 = await fetch('http://localhost:3000/api/crm/leads?userId=6894ec696cbf2dda14db1b96', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testLead,
          email: `test-crm-lead-${timestamp}@example.com`
        }),
      });

      const data3 = await response3.json();
      console.log('CRM Response:', data3);
      
      if (response3.ok) {
        console.log('✅ CRM lead created successfully');
        console.log('Lead ID:', data3.lead?._id);
        console.log('Assigned To:', data3.lead?.assignedTo);
        console.log('Created By:', data3.lead?.leadsCreatedBy);
      } else {
        console.log('❌ Failed to create CRM lead:', data3.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLeadCreationAPI(); 