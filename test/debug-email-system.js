const { ImapFlow } = require('imapflow');

// Test the complete email response system
async function debugEmailResponseSystem() {
  console.log('🔍 DEBUGGING EMAIL RESPONSE SYSTEM');
  console.log('='.repeat(50));
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // STEP 1: Test IMAP - Find Reply Emails from Last 10 Minutes
    console.log('\n📬 STEP 1: Testing IMAP for Recent Reply Emails...');
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
    
    const replyEmails = await fetchRecentReplies(tenMinutesAgo);
    console.log(`✅ Found ${replyEmails.length} reply emails from last 10 minutes`);
    
    if (replyEmails.length === 0) {
      console.log('❌ NO REPLY EMAILS FOUND - This is the first issue!');
      console.log('💡 The system needs reply emails to process.');
      return;
    }
    
    // Show recent replies
    replyEmails.forEach((email, index) => {
      console.log(`   ${index + 1}. "${email.subject}" from ${email.from}`);
    });
    
    // STEP 2: Test Cron Job - Fetch Incoming Emails
    console.log('\n📥 STEP 2: Testing Email Fetching Cron Job...');
    
    try {
      const fetchResponse = await fetch(`${baseUrl}/api/cron/fetch-incoming-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        console.log('✅ Fetch Emails Cron Job Response:');
        console.log(`   Total found: ${fetchData.stats?.totalFound || 0}`);
        console.log(`   New emails: ${fetchData.stats?.newEmails || 0}`);
        console.log(`   Processed: ${fetchData.stats?.processed || 0}`);
        
        if (fetchData.stats?.newEmails > 0) {
          console.log('✅ Cron job is successfully adding emails to database!');
        } else {
          console.log('❌ Cron job finds emails but NOT adding new ones to database!');
          console.log('💡 Check if emails are already processed or filtering is too strict');
        }
      } else {
        console.log('❌ Fetch emails cron job failed');
        const errorText = await fetchResponse.text();
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ Failed to test fetch emails cron:', error.message);
    }
    
    // STEP 3: Check Database for Unread Emails
    console.log('\n📊 STEP 3: Checking Database for Unread Emails...');
    
    try {
      const dbResponse = await fetch(`${baseUrl}/api/email-responses/incoming?status=unread&limit=10`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        console.log(`✅ Database has ${dbData.emails?.length || 0} unread emails`);
        
        if (dbData.emails && dbData.emails.length > 0) {
          console.log('📧 Recent unread emails:');
          dbData.emails.slice(0, 5).forEach((email, index) => {
            const timeAgo = Math.floor((new Date().getTime() - new Date(email.receivedAt).getTime()) / (1000 * 60));
            console.log(`   ${index + 1}. "${email.subject}" from ${email.leadEmail} (${timeAgo} min ago)`);
          });
          
          // Check if any are recent replies (less than 10 minutes)
          const recentUnread = dbData.emails.filter(email => {
            const emailTime = new Date(email.receivedAt);
            return emailTime >= tenMinutesAgo;
          });
          
          if (recentUnread.length > 0) {
            console.log(`✅ Found ${recentUnread.length} unread emails from last 10 minutes!`);
          } else {
            console.log('❌ NO unread emails from last 10 minutes in database!');
            console.log('💡 IMAP might not be saving recent emails correctly');
          }
        } else {
          console.log('❌ NO unread emails in database!');
          console.log('💡 Problem: IMAP is not saving emails to database');
        }
      } else {
        console.log('❌ Failed to check database');
      }
    } catch (error) {
      console.log('❌ Failed to check database:', error.message);
    }
    
    // STEP 4: Test AI Response Processing Cron
    console.log('\n🤖 STEP 4: Testing AI Response Processing Cron...');
    
    try {
      const aiResponse = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        console.log('✅ AI Processing Cron Job Response:');
        console.log(`   Total unread: ${aiData.stats?.totalUnread || 0}`);
        console.log(`   Processed: ${aiData.stats?.processed || 0}`);
        console.log(`   Auto-sent: ${aiData.stats?.autoSent || 0}`);
        console.log(`   Drafts created: ${aiData.stats?.drafts || 0}`);
        
        if (aiData.stats?.processed > 0) {
          console.log('✅ AI is processing emails and generating responses!');
          
          if (aiData.stats?.autoSent > 0) {
            console.log('🚀 AI is auto-sending high confidence responses!');
          } else {
            console.log('📝 AI responses are being saved as drafts (confidence too low for auto-send)');
          }
        } else {
          console.log('❌ AI is NOT processing any emails!');
          console.log('💡 Check if AI settings are enabled and emails are marked as unread');
        }
      } else {
        console.log('❌ AI processing cron job failed');
        const errorText = await aiResponse.text();
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ Failed to test AI processing cron:', error.message);
    }
    
    // STEP 5: Check AI Settings
    console.log('\n⚙️ STEP 5: Checking AI Settings...');
    
    try {
      const settingsResponse = await fetch(`${baseUrl}/api/email-responses/settings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        const settings = settingsData.settings || {};
        
        console.log('🔧 AI Settings:');
        console.log(`   Enabled: ${settings.isEnabled !== false ? 'YES' : 'NO'}`);
        console.log(`   Auto-send threshold: ${settings.autoSendThreshold || 85}%`);
        console.log(`   Company: ${settings.companyName || 'Not set'}`);
        console.log(`   Sender: ${settings.senderName || 'Not set'}`);
        
        if (settings.isEnabled === false) {
          console.log('❌ AI RESPONSES ARE DISABLED!');
          console.log('💡 Enable AI responses in settings to fix this');
        } else {
          console.log('✅ AI responses are enabled');
        }
      } else {
        console.log('⚠️ Could not check AI settings');
      }
    } catch (error) {
      console.log('⚠️ Failed to check AI settings:', error.message);
    }
    
    // FINAL DIAGNOSIS
    console.log('\n🏥 FINAL DIAGNOSIS:');
    console.log('='.repeat(30));
    
    if (replyEmails.length > 0) {
      console.log('✅ IMAP Connection: Working - finding reply emails');
    } else {
      console.log('❌ IMAP Connection: Not finding recent reply emails');
    }
    
    console.log('\n💡 POTENTIAL ISSUES TO CHECK:');
    console.log('1. IMAP timing: Change from 24 hours to 10 minutes search');
    console.log('2. Email filtering: Only process reply emails, not all emails');
    console.log('3. Database saving: Ensure IMAP saves emails to database correctly');
    console.log('4. Cron timing: 2-minute intervals might be too fast');
    console.log('5. AI settings: Ensure AI responses are enabled');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

// Helper function to fetch recent reply emails via IMAP
async function fetchRecentReplies(since) {
  const imapConfig = {
    host: process.env.IMAP_HOST || 'mail.zxcs.nl',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: process.env.IMAP_USER || 'info@quasarseo.nl',
      pass: process.env.IMAP_PASSWORD || process.env.SMTP_PASSWORD || 'Bz76WRRu7Auu3A97ZQfq'
    },
    logger: false,
    tls: { rejectUnauthorized: false }
  };

  let client;
  const replies = [];
  
  try {
    client = new ImapFlow(imapConfig);
    await client.connect();
    
    const mailbox = await client.getMailboxLock('INBOX');
    
    try {
      const searchResults = await client.search({ since });
      
      for await (const message of client.fetch(searchResults, {
        envelope: true,
        source: true
      })) {
        if (message.source) {
          const { simpleParser } = require('mailparser');
          const parsed = await simpleParser(message.source);
          
          const fromEmail = parsed.from?.value?.[0]?.address || 
                          parsed.from?.text?.match(/<([^>]+)>/)?.[1] || 
                          parsed.from?.text || 'Unknown';
          
          // Skip our own emails
          if (fromEmail === 'info@quasarseo.nl') continue;
          
          // Check if it's a reply
          const isReply = !!(parsed.inReplyTo || 
                          parsed.references || 
                          (parsed.subject && (parsed.subject.startsWith('Re:') || parsed.subject.startsWith('RE:'))));
          
          if (isReply) {
            replies.push({
              subject: parsed.subject || 'No Subject',
              from: fromEmail,
              content: parsed.text || 'No content',
              messageId: parsed.messageId,
              inReplyTo: parsed.inReplyTo,
              receivedAt: message.envelope.date
            });
          }
        }
      }
    } finally {
      mailbox.release();
    }
  } catch (error) {
    console.error('IMAP Error:', error.message);
  } finally {
    if (client) {
      await client.logout();
    }
  }
  
  return replies;
}

// Run the debug test
console.log('🚀 Starting Email Response System Debug Test');
console.log('');

debugEmailResponseSystem()
  .then(() => {
    console.log('');
    console.log('✅ Debug Test Completed');
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Debug Test Failed:', error.message);
    process.exit(1);
  }); 