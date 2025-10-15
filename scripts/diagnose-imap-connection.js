const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const net = require('net');

async function diagnoseIMAPConnection() {
  console.log('🔍 IMAP CONNECTION DIAGNOSTIC TOOL');
  console.log('='.repeat(50));
  
  const host = 'mail.zxcs.nl';
  const imapPort = 993;
  const smtpPort = 465;
  const username = 'info@quasarseo.nl';
  const password = 'Bz76WRRu7Auu3A97ZQfq';
  
  // Step 1: DNS Resolution Test
  console.log('\n📡 STEP 1: DNS Resolution Test');
  console.log('='.repeat(30));
  try {
    const addresses = await dns.resolve4(host);
    console.log(`✅ DNS Resolution: ${host} → ${addresses.join(', ')}`);
  } catch (dnsError) {
    console.error(`❌ DNS Resolution Failed: ${dnsError.message}`);
    console.log('💡 Solution: Check your internet connection or use a different DNS server');
    return;
  }
  
  // Step 2: Port Connectivity Test
  console.log('\n🔌 STEP 2: Port Connectivity Test');
  console.log('='.repeat(30));
  
  // Test IMAP port
  const imapConnectable = await testPortConnection(host, imapPort, 'IMAP');
  
  // Test SMTP port
  const smtpConnectable = await testPortConnection(host, smtpPort, 'SMTP');
  
  if (!imapConnectable && !smtpConnectable) {
    console.log('\n🚨 CRITICAL: Both IMAP and SMTP ports are blocked!');
    console.log('💡 Possible causes:');
    console.log('   - Corporate firewall blocking email ports');
    console.log('   - ISP blocking email ports');
    console.log('   - Mail server is down');
    console.log('   - Antivirus software blocking connections');
    return;
  }
  
  // Step 3: SMTP Connection Test (usually more reliable)
  console.log('\n📧 STEP 3: SMTP Connection Test');
  console.log('='.repeat(30));
  
  if (smtpConnectable) {
    try {
      const transporter = nodemailer.createTransporter({
        host: host,
        port: smtpPort,
        secure: true,
        auth: { user: username, pass: password },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 60000
      });
      
      await transporter.verify();
      console.log('✅ SMTP Authentication: SUCCESS');
      console.log('💡 SMTP is working - credentials are valid');
    } catch (smtpError) {
      console.error(`❌ SMTP Authentication Failed: ${smtpError.message}`);
      if (smtpError.message.includes('authentication')) {
        console.log('💡 Solution: Check username/password credentials');
      }
    }
  }
  
  // Step 4: IMAP Connection Test
  console.log('\n📬 STEP 4: IMAP Connection Test');
  console.log('='.repeat(30));
  
  if (imapConnectable) {
    await testIMAPConnection(host, imapPort, username, password);
  } else {
    console.log('❌ Skipping IMAP test - port not accessible');
  }
  
  // Step 5: Alternative Solutions
  console.log('\n🔧 STEP 5: Alternative Solutions');
  console.log('='.repeat(30));
  
  if (!imapConnectable) {
    console.log('📋 IMAP Port Blocked - Alternative Solutions:');
    console.log('');
    console.log('1. 🌐 Use Gmail IMAP (if corporate email allows):');
    console.log('   Host: imap.gmail.com');
    console.log('   Port: 993');
    console.log('   Setup: Enable 2FA + App Password');
    console.log('');
    console.log('2. 🔄 Use Email Forwarding:');
    console.log('   Forward emails from info@quasarseo.nl to Gmail');
    console.log('   Use Gmail IMAP to read forwarded emails');
    console.log('');
    console.log('3. 🏢 Contact IT Department:');
    console.log('   Ask to whitelist mail.zxcs.nl:993 (IMAP)');
    console.log('   Ask to whitelist mail.zxcs.nl:465 (SMTP)');
    console.log('');
    console.log('4. 🌍 Use VPN:');
    console.log('   Connect to VPN that allows email ports');
    console.log('   Test connection again');
  }
  
  // Step 6: Environment Variables Check
  console.log('\n⚙️ STEP 6: Environment Variables');
  console.log('='.repeat(30));
  console.log('Current Configuration:');
  console.log(`   IMAP_HOST: ${process.env.IMAP_HOST || 'mail.zxcs.nl (default)'}`);
  console.log(`   IMAP_PORT: ${process.env.IMAP_PORT || '993 (default)'}`);
  console.log(`   IMAP_USER: ${process.env.IMAP_USER || 'info@quasarseo.nl (default)'}`);
  console.log(`   IMAP_PASSWORD: ${process.env.IMAP_PASSWORD ? '***SET***' : 'Using default'}`);
  
  console.log('\n📋 Recommended .env.local settings:');
  console.log('IMAP_HOST=mail.zxcs.nl');
  console.log('IMAP_PORT=993');
  console.log('IMAP_USER=info@quasarseo.nl');
  console.log('IMAP_PASSWORD=Bz76WRRu7Auu3A97ZQfq');
  
  console.log('\n🎯 FINAL DIAGNOSIS');
  console.log('='.repeat(20));
  
  if (imapConnectable && smtpConnectable) {
    console.log('✅ Network connectivity is good');
    console.log('💡 The issue might be in the IMAP library configuration');
  } else if (smtpConnectable && !imapConnectable) {
    console.log('⚠️ SMTP works but IMAP is blocked');
    console.log('💡 Use email forwarding or contact IT to unblock IMAP port');
  } else {
    console.log('❌ Both SMTP and IMAP are blocked');
    console.log('💡 Network/firewall issue - contact IT support');
  }
}

async function testPortConnection(host, port, service) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 10000; // 10 seconds
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      console.log(`✅ ${service} Port ${port}: Accessible`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`❌ ${service} Port ${port}: Timeout (blocked or filtered)`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(`❌ ${service} Port ${port}: Connection refused (service not running)`);
      } else if (err.code === 'ETIMEDOUT') {
        console.log(`❌ ${service} Port ${port}: Timeout (blocked by firewall)`);
      } else {
        console.log(`❌ ${service} Port ${port}: ${err.message}`);
      }
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function testIMAPConnection(host, port, username, password) {
  const configs = [
    // Configuration 1: Standard SSL
    {
      name: 'Standard SSL',
      config: {
        host: host,
        port: port,
        secure: true,
        auth: { user: username, pass: password },
        logger: false,
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 60000
      }
    },
    // Configuration 2: With TLS options
    {
      name: 'SSL with TLS options',
      config: {
        host: host,
        port: port,
        secure: true,
        auth: { user: username, pass: password },
        logger: false,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 60000
      }
    },
    // Configuration 3: Alternative port
    {
      name: 'Alternative port 143 with STARTTLS',
      config: {
        host: host,
        port: 143,
        secure: false,
        auth: { user: username, pass: password },
        logger: false,
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 60000
      }
    }
  ];
  
  for (const { name, config } of configs) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      const client = new ImapFlow(config);
      await client.connect();
      console.log(`✅ ${name}: Connection successful!`);
      
      // Test basic operations
      const mailbox = await client.getMailboxLock('INBOX');
      const searchResults = await client.search({ seen: false });
      console.log(`📊 Found ${searchResults.length} unseen emails`);
      await mailbox.release();
      
      await client.logout();
      console.log(`✅ ${name}: Full test successful!`);
      return true;
      
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
  
  return false;
}

// Run the diagnostic
diagnoseIMAPConnection().catch(console.error); 