const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkEmailTemplateIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the email templates collection
    const db = mongoose.connection.db;
    const collection = db.collection('emailtemplates');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\n📊 Current indexes on emailtemplates collection:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`   - UNIQUE constraint`);
      }
      if (index.sparse) {
        console.log(`   - SPARSE index`);
      }
    });

    // Check if there are any documents with duplicate stages
    const stageCounts = await collection.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    if (stageCounts.length > 0) {
      console.log('\n⚠️  Duplicate stages found:');
      stageCounts.forEach(item => {
        console.log(`   - Stage "${item._id}": ${item.count} templates`);
      });
    } else {
      console.log('\n✅ No duplicate stages found');
    }

    // Check total document count
    const totalCount = await collection.countDocuments();
    console.log(`\n📈 Total email templates: ${totalCount}`);

    // Sample a few documents to see their structure
    const sampleDocs = await collection.find({}).limit(3).toArray();
    console.log('\n📄 Sample documents:');
    sampleDocs.forEach((doc, i) => {
      console.log(`\n${i + 1}. ID: ${doc._id}`);
      console.log(`   Stage: ${doc.stage}`);
      console.log(`   User ID: ${doc.userId || 'N/A'}`);
      console.log(`   Subject: ${doc.subject}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkEmailTemplateIndexes();
