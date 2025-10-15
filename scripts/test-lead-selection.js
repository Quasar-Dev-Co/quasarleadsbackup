const fetch = require('node-fetch'); // For Node.js environments
// For browser environments, fetch is already available

const BASE_URL = 'http://localhost:3001'; // Use port 3001 as shown in logs

async function testLeadSelectionToEmailQueue() {
  console.log('🚀 Testing Lead Selection to Email Queue Functionality\n');
  
  // You'll need to replace this with an actual lead ID from your database
  const sampleLeadId = '6763f8e8f47c123456789abc'; // Replace with real lead ID
  
  try {
    console.log('📧 Test 1: Moving lead to email queue (called_once stage)');
    const moveToEmailQueueResponse = await fetch(`${BASE_URL}/api/crm/leads`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: sampleLeadId,
        stage: 'called_once',
        notes: 'Test: Added to email queue via lead selection'
      })
    });
    
    const moveResult = await moveToEmailQueueResponse.json();
    console.log('Result:', moveResult.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', moveResult.message || moveResult.error);
    console.log('');
    
    if (moveResult.success) {
      console.log('📤 Test 2: Sending first email immediately');
      const sendEmailResponse = await fetch(`${BASE_URL}/api/crm/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: sampleLeadId,
          stage: 'called_once',
          manual: false
        })
      });
      
      const emailResult = await sendEmailResponse.json();
      console.log('Result:', emailResult.success ? '✅ SUCCESS' : '❌ FAILED');
      console.log('Message:', emailResult.message || emailResult.error);
      console.log('');
    }
    
    console.log('🎉 Test Summary:');
    console.log('✅ Lead should be moved from "active" to "emailed" status');
    console.log('✅ Email automation should be enabled and active');
    console.log('✅ First email should be sent immediately');
    console.log('✅ Subsequent emails scheduled for 7-day intervals');
    console.log('✅ Lead should appear in "Processing Leads" tab');
    console.log('✅ Lead should be visible in CRM system');
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.log('\n📝 Setup Instructions:');
    console.log('1. Make sure your development server is running on localhost:3001');
    console.log('2. Update the sampleLeadId with a real lead ID from your database');
    console.log('3. Ensure Gmail is configured for email sending');
    console.log('4. Check that the lead has a valid email address');
  }
}

async function checkLeadStatus(leadId) {
  console.log('\n🔍 Checking Lead Status After Email Queue Addition...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/crm/leads?page=1&limit=100`);
    const data = await response.json();
    
    if (data.success && data.leads) {
      const lead = data.leads.find(l => l._id === leadId);
      
      if (lead) {
        console.log('📊 Lead Status:');
        console.log(`- Name: ${lead.name}`);
        console.log(`- Email: ${lead.email}`);
        console.log(`- Status: ${lead.status}`);
        console.log(`- Stage: ${lead.stage || 'N/A'}`);
        console.log(`- Email Automation Enabled: ${lead.emailAutomationEnabled}`);
        console.log(`- Email Sequence Active: ${lead.emailSequenceActive}`);
        console.log(`- Email Sequence Step: ${lead.emailSequenceStep || 'N/A'}`);
        console.log(`- Next Scheduled Email: ${lead.nextScheduledEmail || 'N/A'}`);
        console.log(`- Email History Count: ${lead.emailHistory?.length || 0}`);
        
        if (lead.emailHistory && lead.emailHistory.length > 0) {
          console.log('\n📧 Email History:');
          lead.emailHistory.forEach((email, index) => {
            console.log(`  ${index + 1}. Stage: ${email.stage}, Sent: ${new Date(email.sentAt).toLocaleString()}, Status: ${email.status}, Manual: ${email.manual}`);
          });
        }
      } else {
        console.log('❌ Lead not found');
      }
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

// Run the tests
testLeadSelectionToEmailQueue()
  .then(() => {
    console.log('\n✅ Lead selection to email queue test completed!');
    console.log('\n💡 Next Steps:');
    console.log('1. Check your email inbox for the first email');
    console.log('2. Verify the lead appears in "Processing Leads" tab');
    console.log('3. Check CRM system for the lead status');
    console.log('4. Verify email automation is active');
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
  });

module.exports = {
  testLeadSelectionToEmailQueue,
  checkLeadStatus
}; 