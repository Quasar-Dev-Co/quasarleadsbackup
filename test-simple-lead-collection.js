const fetch = require('node-fetch');

async function testSimpleLeadCollection() {
  try {
    console.log('🧪 Testing Simple Lead Collection...');
    
    // Test the findleads-normal API directly
    console.log('\n🧪 Testing findleads-normal API...');
    try {
      const response = await fetch('http://localhost:3000/api/findleads-normal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: 'web design',
          locations: 'Miami',
          leadQuantity: 5
        }),
      });

      const data = await response.json();
      console.log('Response:', data);
      
      if (response.ok) {
        console.log('✅ Lead collection successful');
        console.log('Total leads found:', data.leads?.length || 0);
        console.log('Leads saved:', data.stats?.savedLeads || 0);
        
        if (data.leads && data.leads.length > 0) {
          console.log('\n📊 Sample leads:');
          data.leads.slice(0, 3).forEach((lead, index) => {
            console.log(`${index + 1}. ${lead.name} (${lead.company})`);
            console.log(`   Email: ${lead.email}`);
            console.log(`   Phone: ${lead.phone}`);
            console.log(`   Website: ${lead.website}`);
          });
        }
      } else {
        console.log('❌ Failed to collect leads:', data.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimpleLeadCollection(); 