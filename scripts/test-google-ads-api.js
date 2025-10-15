const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quasarleads';

async function testGoogleAdsAPI() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const leadsCollection = db.collection('leads');
    
    // Test the same aggregation pipeline as the API
    const stats = await leadsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          checkedLeads: { 
            $sum: { $cond: [
              { $or: [
                { $eq: ["$googleAdsChecked", true] },
                { $eq: ["$isHighValue", true] }
              ] }, 
              1, 
              0
            ] }
          },
          googleAdsLeads: { 
            $sum: { $cond: [
              { $or: [
                { $eq: ["$googleAds", true] },
                { $eq: ["$isHighValue", true] }
              ] }, 
              1, 
              0
            ] }
          },
          highValueLeads: {
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ["$isHighValue", true] },
                    { 
                      $and: [
                        { $eq: ["$googleAds", true] },
                        { 
                          $or: [
                            { $gt: ["$organicRanking", 10] },
                            { $eq: ["$organicRanking", null] }
                          ]
                        }
                      ]
                    }
                  ]
                }, 
                1, 
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      totalLeads: 0,
      checkedLeads: 0,
      googleAdsLeads: 0,
      highValueLeads: 0
    };
    
    console.log('📊 Aggregation result:', result);
    
    // Also check individual counts
    const totalLeads = await leadsCollection.countDocuments();
    const googleAdsLeads = await leadsCollection.countDocuments({ googleAds: true });
    const highValueLeads = await leadsCollection.countDocuments({ isHighValue: true });
    const checkedLeads = await leadsCollection.countDocuments({ googleAdsChecked: true });
    
    console.log('📈 Individual counts:');
    console.log(`   Total leads: ${totalLeads}`);
    console.log(`   Google Ads leads: ${googleAdsLeads}`);
    console.log(`   High-value leads: ${highValueLeads}`);
    console.log(`   Checked leads: ${checkedLeads}`);
    
    // Check a few sample leads
    const sampleLeads = await leadsCollection.find({}).limit(3).toArray();
    console.log('\n📋 Sample leads:');
    sampleLeads.forEach((lead, index) => {
      console.log(`Lead ${index + 1}:`);
      console.log(`  Name: ${lead.name}`);
      console.log(`  Google Ads: ${lead.googleAds}`);
      console.log(`  High Value: ${lead.isHighValue}`);
      console.log(`  Checked: ${lead.googleAdsChecked}`);
      console.log(`  Organic Ranking: ${lead.organicRanking}`);
    });
    
  } catch (error) {
    console.error('Error testing Google Ads API:', error);
  } finally {
    await client.close();
  }
}

// Run the script
testGoogleAdsAPI(); 