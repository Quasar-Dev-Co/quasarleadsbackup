const fetch = require('node-fetch');

async function testAuthFix() {
  try {
    console.log('🧪 Testing Auth Fix...');
    
    // Test 1: Test the complete flow from the leads page
    console.log('\n🧪 Test 1: Testing complete flow from leads page...');
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
      console.log('Response:', data);
      
      if (response.ok) {
        console.log('✅ Job created successfully');
        console.log('Job ID:', data.job?.jobId);
        console.log('User ID in job:', data.job?.userId);
        
        // Test 2: Process the job
        console.log('\n🧪 Test 2: Processing the job...');
        const processResponse = await fetch('http://localhost:3000/api/jobs/process-local', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            jobId: data.job.jobId 
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
        
        // Test 3: Check if leads were created with user ID
        console.log('\n🧪 Test 3: Checking created leads...');
        const leadsResponse = await fetch('http://localhost:3000/api/leads');
        const leadsData = await leadsResponse.json();
        
        if (leadsResponse.ok) {
          const recentLeads = leadsData.leads?.slice(-5) || [];
          console.log('\n📊 Recent leads:');
          recentLeads.forEach((lead, index) => {
            console.log(`${index + 1}. ${lead.name} (${lead.company})`);
            console.log(`   Assigned to: ${lead.assignedTo || 'Not assigned'}`);
            console.log(`   Created by: ${lead.leadsCreatedBy || 'Not specified'}`);
          });
          
          const userLeads = recentLeads.filter(lead => 
            lead.assignedTo === '6894ec696cbf2dda14db1b96' || 
            lead.leadsCreatedBy === '6894ec696cbf2dda14db1b96'
          );
          
          console.log(`\n📈 Leads with user ID: ${userLeads.length}/${recentLeads.length}`);
          
          if (userLeads.length > 0) {
            console.log('🎉 SUCCESS: The user ID flow is working correctly!');
            console.log('\n🎯 User ID leads found:');
            userLeads.forEach((lead, index) => {
              console.log(`${index + 1}. ${lead.name} (${lead.company})`);
              console.log(`   Assigned to: ${lead.assignedTo}`);
              console.log(`   Created by: ${lead.leadsCreatedBy}`);
            });
          } else {
            console.log('❌ No leads found with user ID');
          }
        }
        
      } else {
        console.log('❌ Failed to create job:', data.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAuthFix(); 