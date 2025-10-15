import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import { emailService } from '@/lib/emailService';

// Helper function to get email timing settings from your email prompting system
async function getEmailTimingSettings() {
  try {
    const connection = await dbConnect();
    const db = connection.connection.db;
    const settingsCollection = db.collection('companySettings');
    
    const settings = await settingsCollection.findOne({ type: 'default' });
    
    if (settings?.emailTimings) {
      console.log('✅ Loaded timing settings from database');
      return settings.emailTimings;
    }
    
    // Return fallback timings
    console.log('⚠️ No timing settings found, using fallback');
    return [
      { stage: 'called_once', delay: 0, unit: 'minutes', description: 'Send immediately' },
      { stage: 'called_twice', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_three_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_four_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_five_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_six_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_seven_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' }
    ];
  } catch (error) {
    console.error('Error loading email timing settings:', error);
    return [
      { stage: 'called_once', delay: 0, unit: 'minutes', description: 'Send immediately' },
      { stage: 'called_twice', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_three_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_four_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_five_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_six_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_seven_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' }
    ];
  }
}

// Helper function to calculate next email date based on YOUR timing settings
function calculateNextEmailDate(timingSettings: any[], stage: string, baseTime: Date): Date {
  const timing = timingSettings.find(t => t.stage === stage);
  
  if (!timing) {
    console.log(`⚠️ No timing found for stage ${stage}, using 5 minutes default`);
    return new Date(baseTime.getTime() + (5 * 60 * 1000));
  }
  
  const nextEmailDate = new Date(baseTime);
  
  switch (timing.unit) {
    case 'minutes':
      nextEmailDate.setMinutes(nextEmailDate.getMinutes() + timing.delay);
      break;
    case 'hours':
      nextEmailDate.setHours(nextEmailDate.getHours() + timing.delay);
      break;
    case 'days':
      nextEmailDate.setDate(nextEmailDate.getDate() + timing.delay);
      break;
    default:
      // Default to minutes if unit is unclear
      nextEmailDate.setMinutes(nextEmailDate.getMinutes() + (timing.delay || 5));
  }
  
  console.log(`⏰ ${stage}: ${timing.delay} ${timing.unit} = ${nextEmailDate.toISOString()}`);
  return nextEmailDate;
}

/**
 * POST - IMPROVED Fix email automation now
 * This endpoint manually fixes and sends overdue emails immediately
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 MANUAL EMAIL AUTOMATION FIX STARTING');
    console.log('=========================================');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    await dbConnect();
    
    // Load timing settings
    const timingSettings = await getEmailTimingSettings();
    console.log(`✅ Loaded ${timingSettings.length} timing configurations`);
    
    // Find leads that have automation issues
    const targetLeads = await Lead.find({
      emailAutomationEnabled: true,
      emailSequenceActive: true,
      email: { $exists: true, $ne: '' }
    });
    
    console.log(`🎯 Found ${targetLeads.length} leads with active automation`);
    
    if (targetLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads with active automation found",
        results: {
          totalLeads: 0,
          emailsSent: 0,
          leadsFixed: 0,
          errors: 0
        }
      });
    }
    
    let emailsSent = 0;
    let leadsFixed = 0;
    let errors = 0;
    const results: any[] = [];
    
    const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    
    for (const lead of targetLeads) {
      try {
        console.log(`\n🔧 Processing: ${lead.name} (${lead.email})`);
        
        const emailHistory = lead.emailHistory || [];
        const emailsSentCount = emailHistory.filter((e: any) => e.status === 'sent').length;
        
        console.log(`   Current state: ${emailsSentCount} emails actually sent, automation active: ${lead.emailSequenceActive}`);
        
        // Calculate what step we should be at
        const correctStep = emailsSentCount + 1;
        
        if (correctStep > 7) {
          console.log(`   ✅ Lead completed (${emailsSentCount}/7 emails sent)`);
          
          // Mark as completed
          await Lead.findByIdAndUpdate(lead._id, {
            $set: {
              emailSequenceActive: false,
              emailStoppedReason: 'Sequence completed (7 emails sent)',
              nextScheduledEmail: null,
              updatedAt: new Date()
            }
          });
          
          results.push({
            leadName: lead.name,
            email: lead.email,
            status: 'completed',
            emailsSent: emailsSentCount
          });
          
          continue;
        }
        
        const currentStage = stages[correctStep - 1];
        
        console.log(`   🎯 Should be at step ${correctStep} (${currentStage})`);
        
        // Check if this email was already sent recently (prevent duplicates)
        const recentlySent = emailHistory.find((email: any) => 
          email.stage === currentStage && 
          email.status === 'sent' &&
          new Date(email.sentAt).getTime() > (Date.now() - 2 * 60 * 60 * 1000) // 2 hours
        );
        
        if (recentlySent) {
          console.log(`   ⏭️ Email for ${currentStage} already sent recently, fixing automation state`);
          
          // Fix automation state for next time
          const nextStep = correctStep + 1;
          const isLastEmail = nextStep > 7;
          const nextStage = isLastEmail ? null : stages[nextStep - 1];
          const nextEmailTime = isLastEmail ? null : calculateNextEmailDate(timingSettings, nextStage!, new Date());
          
          await Lead.findByIdAndUpdate(lead._id, {
            $set: {
              stage: currentStage, // Fix CRM stage display
              emailAutomationEnabled: true,
              emailSequenceActive: !isLastEmail,
              emailSequenceStep: isLastEmail ? 7 : nextStep,
              emailSequenceStage: nextStage,
              nextScheduledEmail: nextEmailTime,
              updatedAt: new Date()
            }
          });
          
          results.push({
            leadName: lead.name,
            email: lead.email,
            status: 'automation_fixed',
            currentStep: correctStep,
            stage: currentStage,
            nextEmailScheduled: nextEmailTime?.toISOString() || 'completed'
          });
          
          leadsFixed++;
          continue;
        }
        
        // SEND THE EMAIL NOW
        console.log(`   📤 Sending email for stage: ${currentStage}`);
        
        const emailResult = await emailService.sendStageEmail({
          name: lead.name,
          email: lead.email,
          company: lead.company || 'Your Company',
          stage: currentStage
        });
        
        if (emailResult.success) {
          console.log(`   ✅ Email sent successfully! Message ID: ${emailResult.messageId}`);
          
          // Update lead with email record and fix automation
          const emailRecord = {
            stage: currentStage,
            sentAt: new Date(),
            messageId: emailResult.messageId,
            status: 'sent',
            manual: false
          };
          
          const isLastEmail = correctStep >= 7;
          const nextStep = correctStep + 1;
          const nextStage = isLastEmail ? null : stages[nextStep - 1];
          
          // Calculate NEXT email timing based on when we just sent this one
          const nextEmailScheduledTime = isLastEmail ? null : calculateNextEmailDate(timingSettings, nextStage!, new Date());

          await Lead.findByIdAndUpdate(lead._id, {
            $push: { emailHistory: emailRecord },
            $set: {
              stage: currentStage, // Fix CRM stage display (show the stage we just completed)
              emailAutomationEnabled: true,
              emailSequenceActive: !isLastEmail,
              emailSequenceStep: isLastEmail ? 7 : nextStep,
              emailSequenceStage: nextStage,
              nextScheduledEmail: nextEmailScheduledTime, // Schedule NEXT email properly
              emailStoppedReason: isLastEmail ? 'Sequence completed (7 emails sent)' : null,
              lastEmailedAt: new Date(), // Use actual send time
              updatedAt: new Date()
            }
          });
          
          results.push({
            leadName: lead.name,
            email: lead.email,
            status: 'email_sent',
            currentStep: correctStep,
            stage: currentStage,
            messageId: emailResult.messageId,
            nextEmailScheduled: nextEmailScheduledTime?.toISOString() || 'completed'
          });
          
          emailsSent++;
          leadsFixed++;
          
        } else {
          console.log(`   ❌ Email failed: ${emailResult.error}`);
          
          // Mark email as failed but keep automation active for retry
          await Lead.findByIdAndUpdate(lead._id, {
            $push: {
              emailHistory: {
                stage: currentStage,
                sentAt: new Date(),
                status: 'failed',
                manual: false,
                error: emailResult.error
              }
            },
            $set: {
              emailAutomationEnabled: true,
              emailSequenceActive: true,
              nextScheduledEmail: new Date(Date.now() + 10 * 60 * 1000), // Retry in 10 minutes
              updatedAt: new Date()
            }
          });
          
          results.push({
            leadName: lead.name,
            email: lead.email,
            status: 'email_failed',
            error: emailResult.error,
            retryAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          });
          
          errors++;
        }
        
        // Small delay between emails to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (leadError: any) {
        console.error(`💥 Error processing ${lead.name}:`, leadError);
        errors++;
        
        results.push({
          leadName: lead.name,
          email: lead.email,
          status: 'error',
          error: leadError.message
        });
      }
    }
    
    console.log(`\n🎉 MANUAL FIX COMPLETE:`);
    console.log(`   📧 Emails sent: ${emailsSent}`);
    console.log(`   🔧 Leads fixed: ${leadsFixed}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${targetLeads.length}`);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${leadsFixed} leads: ${emailsSent} emails sent`,
      processedAt: new Date().toISOString(),
      results: {
        totalLeads: targetLeads.length,
        emailsSent,
        leadsFixed,
        errors,
        details: results
      }
    });
    
  } catch (error: any) {
    console.error('💥 Manual fix error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fix email automation',
        processedAt: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 