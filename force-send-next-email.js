#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function forceSendNextEmail() {
  try {
    console.log('🚀 FORCE SENDING NEXT EMAIL');
    console.log('===========================');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Get the lead that needs the next email
    console.log('\n📊 Getting lead that needs next email...');
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=5`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads) {
      console.log('❌ Failed to get leads:', leadsData.error);
      return;
    }
    
    // Find Pravas CMP who needs the 5th email
    const targetLead = leadsData.leads.find(lead => 
      lead.name === 'Pravas CMP' && lead.emailAutomationEnabled
    );
    
    if (!targetLead) {
      console.log('❌ Could not find Pravas CMP with email automation');
      return;
    }
    
    console.log(`✅ Found target lead: ${targetLead.name}`);
    console.log(`   📧 Emails sent: ${targetLead.emailHistory?.length || 0}`);
    console.log(`   🎭 Current stage: ${targetLead.emailSequenceStage}`);
    console.log(`   📊 Current step: ${targetLead.emailSequenceStep}`);
    
    // Determine next email stage
    const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    const emailHistory = targetLead.emailHistory || [];
    const emailsSentCount = emailHistory.filter(email => email.status === 'sent').length;
    const nextEmailStep = emailsSentCount + 1;
    const nextStage = stages[nextEmailStep - 1];
    
    console.log(`\n🎯 Next email should be: ${nextStage} (Step ${nextEmailStep})`);
    
    if (nextEmailStep > 7) {
      console.log('✅ Email sequence already completed!');
      return;
    }
    
    // Force trigger email automation
    console.log('\n🤖 Force triggering email automation...');
    const cronResponse = await fetch(`${BASE_URL}/api/cron/email-automation`, {
      method: 'GET'
    });
    
    const cronData = await cronResponse.json();
    console.log(`📋 Email Automation Result:`);
    console.log(`   Success: ${cronData.success ? '✅' : '❌'}`);
    console.log(`   Emails sent: ${cronData.results?.emailsSent || 0}`);
    console.log(`   Errors: ${cronData.results?.errors || 0}`);
    console.log(`   Total processed: ${cronData.results?.totalLeads || 0}`);
    
    if (cronData.results?.details && cronData.results.details.length > 0) {
      console.log(`\n📋 Detailed Results:`);
      cronData.results.details.forEach(detail => {
        console.log(`   - ${detail.leadName}: ${detail.action}`);
        if (detail.error) {
          console.log(`     ❌ Error: ${detail.error}`);
        }
        if (detail.messageId) {
          console.log(`     ✅ Message ID: ${detail.messageId}`);
        }
      });
    }
    
    // If no emails were sent, try to manually send via the direct email endpoint
    if (cronData.results?.emailsSent === 0) {
      console.log('\n📤 Attempting manual email send...');
      
      const manualEmailResponse = await fetch(`${BASE_URL}/api/crm/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: targetLead.id,
          stage: nextStage,
          manual: false
        }),
      });
      
      const manualEmailData = await manualEmailResponse.json();
      console.log(`📧 Manual Email Result:`);
      console.log(`   Success: ${manualEmailData.success ? '✅' : '❌'}`);
      
      if (manualEmailData.success) {
        console.log(`   ✅ Email sent successfully!`);
        console.log(`   📧 Stage: ${manualEmailData.stage}`);
        console.log(`   📩 Message ID: ${manualEmailData.messageId}`);
      } else {
        console.log(`   ❌ Error: ${manualEmailData.error}`);
      }
    }
    
    // Get updated lead status
    console.log('\n🔍 Checking updated lead status...');
    const updatedLeadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=1`);
    const updatedLeadsData = await updatedLeadsResponse.json();
    
    if (updatedLeadsData.success && updatedLeadsData.leads[0]) {
      const updatedLead = updatedLeadsData.leads.find(l => l.name === 'Pravas CMP');
      if (updatedLead) {
        console.log(`✅ Updated Lead Status:`);
        console.log(`   📧 Emails sent: ${updatedLead.emailHistory?.length || 0}`);
        console.log(`   🎭 Current stage: ${updatedLead.emailSequenceStage}`);
        console.log(`   📊 Current step: ${updatedLead.emailSequenceStep}`);
        console.log(`   ⏰ Next scheduled: ${updatedLead.nextScheduledEmail ? new Date(updatedLead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
        
        if (updatedLead.emailHistory && updatedLead.emailHistory.length > 0) {
          console.log(`   📧 Latest email history:`);
          const latestEmails = updatedLead.emailHistory.slice(-2);
          latestEmails.forEach((email, i) => {
            const emailDate = new Date(email.sentAt);
            console.log(`      ${updatedLead.emailHistory.length - latestEmails.length + i + 1}. ${email.stage} - ${emailDate.toLocaleString()} - ${email.status}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Force send error:', error.message);
  }
}

// Run the force send
forceSendNextEmail(); 