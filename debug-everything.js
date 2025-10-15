const fetch = require('node-fetch');

async function debugEverything() {
  console.log('🔧 COMPREHENSIVE DEBUG OF ENTIRE EMAIL AUTOMATION SYSTEM');
  console.log('========================================================');
  
  const baseUrl = 'https://text-gpt-test.vercel.app';
  
  // Step 1: Check if we have any emails in the database
  console.log('\n📋 STEP 1: Check database for recent emails');
  console.log('==========================================');
  try {
    const emailsResponse = await fetch(`${baseUrl}/api/email-responses/incoming?limit=5`);
    if (emailsResponse.ok) {
      const emailsData = await emailsResponse.json();
      console.log(`📧 Total emails in database: ${emailsData.emails?.length || 0}`);
      
      if (emailsData.emails && emailsData.emails.length > 0) {
        console.log('\n📩 Recent emails:');
        emailsData.emails.forEach((email, i) => {
          console.log(`   ${i+1}. ID: ${email.id}`);
          console.log(`      Subject: "${email.subject}"`);
          console.log(`      From: ${email.leadEmail || email.fromAddress}`);
          console.log(`      Status: ${email.status}`);
          console.log(`      Created: ${email.createdAt || 'Unknown'}`);
          console.log('');
        });
        
        // Get the most recent email for testing
        const testEmail = emailsData.emails[0];
        console.log(`🎯 Using email "${testEmail.subject}" (ID: ${testEmail.id}) for testing`);
        
        // Step 2: Reset email to unread if needed
        console.log('\n🔄 STEP 2: Reset email to unread status');
        console.log('======================================');
        if (testEmail.status !== 'unread') {
          console.log('🔄 Resetting email to unread status...');
          const resetResponse = await fetch(`${baseUrl}/api/email-responses/incoming`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: testEmail.id,
              status: 'unread'
            })
          });
          
          if (resetResponse.ok) {
            console.log('✅ Email reset to unread');
          } else {
            const resetError = await resetResponse.text();
            console.log('❌ Failed to reset email:', resetError);
          }
        } else {
          console.log('✅ Email is already unread');
        }
        
        // Step 3: Test AI response generation directly
        console.log('\n🤖 STEP 3: Test AI response generation');
        console.log('====================================');
        console.log(`🧪 Testing AI generation for email ID: ${testEmail.id}`);
        
        const generateResponse = await fetch(`${baseUrl}/api/email-responses/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailId: testEmail.id })
        });
        
        if (generateResponse.ok) {
          const generateData = await generateResponse.json();
          console.log('✅ AI Generation Success:');
          console.log(`   Response ID: ${generateData.response?.id}`);
          console.log(`   Confidence: ${generateData.response?.confidence}%`);
          console.log(`   Response Type: ${generateData.response?.responseType}`);
          console.log(`   Auto-send recommended: ${generateData.response?.autoSendRecommended}`);
          console.log(`   Subject: ${generateData.response?.subject}`);
          console.log(`   Content: ${generateData.response?.content?.substring(0, 200)}...`);
          
          // Step 4: Test SMTP sending directly
          if (generateData.response?.id) {
            console.log('\n📧 STEP 4: Test SMTP sending');
            console.log('===========================');
            console.log(`🚀 Testing SMTP send for response ID: ${generateData.response.id}`);
            
            const sendResponse = await fetch(`${baseUrl}/api/email-responses/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ responseId: generateData.response.id })
            });
            
            if (sendResponse.ok) {
              const sendData = await sendResponse.json();
              console.log('✅ SMTP Send Success:');
              console.log(`   To: ${sendData.emailInfo?.to}`);
              console.log(`   Subject: ${sendData.emailInfo?.subject}`);
              console.log(`   Message ID: ${sendData.emailInfo?.messageId}`);
              console.log(`   Sent At: ${sendData.emailInfo?.sentAt}`);
              
              console.log('\n🎉 INDIVIDUAL COMPONENTS WORKING!');
              console.log('================================');
              console.log('✅ Database: Working');
              console.log('✅ AI Generation: Working');
              console.log('✅ SMTP Sending: Working');
              console.log('📧 Check your email - you should have received the response!');
              
            } else {
              const sendError = await sendResponse.text();
              console.log('❌ SMTP Send Failed:');
              console.log(`   Status: ${sendResponse.status}`);
              console.log(`   Error: ${sendError}`);
            }
          } else {
            console.log('❌ No response ID generated, cannot test SMTP');
          }
          
        } else {
          const generateError = await generateResponse.text();
          console.log('❌ AI Generation Failed:');
          console.log(`   Status: ${generateResponse.status}`);
          console.log(`   Error: ${generateError}`);
        }
        
        // Step 5: Test the complete cron workflow
        console.log('\n⚙️ STEP 5: Test complete cron workflow');
        console.log('====================================');
        
        // First, reset email to unread again
        console.log('🔄 Resetting email to unread for cron test...');
        const resetForCron = await fetch(`${baseUrl}/api/email-responses/incoming`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testEmail.id,
            status: 'unread'
          })
        });
        
        if (resetForCron.ok) {
          console.log('✅ Email reset for cron test');
          
          // Now test the cron job
          console.log('🤖 Testing cron job processing...');
          const cronResponse = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (cronResponse.ok) {
            const cronData = await cronResponse.json();
            console.log('✅ Cron Job Results:');
            console.log(`   Total unread: ${cronData.stats?.totalUnread}`);
            console.log(`   Processed: ${cronData.stats?.processed}`);
            console.log(`   Auto-sent: ${cronData.stats?.autoSent}`);
            console.log(`   Drafts: ${cronData.stats?.drafts}`);
            
            if (cronData.stats?.autoSent > 0) {
              console.log('\n🎉🎉🎉 SUCCESS! CRON JOB AUTO-SENT EMAIL!');
              console.log('=========================================');
              console.log('✅ The complete automation workflow is working!');
              console.log('📧 Check your email inbox now!');
            } else {
              console.log('\n⚠️ Cron job processed but no auto-send');
              console.log('💡 This could be due to confidence threshold or other settings');
            }
          } else {
            const cronError = await cronResponse.text();
            console.log('❌ Cron Job Failed:');
            console.log(`   Status: ${cronResponse.status}`);
            console.log(`   Error: ${cronError}`);
          }
        }
        
      } else {
        console.log('❌ No emails found in database');
        console.log('💡 Send a fresh reply email to info@quasarseo.nl first');
      }
    } else {
      console.log('❌ Failed to fetch emails from database');
    }
  } catch (error) {
    console.log(`❌ Database check failed: ${error.message}`);
  }
  
  // Step 6: Check AI settings
  console.log('\n⚙️ STEP 6: Check AI settings');
  console.log('===========================');
  try {
    const settingsResponse = await fetch(`${baseUrl}/api/email-responses/settings`);
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('📋 AI Settings:');
      console.log(`   Enabled: ${settings.isEnabled}`);
      console.log(`   Auto-send threshold: ${settings.autoSendThreshold}%`);
      console.log(`   Company: ${settings.companyName}`);
      console.log(`   Sender: ${settings.senderName}`);
      console.log(`   SMTP Host: ${settings.smtpHost || 'Not set'}`);
      console.log(`   SMTP Port: ${settings.smtpPort || 'Not set'}`);
      console.log(`   OpenAI API: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
    }
  } catch (error) {
    console.log(`❌ Settings check failed: ${error.message}`);
  }
  
  console.log('\n🎯 FINAL DIAGNOSIS');
  console.log('=================');
  console.log('If individual components work but cron doesn\'t:');
  console.log('• Check Vercel cron job frequency (every 2-3 minutes)');
  console.log('• Check Vercel function logs for errors');
  console.log('• Verify email status is actually "unread"');
  console.log('• Check confidence threshold settings');
  console.log('');
  console.log('If everything works above, the system should auto-respond to new emails!');
}

debugEverything().catch(console.error); 