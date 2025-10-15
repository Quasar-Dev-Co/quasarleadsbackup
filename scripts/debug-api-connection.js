const mongoose = require('mongoose');

// Simulate the API's database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads';

async function debugAPIConnection() {
  console.log('🔍 Testing API database connection...');
  console.log(`📦 Using URI: ${MONGODB_URI}`);
  
  try {
    // Connect using the same method as the API
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true
    });
    
    console.log('✅ Connected successfully');
    
    // Get the database name
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database name: ${dbName}`);
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.map(c => c.name).join(', ')}`);
    
    // Test the Lead model (simulate what the API does)
    const LeadSchema = new mongoose.Schema({
      name: String,
      company: String,
      email: String,
      googleAds: Boolean,
      isHighValue: Boolean,
      googleAdsChecked: Boolean,
      organicRanking: Number
    });
    
    const Lead = mongoose.model('Lead', LeadSchema);
    
    // Count documents
    const totalCount = await Lead.countDocuments();
    const googleAdsCount = await Lead.countDocuments({ googleAds: true });
    const isHighValueCount = await Lead.countDocuments({ isHighValue: true });
    const checkedCount = await Lead.countDocuments({ googleAdsChecked: true });
    
    console.log('📈 API-style counts:');
    console.log(`   Total leads: ${totalCount}`);
    console.log(`   Google Ads leads: ${googleAdsCount}`);
    console.log(`   High-value leads: ${isHighValueCount}`);
    console.log(`   Checked leads: ${checkedCount}`);
    
    // Test aggregation pipeline
    const stats = await Lead.aggregate([
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
    ]);
    
    const result = stats[0] || {
      totalLeads: 0,
      checkedLeads: 0,
      googleAdsLeads: 0,
      highValueLeads: 0
    };
    
    console.log('📊 Aggregation result:', result);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
debugAPIConnection(); 