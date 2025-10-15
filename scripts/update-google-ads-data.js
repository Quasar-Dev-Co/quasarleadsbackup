const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quasarleads';

async function updateGoogleAdsData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const leadsCollection = db.collection('leads');
    
    // Update some leads with Google Ads data
    const updateResult = await leadsCollection.updateMany(
      { 
        // Update leads that have email history (active campaigns)
        emailHistory: { $exists: true, $ne: [] }
      },
      {
        $set: {
          googleAds: Math.random() > 0.5, // 50% chance of having Google Ads
          googleAdsChecked: true,
          isHighValue: Math.random() > 0.7, // 30% chance of being high value
          organicRanking: Math.floor(Math.random() * 20) + 1 // Random ranking 1-20
        }
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} leads with Google Ads data`);
    
    // Check the results
    const totalLeads = await leadsCollection.countDocuments();
    const googleAdsLeads = await leadsCollection.countDocuments({ googleAds: true });
    const highValueLeads = await leadsCollection.countDocuments({ isHighValue: true });
    const checkedLeads = await leadsCollection.countDocuments({ googleAdsChecked: true });
    
    console.log('Updated statistics:');
    console.log(`Total leads: ${totalLeads}`);
    console.log(`Google Ads leads: ${googleAdsLeads}`);
    console.log(`High-value leads: ${highValueLeads}`);
    console.log(`Checked leads: ${checkedLeads}`);
    
  } catch (error) {
    console.error('Error updating Google Ads data:', error);
  } finally {
    await client.close();
  }
}

// Run the script
updateGoogleAdsData(); 