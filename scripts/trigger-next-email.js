#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

async function triggerNextEmail() {
  try {
    console.log('🚀 Manually triggering next email...');
    
    // Get the current lead
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=1`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads || leadsData.leads.length === 0) {
      console.log('❌ No leads found');
      return;
    }
    
    const lead = leadsData.leads[0];
    console.log(`📧 Current lead: ${lead.name} (${lead.email})`);
    console.log(`📊 Current step: ${lead.emailSequenceStep || 1}, stage: ${lead.emailSequenceStage}`);
    console.log(`📅 Current next email: ${lead.nextScheduledEmail ? new Date(lead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
    console.log(`📧 Emails sent so far: ${lead.emailHistory?.length || 0}`);
    
    if (!lead.emailSequenceActive) {
      console.log('❌ Email automation is not active for this lead');
      return;
    }
    
    // Calculate the next stage based on current step
    const stageNames = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    const currentStep = lead.emailSequenceStep || 1;
    const nextStage = stageNames[currentStep]; // This should be the next stage
    
    if (!nextStage) {
      console.log('❌ No next stage available - sequence may be complete');
      return;
    }
    
    console.log(`📤 Manually sending email for stage: ${nextStage} (step ${currentStep + 1})`);
    
    // Send manual email for the next stage
    const emailResponse = await fetch(`${BASE_URL}/api/crm/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: lead.id,
        stage: nextStage,
        manual: false // Mark as automated, not manual
      }),
    });
    
    const emailData = await emailResponse.json();
    console.log('📋 Email send result:', emailData);
    
    if (emailData.success) {
      console.log('✅ Email sent successfully!');
      
      // Now update the lead to the next step and schedule the following email for 5 minutes
      console.log('🔄 Updating lead sequence...');
      
      const updateResponse = await fetch(`${BASE_URL}/api/crm/leads`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          stage: nextStage, // Move to next stage
          notes: `Automated email sent for ${nextStage}`
        }),
      });
      
      const updateData = await updateResponse.json();
      console.log('📋 Update result:', updateData);
      
      // Check final status
      console.log('\n🔍 Checking final status...');
      const finalResponse = await fetch(`${BASE_URL}/api/crm/leads?leadId=${lead.id}`);
      const finalData = await finalResponse.json();
      
      if (finalData.success && finalData.lead) {
        const finalLead = finalData.lead;
        console.log(`📧 Final lead status: ${finalLead.name}`);
        console.log(`📊 Step: ${finalLead.emailSequenceStep}, Stage: ${finalLead.emailSequenceStage}`);
        console.log(`📅 Next email: ${finalLead.nextScheduledEmail ? new Date(finalLead.nextScheduledEmail).toLocaleString() : 'N/A'}`);
        console.log(`📧 Total emails sent: ${finalLead.emailHistory?.length || 0}`);
        console.log(`🔄 Active: ${finalLead.emailSequenceActive}`);
        
        if (finalLead.emailHistory && finalLead.emailHistory.length > 0) {
          const lastEmail = finalLead.emailHistory[finalLead.emailHistory.length - 1];
          console.log(`📮 Last email: ${lastEmail.stage} at ${new Date(lastEmail.sentAt).toLocaleString()}`);
        }
      }
      
      console.log('\n🎯 Now the continuous automation should pick up the 5-minute intervals!');
      
    } else {
      console.log('❌ Failed to send email:', emailData.error);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

triggerNextEmail(); 