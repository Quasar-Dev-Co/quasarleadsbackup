#!/usr/bin/env node

/**
 * Smart Email Automation - Uses YOUR configured timing settings
 * This script reads your timing configuration and applies it properly
 */

const BASE_URL = 'http://localhost:3000';

async function getEmailTimingSettings() {
  try {
    const response = await fetch(`${BASE_URL}/api/company-settings`);
    const data = await response.json();
    
    if (data.success && data.settings?.emailTimings) {
      return data.settings.emailTimings;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading timing settings:', error.message);
    return [];
  }
}

function calculateNextEmailTime(timingSettings, stage) {
  const timing = timingSettings.find(t => t.stage === stage);
  
  if (!timing) {
    console.log(`⚠️ No timing found for stage: ${stage}, using 5 minutes default`);
    const nextTime = new Date();
    nextTime.setMinutes(nextTime.getMinutes() + 5);
    return nextTime;
  }
  
  const nextTime = new Date();
  
  switch (timing.unit) {
    case 'minutes':
      nextTime.setMinutes(nextTime.getMinutes() + timing.delay);
      break;
    case 'hours':
      nextTime.setHours(nextTime.getHours() + timing.delay);
      break;
    case 'days':
      nextTime.setDate(nextTime.getDate() + timing.delay);
      break;
    default:
      nextTime.setMinutes(nextTime.getMinutes() + timing.delay);
  }
  
  console.log(`⏰ Next email for ${stage}: ${timing.delay} ${timing.unit} = ${nextTime.toLocaleTimeString()}`);
  return nextTime;
}

async function runSmartEmailAutomation() {
  try {
    console.log('🧠 Smart Email Automation - Using YOUR Timing Settings');
    console.log('='.repeat(60));
    
    // Load your timing settings
    console.log('📋 Loading your timing configuration...');
    const timingSettings = await getEmailTimingSettings();
    
    if (timingSettings.length === 0) {
      console.log('❌ No timing settings found');
      return;
    }
    
    console.log(`✅ Loaded ${timingSettings.length} timing configurations:`);
    timingSettings.forEach(timing => {
      console.log(`   ${timing.stage}: ${timing.delay} ${timing.unit}`);
    });
    console.log('');
    
    // Get lead with active automation
    const leadsResponse = await fetch(`${BASE_URL}/api/crm/leads?limit=10`);
    const leadsData = await leadsResponse.json();
    
    if (!leadsData.success || !leadsData.leads) {
      console.log('❌ Failed to get leads');
      return;
    }
    
    let activeLead = leadsData.leads.find(lead => lead.emailSequenceActive);
    
    if (!activeLead) {
      console.log('📧 No lead with active automation found. Starting automation...');
      
      // Start automation for first lead
      const firstLead = leadsData.leads[0];
      if (!firstLead) {
        console.log('❌ No leads available');
        return;
      }
      
      console.log(`🚀 Starting automation for: ${firstLead.name} (${firstLead.email})`);
      
      const startResponse = await fetch(`${BASE_URL}/api/crm/email-automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: firstLead.id,
          action: 'start',
          stage: firstLead.stage || 'called_once'
        })
      });
      
      const startData = await startResponse.json();
      console.log('📋 Automation start result:', startData.success ? '✅ Success' : '❌ Failed');
      
      if (!startData.success) {
        console.log('Error:', startData.error);
        return;
      }
      
      // Wait and get updated lead
      await new Promise(resolve => setTimeout(resolve, 2000));
      const updatedResponse = await fetch(`${BASE_URL}/api/crm/leads?leadId=${firstLead.id}`);
      const updatedData = await updatedResponse.json();
      activeLead = updatedData.lead;
    }
    
    if (!activeLead) {
      console.log('❌ Could not get active lead');
      return;
    }
    
    console.log(`📧 Active lead: ${activeLead.name} (${activeLead.email})`);
    console.log(`📊 Current step: ${activeLead.emailSequenceStep}, stage: ${activeLead.emailSequenceStage}`);
    console.log(`📧 Emails sent: ${activeLead.emailHistory?.length || 0}`);
    console.log('');
    
    // Continuous monitoring and processing
    console.log('🔄 Starting continuous email automation monitoring...');
    console.log('💡 This will check every 30 seconds and send emails based on YOUR timing settings');
    console.log('⏹️  Press Ctrl+C to stop');
    console.log('');
    
    const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    
    setInterval(async () => {
      try {
        console.log(`🕒 ${new Date().toLocaleTimeString()} - Checking for pending emails...`);
        
        // Try the dev automation endpoint
        const automationResponse = await fetch(`${BASE_URL}/api/dev-email-automation`);
        const automationData = await automationResponse.json();
        
        if (automationData.success) {
          const { emailsSent, totalLeads } = automationData.results;
          
          if (emailsSent > 0) {
            console.log(`✅ ${emailsSent} email(s) sent!`);
            
            if (automationData.results.details) {
              automationData.results.details.forEach(detail => {
                if (detail.success) {
                  console.log(`   📤 ${detail.leadName}: ${detail.stage} (Step ${detail.step}/7)`);
                  if (detail.nextEmailDate) {
                    console.log(`   ⏰ Next email: ${new Date(detail.nextEmailDate).toLocaleString()}`);
                  }
                }
              });
            }
          } else if (totalLeads === 0) {
            console.log(`ℹ️  No emails scheduled at this time`);
          }
        }
        
      } catch (error) {
        console.error('💥 Error in automation cycle:', error.message);
      }
    }, 30000); // Check every 30 seconds
    
  } catch (error) {
    console.error('💥 Setup Error:', error.message);
  }
}

// Start the smart automation
runSmartEmailAutomation().catch(console.error); 