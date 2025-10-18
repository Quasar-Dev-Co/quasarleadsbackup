const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkMediaLinks() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const EmailTemplate = mongoose.connection.collection('emailtemplates');
    
    // Get the most recently updated template
    const recentTemplates = await EmailTemplate.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    console.log(`📧 Last 5 Updated Templates:\n`);

    recentTemplates.forEach((template, index) => {
      console.log(`${index + 1}. Stage: ${template.stage}`);
      console.log(`   Updated: ${template.updatedAt}`);
      console.log(`   User ID: ${template.userId || 'Global'}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Content Prompt: ${template.contentPrompt ? `✓ (${template.contentPrompt.length} chars)` : '✗ EMPTY'}`);
      console.log(`   Email Signature: ${template.emailSignature ? `✓ (${template.emailSignature.length} chars)` : '✗ EMPTY'}`);
      console.log(`   Media Links: ${template.mediaLinks ? `✓ (${template.mediaLinks.length} chars)` : '✗ EMPTY'}`);
      
      if (template.mediaLinks) {
        console.log(`\n   📺 MEDIA CONTENT:`);
        console.log(`   ${template.mediaLinks}\n`);
      } else {
        console.log(`   ⚠️ NO MEDIA CONTENT FOUND\n`);
      }
      console.log('─'.repeat(80));
    });

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMediaLinks();
