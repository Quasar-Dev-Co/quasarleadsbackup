#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function manualSendEmail() {
  try {
    console.log('📧 MANUAL EMAIL SEND WITH OVERRIDE');
    console.log('===================================');
    
    // Get Pravas CMP lead
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=5`);
    const leadsData = await leadsResponse.json();
    
    const targetLead = leadsData.leads.find(lead => lead.name === 'Pravas CMP');
    
    if (!targetLead) {
      console.log('❌ Could not find Pravas CMP');
      return;
    }
    
    console.log(`✅ Found: ${targetLead.name}`);
    console.log(`📧 Current emails: ${targetLead.emailHistory?.length || 0}`);
    
    // Check last email status
    const lastEmail = targetLead.emailHistory?.[targetLead.emailHistory.length - 1];
    if (lastEmail) {
      console.log(`📩 Last email: ${lastEmail.stage} - ${lastEmail.status}`);
    }
    
    // Force send the 4th email with manual override
    console.log('\n📤 Force sending called_four_times email...');
    
    const emailResponse = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: targetLead.id,
        stage: 'called_four_times',
        manual: true // Override protection
      }),
    });
    
    const emailData = await emailResponse.json();
    console.log(`📧 Email Send Result:`);
    console.log(`   Success: ${emailData.success ? '✅' : '❌'}`);
    
    if (emailData.success) {
      console.log(`   ✅ Email sent successfully!`);
      console.log(`   📧 Stage: ${emailData.stage}`);
      console.log(`   📩 Message ID: ${emailData.messageId}`);
      console.log(`   👤 Lead: ${emailData.leadName}`);
      
      // Now try to send the 5th email (called_five_times)
      console.log('\n📤 Now sending 5th email (called_five_times)...');
      
      const fifthEmailResponse = await fetch(`${BASE_URL}/api/crm/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: targetLead.id,
          stage: 'called_five_times',
          manual: false
        }),
      });
      
      const fifthEmailData = await fifthEmailResponse.json();
      console.log(`📧 5th Email Result:`);
      console.log(`   Success: ${fifthEmailData.success ? '✅' : '❌'}`);
      
      if (fifthEmailData.success) {
        console.log(`   ✅ 5th email sent successfully!`);
        console.log(`   📩 Message ID: ${fifthEmailData.messageId}`);
      } else {
        console.log(`   ❌ Error: ${fifthEmailData.error}`);
      }
      
    } else {
      console.log(`   ❌ Error: ${emailData.error}`);
    }
    
    // Check final status
    console.log('\n🔍 Final lead status...');
    const finalResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=1`);
    const finalData = await finalResponse.json();
    
    const finalLead = finalData.leads.find(l => l.name === 'Pravas CMP');
    if (finalLead) {
      console.log(`✅ Final Status:`);
      console.log(`   📧 Total emails: ${finalLead.emailHistory?.length || 0}`);
      console.log(`   🎭 Current stage: ${finalLead.emailSequenceStage}`);
      console.log(`   📊 Current step: ${finalLead.emailSequenceStep}`);
      console.log(`   ⏰ Next scheduled: ${finalLead.nextScheduledEmail ? new Date(finalLead.nextScheduledEmail).toLocaleString() : 'Completed'}`);
      
      console.log(`\n📧 Email History:`);
      if (finalLead.emailHistory) {
        finalLead.emailHistory.forEach((email, i) => {
          const emailDate = new Date(email.sentAt);
          console.log(`   ${i+1}. ${email.stage} - ${emailDate.toLocaleString()} - ${email.status} ${email.messageId ? `(${email.messageId})` : ''}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Manual send error:', error.message);
  }
}

// Run manual send
manualSendEmail(); 