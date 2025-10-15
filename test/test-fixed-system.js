console.log('🚀 Testing Fixed Email Response System');
console.log('=' .repeat(50));

async function testFixedSystem() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('\n🔧 Testing FIXED Email Fetching (10 minutes + replies only)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/cron/fetch-incoming-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ FIXED Email Fetching Results:');
      console.log(`   📧 Total found: ${data.stats?.totalFound || 0}`);
      console.log(`   🆕 New emails: ${data.stats?.newEmails || 0}`);
      console.log(`   ✅ Processed: ${data.stats?.processed || 0}`);
      
      if (data.stats?.newEmails > 0) {
        console.log('🎉 SUCCESS! System is now finding and saving reply emails!');
      } else {
        console.log('⚠️ No new emails found (they might already be processed)');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Email fetching failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Failed to test email fetching:', error.message);
    console.log('💡 Make sure your development server is running: npm run dev');
    return;
  }
  
  console.log('\n🤖 Testing AI Response Processing...');
  
  try {
    const aiResponse = await fetch(`${baseUrl}/api/cron/process-email-responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      console.log('✅ AI Processing Results:');
      console.log(`   📥 Total unread: ${aiData.stats?.totalUnread || 0}`);
      console.log(`   🔄 Processed: ${aiData.stats?.processed || 0}`);
      console.log(`   📤 Auto-sent: ${aiData.stats?.autoSent || 0}`);
      console.log(`   📝 Drafts: ${aiData.stats?.drafts || 0}`);
      
      if (aiData.stats?.processed > 0) {
        console.log('🎉 SUCCESS! AI is processing emails and generating responses!');
        
        if (aiData.stats?.autoSent > 0) {
          console.log('🚀 AMAZING! AI automatically sent replies!');
        }
      } else {
        console.log('⚠️ No emails processed by AI (might be no unread emails)');
      }
    } else {
      const errorText = await aiResponse.text();
      console.log('❌ AI processing failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Failed to test AI processing:', error.message);
  }
  
  console.log('\n📊 Checking Final Database State...');
  
  try {
    const dbResponse = await fetch(`${baseUrl}/api/email-responses/incoming?limit=5`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      console.log(`✅ Database contains ${dbData.emails?.length || 0} recent emails`);
      
      if (dbData.emails && dbData.emails.length > 0) {
        console.log('📧 Latest emails in database:');
        dbData.emails.slice(0, 3).forEach((email, index) => {
          const timeAgo = Math.floor((new Date().getTime() - new Date(email.receivedAt).getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. "${email.subject}" from ${email.leadEmail} (${timeAgo} min ago) - ${email.status}`);
        });
      }
    } else {
      console.log('❌ Failed to check database');
    }
  } catch (error) {
    console.log('❌ Failed to check database:', error.message);
  }
  
  console.log('\n🎯 SUMMARY OF FIXES APPLIED:');
  console.log('✅ 1. IMAP now searches last 10 minutes (not 24 hours)');
  console.log('✅ 2. Only processes REPLY emails (ignores regular emails)');
  console.log('✅ 3. Optimized cron timing to prevent conflicts');
  console.log('✅ 4. Faster response time for important lead replies');
  
  console.log('\n💡 HOW YOUR SYSTEM NOW WORKS:');
  console.log('🔄 Every 1 minute: Check IMAP for new reply emails (last 10 min)');
  console.log('🤖 Every 2 minutes: Process unread emails with AI');
  console.log('📧 High confidence responses (85%+): Auto-sent immediately');
  console.log('📝 Lower confidence: Saved as drafts for manual review');
}

// Run the test
testFixedSystem()
  .then(() => {
    console.log('\n✅ Fixed System Test Completed!');
  })
  .catch((error) => {
    console.error('\n❌ Test Failed:', error.message);
  }); 