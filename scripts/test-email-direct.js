#!/usr/bin/env node

async function testEmailDirect() {
  try {
    console.log('📧 TESTING EMAIL SERVICE DIRECTLY');
    console.log('=================================');
    
    const baseUrl = 'https://text-gpt-test.vercel.app';
    
    // Get the lead first
    const leadsResponse = await fetch(`${baseUrl}/api/leads`);
    const leadsData = await leadsResponse.json();
    const pravasLead = leadsData.leads?.find(lead => 
      lead.name?.includes('Pravas') || lead.email?.includes('pravas')
    );
    
    if (!pravasLead) {
      console.log('❌ Lead not found');
      return;
    }
    
    console.log(`📧 Testing email to: ${pravasLead.email}`);
    
    // Try sending email directly using CRM email send API
    console.log('\n🚀 Sending test email via CRM API...');
    
    const emailResponse = await fetch(`${baseUrl}/api/crm/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leadId: pravasLead._id,
        stage: 'called_twice',
        manual: true
      })
    });
    
    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      console.log('✅ Email API Response:');
      console.log(JSON.stringify(emailResult, null, 2));
      
      if (emailResult.success) {
        console.log('\n🎉 EMAIL SENT SUCCESSFULLY!');
        console.log('📧 Check your inbox for the test email');
        console.log('⚡ This proves the email service is working');
        console.log('🔧 The issue was with the automation logic, not email service');
      } else {
        console.log('\n❌ Email sending failed:');
        console.log(emailResult.error);
        
        console.log('\n💡 Common email issues:');
        console.log('1. Gmail App Password incorrect');
        console.log('2. SMTP settings wrong');
        console.log('3. Email service not configured');
        console.log('4. Vercel environment variables missing');
      }
    } else {
      const errorText = await emailResponse.text();
      console.log('❌ Email API call failed:', errorText);
      
      if (emailResponse.status === 404) {
        console.log('💡 The send-email API endpoint does not exist');
        console.log('🔧 Let me try a different approach...');
        
        // Try the test email template API
        console.log('\n🧪 Trying test email template API...');
        
        const testResponse = await fetch(`${baseUrl}/api/test-email-template`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipientEmail: pravasLead.email,
            recipientName: pravasLead.name,
            companyName: pravasLead.company || 'Your Company',
            stage: 'called_twice'
          })
        });
        
        if (testResponse.ok) {
          const testResult = await testResponse.json();
          console.log('📧 Test email result:', testResult);
          
          if (testResult.success) {
            console.log('\n🎉 TEST EMAIL SENT!');
          } else {
            console.log('\n❌ Test email failed:', testResult.error);
          }
        } else {
          console.log('❌ Test email API also failed');
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

console.log('🧪 DIRECT EMAIL SERVICE TEST');
console.log('============================');
testEmailDirect(); 