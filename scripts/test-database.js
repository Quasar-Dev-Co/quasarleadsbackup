const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quasarleads';

async function testDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const leadsCollection = db.collection('leads');
    
    // Check total leads
    const totalLeads = await leadsCollection.countDocuments();
    console.log(`Total leads: ${totalLeads}`);
    
    // Check Google Ads data
    const googleAdsLeads = await leadsCollection.countDocuments({ googleAds: true });
    const highValueLeads = await leadsCollection.countDocuments({ isHighValue: true });
    const checkedLeads = await leadsCollection.countDocuments({ googleAdsChecked: true });
    
    console.log(`Google Ads leads: ${googleAdsLeads}`);
    console.log(`High-value leads: ${highValueLeads}`);
    console.log(`Checked leads: ${checkedLeads}`);
    
    // Check a few sample leads
    const sampleLeads = await leadsCollection.find({}).limit(3).toArray();
    console.log('\nSample leads:');
    sampleLeads.forEach((lead, index) => {
      console.log(`Lead ${index + 1}:`);
      console.log(`  Name: ${lead.name}`);
      console.log(`  Google Ads: ${lead.googleAds}`);
      console.log(`  High Value: ${lead.isHighValue}`);
      console.log(`  Checked: ${lead.googleAdsChecked}`);
      console.log(`  Email History: ${lead.emailHistory ? lead.emailHistory.length : 0} emails`);
    });
    
  } catch (error) {
    console.error('Error testing database:', error);
  } finally {
    await client.close();
  }
}

// Run the script
testDatabase(); 