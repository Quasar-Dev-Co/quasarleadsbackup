import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { Lead } from '@/models/leadSchema';
import EmailTemplate from '@/models/emailTemplateSchema';

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json({
        success: false,
        error: 'Lead ID is required'
      }, { status: 400 });
    }

    await dbConnect();

    // Find the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({
        success: false,
        error: 'Lead not found'
      }, { status: 404 });
    }

    // Check if lead has active email automation
    if (!lead.emailSequenceActive) {
      return NextResponse.json({
        success: false,
        error: 'Lead does not have active email automation'
      }, { status: 400 });
    }

    // Get current stage
    const currentStage = lead.emailSequenceStage || 'called_once';
    
    // For refresh, we always use the current stage template
    // because we're updating timing for the email that's about to be sent
    const stageToSend = currentStage;
    
    // Get the email template for the stage we're about to send
    const template = await EmailTemplate.findOne({ 
      stage: stageToSend, 
      isActive: true 
    });

    if (!template) {
      return NextResponse.json({
        success: false,
        error: `No active template found for stage: ${stageToSend}`
      }, { status: 404 });
    }

    console.log(`🔍 Lead ${lead.name}:`);
    console.log(`  - Current stage: ${currentStage}`);
    console.log(`  - Stage to send: ${stageToSend}`);
    console.log(`  - Email status: ${lead.emailStatus}`);
    console.log(`  - Template found: ${template ? 'YES' : 'NO'}`);
    console.log(`  - Template timing: ${template.timing?.delay} ${template.timing?.unit}`);
    console.log(`  - Template stage: ${template.stage}`);

    // Calculate new nextScheduledEmail based on template timing
    const now = new Date();
    let nextScheduledEmail = now;

    if (template.timing && template.timing.delay !== undefined && template.timing.unit) {
      const delayMs = convertTimingToMs(template.timing.delay, template.timing.unit);
      
      console.log(`  - Delay: ${template.timing.delay} ${template.timing.unit}`);
      console.log(`  - Delay in MS: ${delayMs}`);
      
      // When refreshing timing, we always calculate from NOW
      // This allows users to change timing mid-sequence
      if (template.timing.delay === 0) {
        nextScheduledEmail = now; // Send immediately
      } else {
        nextScheduledEmail = new Date(now.getTime() + delayMs);
      }
      
      console.log(`⏰ Calculated next email time: ${nextScheduledEmail.toISOString()} (delay: ${template.timing.delay} ${template.timing.unit} from now)`);
    } else {
      console.log(`⚠️ No valid timing found, setting to send immediately`);
      nextScheduledEmail = now; // Fallback: send immediately
    }

    // Update the lead with new timing
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        $set: {
          nextScheduledEmail: nextScheduledEmail,
          emailStatus: 'ready', // Reset to ready status
          updatedAt: now
        }
      },
      { new: true }
    );

    console.log(`🔄 Refreshed timing for lead ${lead.name} (${lead.email}): Next email scheduled for ${nextScheduledEmail.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Lead timing refreshed successfully',
      data: {
        leadId: leadId,
        leadName: lead.name,
        currentStage: currentStage,
        stageToSend: stageToSend,
        previousSchedule: lead.nextScheduledEmail,
        newSchedule: nextScheduledEmail,
        timingSettings: template.timing,
        emailStatus: lead.emailStatus
      }
    });

  } catch (error: any) {
    console.error('❌ Error refreshing lead timing:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to refresh lead timing'
    }, { status: 500 });
  }
}

// Helper function to get next stage in sequence
function getNextStage(currentStage: string): string | null {
  const stageFlow: { [key: string]: string | null } = {
    'called_once': 'called_twice',
    'called_twice': 'called_three_times',
    'called_three_times': 'called_four_times',
    'called_four_times': 'called_five_times',
    'called_five_times': 'called_six_times',
    'called_six_times': 'called_seven_times',
    'called_seven_times': null // End of sequence
  };
  return stageFlow[currentStage] || null;
}

// Helper function to convert timing to milliseconds
function convertTimingToMs(delay: number, unit: string): number {
  console.log(`🔧 Converting timing: ${delay} ${unit}`);
  let ms;
  switch (unit) {
    case 'minutes':
      ms = delay * 60 * 1000;
      break;
    case 'hours':
      ms = delay * 60 * 60 * 1000;
      break;
    case 'days':
      ms = delay * 24 * 60 * 60 * 1000;
      break;
    default:
      console.log(`⚠️ Unknown unit: ${unit}, defaulting to minutes`);
      ms = delay * 60 * 1000; // Default to minutes
  }
  console.log(`🔧 Result: ${ms}ms (${ms / 1000 / 60} minutes)`);
  return ms;
} 