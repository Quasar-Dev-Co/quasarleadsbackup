const fetch = require('node-fetch');

async function testLeadCollectionWithUserId() {
  try {
    console.log('🧪 Testing Lead Collection with User ID...');
    
    // Test 1: Create a job without user ID (should fail)
    console.log('\n🧪 Test 1: Creating job without user ID...');
    try {
      const response1 = await fetch('http://localhost:3000/api/jobs/queue-normal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: 'web design',
          locations: 'Miami',
          leadQuantity: 5,
          type: 'lead-collection',
          priority: 1
        }),
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

    // Test 2: Create a job with user ID
    console.log('\n🧪 Test 2: Creating job with user ID...');
    try {
      const response2 = await fetch('http://localhost:3000/api/jobs/queue-normal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: 'web design',
          locations: 'Miami',
          leadQuantity: 5,
          type: 'lead-collection',
          priority: 1,
          userId: '6894ec696cbf2dda14db1b96'
        }),
      });

      const data2 = await response2.json();
      console.log('Response:', data2);
      
      if (response2.ok) {
        console.log('✅ Job created successfully');
        console.log('Job ID:', data2.job?.jobId);
        console.log('Job Type:', data2.job?.type);
        console.log('Services:', data2.job?.services);
        console.log('Locations:', data2.job?.locations);
        console.log('Lead Quantity:', data2.job?.leadQuantity);
        
        // Test 3: Process the job locally
        console.log('\n🧪 Test 3: Processing job locally...');
        try {
          const processResponse = await fetch('http://localhost:3000/api/jobs/process-local', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              jobId: data2.job.jobId 
            }),
          });

          const processData = await processResponse.json();
          console.log('Process Response:', processData);
          
          if (processResponse.ok) {
            console.log('✅ Job processed successfully');
            console.log('Total Leads Collected:', processData.totalLeadsCollected);
            console.log('Job Status:', processData.status);
          } else {
            console.log('❌ Failed to process job:', processData.error);
          }
        } catch (error) {
          console.log('❌ Error processing job:', error.message);
        }
        
      } else {
        console.log('❌ Failed to create job:', data2.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 4: Check if leads were created with user ID
    console.log('\n🧪 Test 4: Checking created leads...');
    try {
      const leadsResponse = await fetch('http://localhost:3000/api/leads');
      const leadsData = await leadsResponse.json();
      
      if (leadsResponse.ok) {
        const recentLeads = leadsData.leads?.slice(-5) || [];
        console.log('\n📊 Recent leads:');
        recentLeads.forEach((lead, index) => {
          console.log(`${index + 1}. ${lead.name} (${lead.company})`);
          console.log(`   Assigned to: ${lead.assignedTo || 'Not assigned'}`);
          console.log(`   Created by: ${lead.leadsCreatedBy || 'Not specified'}`);
          console.log(`   Source: ${lead.source}`);
          console.log(`   Created: ${lead.createdAt}`);
        });
        
        // Check for leads with user ID
        const userLeads = recentLeads.filter(lead => 
          lead.assignedTo === '6894ec696cbf2dda14db1b96' || 
          lead.leadsCreatedBy === '6894ec696cbf2dda14db1b96'
        );
        
        console.log(`\n📈 Leads with user ID: ${userLeads.length}/${recentLeads.length}`);
        
        if (userLeads.length > 0) {
          console.log('✅ SUCCESS: Some leads have the correct user ID!');
        } else {
          console.log('⚠️ No leads found with user ID - may need to wait for job processing');
        }
      } else {
        console.log('❌ Failed to fetch leads:', leadsData.error);
      }
    } catch (error) {
      console.log('❌ Error fetching leads:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLeadCollectionWithUserId(); 