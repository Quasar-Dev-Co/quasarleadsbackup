const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

async function testEmailFetch() {
  console.log('🔍 Testing email fetch functionality...');
  
  // Primary IMAP configuration
  const imapConfig = {
    host: 'mail.zxcs.nl',
    port: 993,
    secure: true,
    auth: {
      user: 'info@quasarseo.nl',
      pass: 'Bz76WRRu7Auu3A97ZQfq'
    },
    logger: false,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  };

  const client = new ImapFlow(imapConfig);

  try {
    console.log('🔗 Connecting to IMAP server...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Get mailbox lock
    const mailbox = await client.getMailboxLock('INBOX');
    
    try {
      // Search for ALL emails (not just unseen)
      console.log('🔍 Searching for all emails...');
      const allEmails = await client.search({});
      console.log(`📊 Found ${allEmails.length} total emails`);
      
      // Search for unseen emails
      console.log('🔍 Searching for unseen emails...');
      const unseenEmails = await client.search({ seen: false });
      console.log(`📊 Found ${unseenEmails.length} unseen emails`);
      
      // Search for emails from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log('🔍 Searching for emails from today...');
      const todayEmails = await client.search({ since: today });
      console.log(`📊 Found ${todayEmails.length} emails from today`);
      
      // Search for emails with specific keywords that might indicate replies
      console.log('🔍 Searching for emails with "Re:" in subject...');
      const replyEmails = await client.search({ subject: 'Re:' });
      console.log(`📊 Found ${replyEmails.length} emails with "Re:" in subject`);
      
      // Get the most recent 5 emails to examine
      const recentEmails = allEmails.slice(-5);
      console.log(`\n📧 Examining the most recent ${recentEmails.length} emails:`);
      
      for await (const msg of client.fetch(recentEmails, { envelope: true, source: true })) {
        try {
          if (!msg.source) {
            console.log('⚠️ Email source is empty');
            continue;
          }
          
          const parsed = await simpleParser(msg.source);
          const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase() || 'unknown';
          const toEmail = parsed.to?.value?.[0]?.address?.toLowerCase() || 'unknown';
          const flags = msg.flags || [];
          
          console.log(`\n📧 Email Details:`);
          console.log(`   From: ${fromEmail}`);
          console.log(`   To: ${toEmail}`);
          console.log(`   Subject: ${parsed.subject || 'No Subject'}`);
          console.log(`   Date: ${parsed.date || 'No Date'}`);
          console.log(`   Flags: ${flags.join(', ')}`);
          console.log(`   Message ID: ${parsed.messageId || 'No Message ID'}`);
          console.log(`   In Reply To: ${parsed.inReplyTo || 'Not a reply'}`);
          console.log(`   Content Preview: ${(parsed.text || '').substring(0, 100)}...`);
          
          // Check if this is our own email
          const ourEmails = ['info@quasarseo.nl'];
          if (ourEmails.includes(fromEmail)) {
            console.log(`   ⚠️ This is an outgoing email from us`);
          } else {
            console.log(`   ✅ This is an incoming email from a lead`);
          }
          
        } catch (parseError) {
          console.error(`❌ Error parsing email:`, parseError.message);
        }
      }
      
    } finally {
      await mailbox.release();
    }

    await client.logout();
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error during email fetch test:', error.message);
    
    if (client && client.usable) {
      try {
        await client.logout();
      } catch (logoutError) {
        console.warn('⚠️ Error during logout:', logoutError.message);
      }
    }
  }
}

// Run the test
testEmailFetch().catch(console.error); 