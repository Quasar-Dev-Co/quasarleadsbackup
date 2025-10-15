/**
 * Test script to verify user-specific SMTP credentials
 * 
 * This script tests sending emails using user-specific SMTP credentials from the database
 * It will:
 * 1. Find a user with SMTP credentials
 * 2. Create a transporter using those credentials
 * 3. Send a test email
 * 4. Report success or failure
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    return false;
  }
}

// Find a user with SMTP credentials
async function findUserWithCredentials() {
  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find users with SMTP credentials
    const users = await usersCollection.find({
      'credentials.SMTP_HOST': { $exists: true, $ne: '' },
      'credentials.SMTP_PORT': { $exists: true, $ne: '' },
      'credentials.SMTP_USER': { $exists: true, $ne: '' },
      'credentials.SMTP_PASSWORD': { $exists: true, $ne: '' }
    }).toArray();
    
    if (users.length === 0) {
      console.log('❌ No users found with complete SMTP credentials');
      return null;
    }
    
    console.log(`✅ Found ${users.length} users with SMTP credentials`);
    return users[0]; // Return the first user with credentials
  } catch (error) {
    console.error('❌ Error finding users with credentials:', error);
    return null;
  }
}

// Create email transporter using user credentials
function createTransporterFromUser(user) {
  try {
    if (!user || !user.credentials) {
      console.log('❌ User or credentials not found');
      return null;
    }
    
    const creds = user.credentials;
    
    if (!creds.SMTP_HOST || !creds.SMTP_PORT || !creds.SMTP_USER || !creds.SMTP_PASSWORD) {
      console.log('❌ Incomplete SMTP credentials');
      return null;
    }
    
    const portNumber = parseInt(String(creds.SMTP_PORT), 10);
    const secure = portNumber === 465; // common convention
    
    console.log(`📧 Creating transporter with these credentials:`);
    console.log(`   Host: ${creds.SMTP_HOST}`);
    console.log(`   Port: ${portNumber} (secure: ${secure})`);
    console.log(`   User: ${creds.SMTP_USER}`);
    console.log(`   Password: ${creds.SMTP_PASSWORD.substring(0, 3)}${'*'.repeat(creds.SMTP_PASSWORD.length - 3)}`);
    
    return {
      transporter: nodemailer.createTransport({
        host: String(creds.SMTP_HOST),
        port: portNumber,
        secure,
        auth: {
          user: String(creds.SMTP_USER),
          pass: String(creds.SMTP_PASSWORD),
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
      }),
      senderEmail: String(creds.SMTP_USER),
      senderName: user.name || user.username || 'QuasarSEO Team'
    };
  } catch (error) {
    console.error('❌ Error creating transporter:', error);
    return null;
  }
}

// Send test email
async function sendTestEmail(transporterInfo) {
  try {
    if (!transporterInfo || !transporterInfo.transporter) {
      console.log('❌ No valid transporter provided');
      return false;
    }
    
    const { transporter, senderEmail, senderName } = transporterInfo;
    
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send test email
    console.log('📧 Sending test email...');
    const testRecipient = process.env.TEST_EMAIL || senderEmail;
    
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: testRecipient,
      subject: 'Test Email - User SMTP Credentials',
      text: 'This is a test email sent using user-specific SMTP credentials from the database.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2>SMTP Credentials Test</h2>
          <p>This is a test email sent using user-specific SMTP credentials from the database.</p>
          <p>If you're seeing this, the system is correctly using the user's SMTP settings.</p>
          <hr>
          <p><strong>Sent from:</strong> ${senderEmail}</p>
          <p><strong>Sent by:</strong> ${senderName}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${testRecipient}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting user SMTP credentials test...');
    
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      console.log('❌ Test failed: Could not connect to database');
      process.exit(1);
    }
    
    // Find user with credentials
    const user = await findUserWithCredentials();
    if (!user) {
      console.log('❌ Test failed: No user with SMTP credentials found');
      process.exit(1);
    }
    
    console.log(`✅ Using user: ${user.username || user._id} (${user.email || 'No email'})`);
    
    // Create transporter
    const transporterInfo = createTransporterFromUser(user);
    if (!transporterInfo) {
      console.log('❌ Test failed: Could not create email transporter');
      process.exit(1);
    }
    
    // Send test email
    const emailSent = await sendTestEmail(transporterInfo);
    if (!emailSent) {
      console.log('❌ Test failed: Could not send test email');
      process.exit(1);
    }
    
    console.log('🎉 Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the test
main();

