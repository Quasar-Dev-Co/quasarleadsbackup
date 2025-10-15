const { MongoClient } = require('mongodb');

// Test both possible database URIs
const URIS = [
  'mongodb://127.0.0.1:27017/quasarleads',
  'mongodb://localhost:27017/quasarleads',
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quasarleads'
];

async function testDatabaseConnections() {
  for (const uri of URIS) {
    console.log(`\n🔍 Testing URI: ${uri}`);
    
    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      console.log('✅ Connected successfully');
      
      const db = client.db();
      console.log(`📊 Database name: ${db.databaseName}`);
      
      const collections = await db.listCollections().toArray();
      console.log(`📁 Collections: ${collections.map(c => c.name).join(', ')}`);
      
      if (collections.some(c => c.name === 'leads')) {
        const leadsCollection = db.collection('leads');
        const totalLeads = await leadsCollection.countDocuments();
        const googleAdsLeads = await leadsCollection.countDocuments({ googleAds: true });
        const highValueLeads = await leadsCollection.countDocuments({ isHighValue: true });
        
        console.log(`📈 Leads stats:`);
        console.log(`   Total leads: ${totalLeads}`);
        console.log(`   Google Ads leads: ${googleAdsLeads}`);
        console.log(`   High-value leads: ${highValueLeads}`);
      } else {
        console.log('❌ No leads collection found');
      }
      
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
    } finally {
      await client.close();
    }
  }
}

// Run the script
testDatabaseConnections(); 