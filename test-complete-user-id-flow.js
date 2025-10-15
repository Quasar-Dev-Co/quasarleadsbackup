const fetch = require('node-fetch');

async function testCompleteUserIdFlow() {
  try {
    console.log('🧪 Testing Complete User ID Flow...');
    
    // Test 1: Create a job with user ID
    console.log('\n🧪 Test 1: Creating job with user ID...');
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
          leadQuantity: 5,
          type: 'lead-collection',
          priority: 1,
          userId: '6894ec696cbf2dda14db1b96'
        }),
      });

      const data = await response.json();
      console.log('Response:', data);
      
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

    // Test 2: Process the job locally
    console.log('\n🧪 Test 2: Processing job locally...');
    try {
      const processResponse = await fetch('http://localhost:3000/api/jobs/process-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobId: jobId 
        }),
      });

      const processData = await processResponse.json();
      console.log('Process Response:', processData);
      
      if (processResponse.ok) {
        console.log('✅ Job processed successfully');
        console.log('Total Leads Collected:', processData.totalLeadsCollected);
      } else {
        console.log('❌ Failed to process job:', processData.error);
      }
    } catch (error) {
      console.log('❌ Error processing job:', error.message);
    }

    // Test 3: Check if leads were created with user ID
    console.log('\n🧪 Test 3: Checking created leads...');
    try {
      const leadsResponse = await fetch('http://localhost:3000/api/leads');
      const leadsData = await leadsResponse.json();
      
      if (leadsResponse.ok) {
        const recentLeads = leadsData.leads?.slice(-10) || [];
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
          console.log('\n🎯 User ID leads found:');
          userLeads.forEach((lead, index) => {
            console.log(`${index + 1}. ${lead.name} (${lead.company})`);
            console.log(`   Assigned to: ${lead.assignedTo}`);
            console.log(`   Created by: ${lead.leadsCreatedBy}`);
          });
        } else {
          console.log('❌ No leads found with user ID');
        }
      } else {
        console.log('❌ Failed to fetch leads:', leadsData.error);
      }
    } catch (error) {
      console.log('❌ Error fetching leads:', error.message);
    }

    // Test 4: Test direct findleads-normal API with user ID
    console.log('\n🧪 Test 4: Testing findleads-normal API directly with user ID...');
    try {
      const findleadsResponse = await fetch('http://localhost:3000/api/findleads-normal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: 'web design',
          locations: 'Miami',
          leadQuantity: 3,
          userId: '6894ec696cbf2dda14db1b96'
        }),
      });

      const findleadsData = await findleadsResponse.json();
      console.log('Findleads Response:', findleadsData);
      
      if (findleadsResponse.ok) {
        console.log('✅ Findleads API successful');
        console.log('Total leads found:', findleadsData.leads?.length || 0);
        console.log('Leads saved:', findleadsData.stats?.savedLeads || 0);
      } else {
        console.log('❌ Failed to call findleads API:', findleadsData.error);
      }
    } catch (error) {
      console.log('❌ Error calling findleads API:', error.message);
    }

    // Test 5: Final check of leads
    console.log('\n🧪 Test 5: Final check of leads...');
    try {
      const finalLeadsResponse = await fetch('http://localhost:3000/api/leads');
      const finalLeadsData = await finalLeadsResponse.json();
      
      if (finalLeadsResponse.ok) {
        const finalLeads = finalLeadsData.leads?.slice(-5) || [];
        console.log('\n📊 Final recent leads:');
        finalLeads.forEach((lead, index) => {
          console.log(`${index + 1}. ${lead.name} (${lead.company})`);
          console.log(`   Assigned to: ${lead.assignedTo || 'Not assigned'}`);
          console.log(`   Created by: ${lead.leadsCreatedBy || 'Not specified'}`);
        });
        
        const finalUserLeads = finalLeads.filter(lead => 
          lead.assignedTo === '6894ec696cbf2dda14db1b96' || 
          lead.leadsCreatedBy === '6894ec696cbf2dda14db1b96'
        );
        
        console.log(`\n📈 Final leads with user ID: ${finalUserLeads.length}/${finalLeads.length}`);
        
        if (finalUserLeads.length > 0) {
          console.log('🎉 SUCCESS: The user ID flow is working correctly!');
        } else {
          console.log('❌ Still no leads with user ID - there may be an issue');
        }
      }
    } catch (error) {
      console.log('❌ Error in final check:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompleteUserIdFlow(); 