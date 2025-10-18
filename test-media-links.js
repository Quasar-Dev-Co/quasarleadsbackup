const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads';

async function checkMediaLinks() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all email templates
    const EmailTemplate = mongoose.connection.collection('emailtemplates');
    const templates = await EmailTemplate.find({}).toArray();

    console.log(`\n📧 Found ${templates.length} email templates\n`);

    templates.forEach((template, index) => {
      console.log(`${index + 1}. Stage: ${template.stage}`);
      console.log(`   User ID: ${template.userId || 'Global'}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Content Prompt: ${template.contentPrompt ? '✓' : '✗'}`);
      console.log(`   Email Signature: ${template.emailSignature ? '✓' : '✗'}`);
      console.log(`   Media Links: ${template.mediaLinks ? '✓ HAS CONTENT' : '✗ EMPTY'}`);
      
      if (template.mediaLinks) {
        console.log(`   Media Content: ${template.mediaLinks.substring(0, 150)}...`);
      }
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMediaLinks();
