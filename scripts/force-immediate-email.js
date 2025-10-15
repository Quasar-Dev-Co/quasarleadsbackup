#!/usr/bin/env node

// This script directly updates the MongoDB to set nextScheduledEmail to current time
// so the email automation will process it immediately

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/text-gpt-test';

async function forceImmediateEmail() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔧 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    const collection = db.collection('leads');
    
    // Find the lead with active automation
    const lead = await collection.findOne({
      emailSequenceActive: true
    });
    
    if (!lead) {
      console.log('❌ No lead found with active email automation');
      return;
    }
    
    console.log(`📧 Found lead: ${lead.name} (${lead.email})`);
    console.log(`📊 Current step: ${lead.emailSequenceStep}, stage: ${lead.emailSequenceStage}`);
    console.log(`📅 Current next email: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
    
    // Set nextScheduledEmail to current time (minus 1 minute to ensure it's in the past)
    const immediateTime = new Date();
    immediateTime.setMinutes(immediateTime.getMinutes() - 1);
    
    console.log(`⏰ Setting next email time to: ${immediateTime.toLocaleString()}`);
    
    const updateResult = await collection.updateOne(
      { _id: lead._id },
      {
        $set: {
          nextScheduledEmail: immediateTime,
          updatedAt: new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Successfully updated nextScheduledEmail!');
      
      // Now trigger the dev automation
      console.log('🔄 Triggering development email automation...');
      
      const response = await fetch('http://localhost:3000/api/dev-email-automation');
      const data = await response.json();
      
      console.log('📋 Automation result:');
      console.log(`   - Success: ${data.success}`);
      console.log(`   - Message: ${data.message}`);
      console.log(`   - Emails sent: ${data.results?.emailsSent || 0}`);
      console.log(`   - Total leads: ${data.results?.totalLeads || 0}`);
      
      if (data.results?.details && data.results.details.length > 0) {
        console.log('📧 Email details:');
        data.results.details.forEach((detail, i) => {
          console.log(`   ${i+1}. ${detail.leadName} - Step ${detail.step}/7 - ${detail.success ? '✅' : '❌'}`);
          if (detail.nextEmailDate) {
            console.log(`      Next email: ${new Date(detail.nextEmailDate).toLocaleString()}`);
          }
        });
      }
      
    } else {
      console.log('❌ Failed to update nextScheduledEmail');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.close();
  }
}

forceImmediateEmail(); 