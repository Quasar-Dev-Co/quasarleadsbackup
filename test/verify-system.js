const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');

async function verifyAllComponents() {
  console.log('🔍 SYSTEM VERIFICATION TEST');
  console.log('==========================\n');

  // 1. Test SMTP Connection
  console.log('📧 Testing SMTP Connection...');
  const smtpConfig = {
    host: 'mail.zxcs.nl',
    port: 465,
    secure: true,
    auth: {
      user: 'info@quasarseo.nl',
      pass: 'Bz76WRRu7Auu3A97ZQfq'
    }
  };

  try {
    const transporter = nodemailer.createTransport(smtpConfig);
    await transporter.verify();
    console.log('✅ SMTP Connection: SUCCESS');
  } catch (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
  }

  // 2. Test IMAP Connection
  console.log('\n📬 Testing IMAP Connection...');
  const imapConfig = {
    host: 'mail.zxcs.nl',
    port: 993,
    secure: true,
    auth: {
      user: 'info@quasarseo.nl',
      pass: 'Bz76WRRu7Auu3A97ZQfq'
    }
  };

  try {
    const client = new ImapFlow(imapConfig);
    await client.connect();
    console.log('✅ IMAP Connection: SUCCESS');
    await client.logout();
  } catch (error) {
    console.error('❌ IMAP Connection Failed:', error.message);
  }

  // 3. Test API Endpoints
  console.log('\n🌐 Testing API Endpoints...');
  const baseUrl = 'http://localhost:3000';
  const endpoints = [
    '/api/cron/health',
    '/api/email-responses/settings',
    '/api/cron/process-email-responses',
    '/api/cron/fetch-incoming-emails'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      const data = await response.json();
      console.log(`✅ ${endpoint}: ${response.ok ? 'SUCCESS' : 'FAILED'}`);
      if (!response.ok) {
        console.error(`  Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ ${endpoint} Failed:`, error.message);
    }
  }

  // 4. Test Email Send
  console.log('\n📨 Testing Email Send...');
  try {
    const transporter = nodemailer.createTransport(smtpConfig);
    const info = await transporter.sendMail({
      from: '"QuasarSEO Test" <info@quasarseo.nl>',
      to: 'info@quasarseo.nl',
      subject: 'System Test Email',
      text: 'This is a test email to verify the system is working.',
      html: '<p>This is a test email to verify the system is working.</p>'
    });
    console.log('✅ Test Email Sent:', info.messageId);
  } catch (error) {
    console.error('❌ Test Email Failed:', error.message);
  }

  console.log('\n📊 FINAL DIAGNOSIS');
  console.log('=================');
  console.log('1. Check all ✅ and ❌ marks above');
  console.log('2. Ensure all connections are successful');
  console.log('3. Verify test email was received');
  console.log('\nIf any component failed:');
  console.log('- Check network connectivity');
  console.log('- Verify SMTP/IMAP credentials');
  console.log('- Ensure MongoDB is running');
  console.log('- Check API endpoints are accessible');
}

verifyAllComponents().catch(console.error); 