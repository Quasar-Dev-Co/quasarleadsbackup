const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixEmailTemplateConstraints() {
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
    });

    // Look for the problematic unique index on stage field
    const stageIndex = indexes.find(index => 
      index.name === 'stage_1' || 
      (index.key && index.key.stage === 1)
    );

    if (stageIndex && stageIndex.unique) {
      console.log('\n🔧 Found problematic unique index on stage field');
      console.log(`   Index name: ${stageIndex.name}`);
      console.log(`   Index key: ${JSON.stringify(stageIndex.key)}`);
      
      // Drop the problematic index
      console.log('\n🗑️  Dropping unique index on stage field...');
      await collection.dropIndex(stageIndex.name);
      console.log('✅ Successfully dropped the unique index on stage field');
      
      // Verify the index was dropped
      const updatedIndexes = await collection.indexes();
      const stageIndexStillExists = updatedIndexes.find(index => 
        index.name === 'stage_1' || 
        (index.key && index.key.stage === 1)
      );
      
      if (!stageIndexStillExists) {
        console.log('✅ Confirmed: unique index on stage field has been removed');
      } else {
        console.log('⚠️  Warning: stage index still exists after drop attempt');
      }
      
    } else {
      console.log('\n✅ No problematic unique index found on stage field');
    }

    // Create a compound index for better query performance (stage + userId)
    console.log('\n🔧 Creating compound index for stage + userId...');
    try {
      await collection.createIndex({ stage: 1, userId: 1 });
      console.log('✅ Successfully created compound index on { stage: 1, userId: 1 }');
    } catch (indexError) {
      if (indexError.code === 85) {
        console.log('ℹ️  Compound index already exists');
      } else {
        console.log('⚠️  Warning: Could not create compound index:', indexError.message);
      }
    }

    // Show final index state
    const finalIndexes = await collection.indexes();
    console.log('\n📊 Final indexes on emailtemplates collection:');
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`   - UNIQUE constraint`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixEmailTemplateConstraints();
