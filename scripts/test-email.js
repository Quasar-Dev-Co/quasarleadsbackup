const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    });
    
    Object.assign(process.env, envVars);
    console.log('✅ Loaded environment variables from .env.local');
  } catch (error) {
    console.error('❌ Could not load .env.local file:', error.message);
  }
}

loadEnvFile();

async function testEmailConnection() {
  console.log('🔍 Testing Gmail Email Connection...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   GMAIL_USER: ${process.env.GMAIL_USER || 'NOT SET'}`);
  console.log(`   GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '***' + process.env.GMAIL_APP_PASSWORD.slice(-4) : 'NOT SET'}`);
  console.log(`   SENDER_NAME: ${process.env.SENDER_NAME || 'QuasarLeads Team (default)'}\n`);
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Missing email configuration!');
    console.log('\n📝 Required steps:');
    console.log('   1. Enable 2-Factor Authentication on your Gmail account');
    console.log('   2. Generate App Password: https://myaccount.google.com/apppasswords');
    console.log('   3. Add to .env.local:');
    console.log('      GMAIL_USER=your_email@gmail.com');
    console.log('      GMAIL_APP_PASSWORD=your_16_character_app_password');
    console.log('      SENDER_NAME=Your Name');
    return;
  }
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    debug: true,
    logger: true,
    tls: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔧 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ Gmail SMTP connection successful!\n');
    
    // Test sending an email
    console.log('📧 Sending test email...');
    const testEmail = {
      from: `"${process.env.SENDER_NAME || 'QuasarLeads Team'}" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to self
      subject: '[TEST] Gmail Configuration Working ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0;">✅ Email Configuration Success!</h1>
            <p style="margin: 10px 0 0 0;">Your QuasarLeads email system is working correctly.</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9; margin-top: 20px; border-radius: 8px;">
            <h3>Test Details:</h3>
            <ul>
              <li><strong>From:</strong> ${process.env.GMAIL_USER}</li>
              <li><strong>Sender Name:</strong> ${process.env.SENDER_NAME || 'QuasarLeads Team'}</li>
              <li><strong>Service:</strong> Gmail SMTP</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px; color: #666;">
            You can now safely use the CRM email automation features!
          </p>
        </div>
      `,
      text: `
Gmail Configuration Test Successful!

Your QuasarLeads email system is working correctly.

Test Details:
- From: ${process.env.GMAIL_USER}
- Sender Name: ${process.env.SENDER_NAME || 'QuasarLeads Team'}
- Service: Gmail SMTP
- Time: ${new Date().toLocaleString()}

You can now safely use the CRM email automation features!
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`📬 Check your inbox: ${process.env.GMAIL_USER}\n`);
    
    console.log('🎉 Email configuration is working perfectly!');
    console.log('   You can now use the CRM email automation features.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    console.log('\n🔧 Troubleshooting Guide:');
    
    if (error.code === 'EAUTH') {
      console.log('   🔐 Authentication Error:');
      console.log('   1. Check that 2-Factor Authentication is enabled');
      console.log('   2. Generate a new App Password: https://myaccount.google.com/apppasswords');
      console.log('   3. Copy the 16-character password exactly (no spaces)');
      console.log('   4. Update GMAIL_APP_PASSWORD in .env.local');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   🌐 Network Error:');
      console.log('   1. Check your internet connection');
      console.log('   2. Try again in a few minutes');
      console.log('   3. Check if your firewall blocks SMTP (port 587)');
    } else if (error.code === 'ECONNECTION') {
      console.log('   🔌 Connection Error:');
      console.log('   1. Gmail SMTP might be temporarily unavailable');
      console.log('   2. Check your network/firewall settings');
      console.log('   3. Try switching between port 587 and 465');
    } else {
      console.log('   🤔 Unknown Error:');
      console.log('   1. Double-check your Gmail credentials');
      console.log('   2. Ensure the Gmail account is active');
      console.log('   3. Try generating a new App Password');
    }
    
    console.log('\n📞 Need help? Check Gmail App Password setup:');
    console.log('   https://support.google.com/accounts/answer/185833');
  }
}

// Run the test
testEmailConnection().catch(console.error); 