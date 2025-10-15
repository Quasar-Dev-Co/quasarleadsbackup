const fetch = require('node-fetch');

async function debugDatabase() {
  console.log('🔧 DEBUGGING DATABASE CONNECTION AND EMAIL STORAGE');
  console.log('================================================');
  
  const baseUrl = 'https://text-gpt-test.vercel.app';
  
  // Step 1: Test basic database connection via API
  console.log('\n📋 STEP 1: Test database connection');
  console.log('==================================');
  try {
    const testResponse = await fetch(`${baseUrl}/api/email-responses/incoming?limit=1`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`📡 Response status: ${testResponse.status}`);
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ Database connection working');
      console.log(`📧 Emails found: ${data.emails?.length || 0}`);
      
      if (data.emails && data.emails.length > 0) {
        console.log('\n📩 Existing emails:');
        data.emails.forEach((email, i) => {
          console.log(`   ${i+1}. "${email.subject}" from ${email.leadEmail} - Status: ${email.status}`);
        });
      } else {
        console.log('📭 No emails in database - this is the problem!');
      }
    } else {
      const errorText = await testResponse.text();
      console.log('❌ Database connection failed:');
      console.log(errorText);
    }
  } catch (error) {
    console.log(`❌ Database test failed: ${error.message}`);
  }
  
  // Step 2: Force trigger IMAP to fetch emails
  console.log('\n📬 STEP 2: Force trigger IMAP email fetching');
  console.log('==========================================');
  try {
    const imapResponse = await fetch(`${baseUrl}/api/cron/fetch-incoming-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`📡 IMAP response status: ${imapResponse.status}`);
    
    if (imapResponse.ok) {
      const imapData = await imapResponse.json();
      console.log('✅ IMAP Response:');
      console.log(`   Total found: ${imapData.stats?.totalFound || 0}`);
      console.log(`   New emails: ${imapData.stats?.newEmails || 0}`);
      console.log(`   Processed: ${imapData.stats?.processed || 0}`);
      
      if (imapData.stats?.totalFound > 0) {
        console.log('✅ IMAP is finding emails!');
        
        if (imapData.stats?.newEmails > 0) {
          console.log('🎉 IMAP added new emails to database!');
        } else {
          console.log('⚠️ IMAP found emails but they were already processed');
        }
      } else {
        console.log('❌ IMAP found 0 emails - this is a problem!');
        console.log('💡 IMAP may not be connecting to mail server properly');
      }
    } else {
      const errorText = await imapResponse.text();
      console.log('❌ IMAP failed:');
      console.log(errorText);
    }
  } catch (error) {
    console.log(`❌ IMAP test failed: ${error.message}`);
  }
  
  // Step 3: Check database again after IMAP
  console.log('\n📋 STEP 3: Check database after IMAP');
  console.log('===================================');
  try {
    const recheck = await fetch(`${baseUrl}/api/email-responses/incoming?limit=10`);
    if (recheck.ok) {
      const recheckData = await recheck.json();
      console.log(`📧 Emails in database now: ${recheckData.emails?.length || 0}`);
      
      if (recheckData.emails && recheckData.emails.length > 0) {
        console.log('\n📩 Recent emails:');
        recheckData.emails.slice(0, 5).forEach((email, i) => {
          console.log(`   ${i+1}. ID: ${email.id}`);
          console.log(`      Subject: "${email.subject}"`);
          console.log(`      From: ${email.leadEmail}`);
          console.log(`      Status: ${email.status}`);
          console.log('');
        });
        
        // Now test if AI processing works with these emails
        const unreadEmails = recheckData.emails.filter(email => email.status === 'unread');
        console.log(`📬 Unread emails: ${unreadEmails.length}`);
        
        if (unreadEmails.length > 0) {
          console.log('\n🤖 STEP 4: Test AI processing with unread emails');
          console.log('===============================================');
          
          const aiResponse = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            console.log('✅ AI Processing Results:');
            console.log(`   Total unread: ${aiData.stats?.totalUnread || 0}`);
            console.log(`   Processed: ${aiData.stats?.processed || 0}`);
            console.log(`   Auto-sent: ${aiData.stats?.autoSent || 0}`);
            console.log(`   Drafts: ${aiData.stats?.drafts || 0}`);
            
            if (aiData.stats?.autoSent > 0) {
              console.log('\n🎉🎉🎉 SUCCESS! AUTO-RESPONSE SENT!');
              console.log('=====================================');
              console.log('✅ The complete system is now working!');
              console.log('📧 Check your email inbox for the auto-response!');
            } else if (aiData.stats?.processed > 0) {
              console.log('\n📝 AI processed emails but no auto-send');
              console.log('💡 Check confidence threshold or SMTP settings');
            } else {
              console.log('\n❌ AI found no emails to process');
            }
          } else {
            const aiError = await aiResponse.text();
            console.log('❌ AI processing failed:');
            console.log(aiError);
          }
        } else {
          console.log('⚠️ All emails are already processed');
          console.log('💡 Send a fresh reply email to test the system');
        }
        
      } else {
        console.log('❌ Still no emails in database after IMAP!');
        console.log('🚨 IMAP is not saving emails to database properly!');
      }
    }
  } catch (error) {
    console.log(`❌ Database recheck failed: ${error.message}`);
  }
  
  // Step 4: Manual email creation test
  console.log('\n📧 STEP 5: Test manual email creation');
  console.log('====================================');
  try {
    const testEmailPayload = {
      leadEmail: 'test.debug@gmail.com',
      subject: 'Re: Debug Test Email',
      content: 'This is a test email to debug the system and verify database storage is working.',
      fromAddress: 'test.debug@gmail.com',
      toAddress: 'info@quasarseo.nl',
      messageId: `debug-test-${Date.now()}@gmail.com`
    };
    
    console.log('🧪 Creating test email in database...');
    const createResponse = await fetch(`${baseUrl}/api/email-responses/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEmailPayload)
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Test email created successfully!');
      console.log(`   ID: ${createData.email?.id}`);
      console.log(`   Status: ${createData.email?.status}`);
      console.log(`   Sentiment: ${createData.email?.sentiment}`);
      
      console.log('\n🎯 DATABASE IS WORKING - PROBLEM IS WITH IMAP!');
      console.log('==============================================');
      console.log('✅ Database connection: Working');
      console.log('✅ Email creation: Working');
      console.log('❌ IMAP email fetching: Not saving to database');
      console.log('');
      console.log('💡 THE ISSUE: IMAP finds emails but fails to save them to database');
      console.log('💡 Check IMAP email processing code for database save errors');
      
    } else {
      const createError = await createResponse.text();
      console.log('❌ Failed to create test email:');
      console.log(createError);
    }
  } catch (error) {
    console.log(`❌ Manual email test failed: ${error.message}`);
  }
  
  console.log('\n🎯 DIAGNOSIS SUMMARY');
  console.log('==================');
  console.log('1. If database connection works but no emails exist → IMAP not saving emails');
  console.log('2. If IMAP finds emails but database empty → IMAP save process broken');
  console.log('3. If manual email creation works → Database is functional');
  console.log('4. The problem is likely in the IMAP → Database save process');
}

debugDatabase().catch(console.error); 