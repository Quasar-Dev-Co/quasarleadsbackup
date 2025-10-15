import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue from '@/models/jobQueueSchema';
import Lead from '@/models/leadSchema';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get email timing settings
async function getEmailTimingSettings() {
  try {
    const connection = await dbConnect();
    const db = connection.connection.db;
    const settingsCollection = db.collection('companySettings');
    
    const settings = await settingsCollection.findOne({ type: 'default' });
    
    if (settings?.emailTimings) {
      return settings.emailTimings;
    }
    
    // Return default timings
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
    return [];
  }
}

// Helper function to calculate next email date
function calculateEmailDate(timingSettings: any[], stage: string, baseTime: Date): Date {
  const timing = timingSettings.find(t => t.stage === stage);
  
  if (!timing) {
    return new Date(baseTime.getTime() + (5 * 60 * 1000)); // Default 5 minutes
  }
  
  const emailDate = new Date(baseTime);
  
  switch (timing.unit) {
    case 'minutes':
      emailDate.setMinutes(emailDate.getMinutes() + timing.delay);
      break;
    case 'hours':
      emailDate.setHours(emailDate.getHours() + timing.delay);
      break;
    case 'days':
      emailDate.setDate(emailDate.getDate() + timing.delay);
      break;
    default:
      emailDate.setMinutes(emailDate.getMinutes() + (timing.delay || 5));
  }
  
  return emailDate;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { leadId, startStage } = body;
    
    if (!leadId || !startStage) {
      return NextResponse.json({
        success: false,
        error: 'Lead ID and start stage are required'
      }, { status: 400 });
    }
    
    // Get the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({
        success: false,
        error: 'Lead not found'
      }, { status: 404 });
    }
    
    // Check if lead already has an active email sequence job
    const existingJob = await JobQueue.findOne({
      leadId: leadId,
      type: 'email-sequence',
      status: { $in: ['pending', 'running'] }
    });
    
    if (existingJob) {
      return NextResponse.json({
        success: false,
        error: 'Lead already has an active email sequence job'
      }, { status: 400 });
    }
    
    // Get timing settings
    const timingSettings = await getEmailTimingSettings();
    
    // Create complete email schedule (all 7 emails)
    const stages = [
      'called_once', 'called_twice', 'called_three_times', 
      'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'
    ];
    
    const emailSchedule = [];
    const startTime = new Date();
    
    // First email: 10 seconds from now (immediate)
    const firstEmailTime = new Date(startTime.getTime() + 10 * 1000);
    emailSchedule.push({
      step: 1,
      stage: stages[0],
      scheduledAt: firstEmailTime,
      status: 'pending'
    });
    
    // Subsequent emails based on timing config
    let lastEmailTime = firstEmailTime;
    for (let i = 1; i < 7; i++) {
      const emailTime = calculateEmailDate(timingSettings, stages[i], lastEmailTime);
      emailSchedule.push({
        step: i + 1,
        stage: stages[i],
        scheduledAt: emailTime,
        status: 'pending'
      });
      lastEmailTime = emailTime;
    }
    
    // Create job ID
    const jobId = uuidv4();
    
    // Create email sequence job
    const job = new JobQueue({
      jobId,
      type: 'email-sequence',
      status: 'pending',
      priority: 10, // High priority for email sequences
      services: [], // Not applicable for email jobs
      locations: [], // Not applicable for email jobs
      leadQuantity: 0, // Not applicable for email jobs
      currentService: '',
      currentLocation: '',
      currentStep: 1,
      totalSteps: 7, // 7 emails
      progress: 0,
      progressMessage: `Email sequence queued for ${lead.name}: 7 emails scheduled`,
      collectedLeads: 0,
      totalLeadsCollected: 0,
      retryCount: 0,
      maxRetries: 3,
      estimatedDuration: Math.round((lastEmailTime.getTime() - startTime.getTime()) / (1000 * 60)), // Duration in minutes
      leadId: leadId,
      emailSchedule: emailSchedule,
      nextEmailDue: firstEmailTime,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await job.save();
    
    // Update lead with automation status
    await Lead.findByIdAndUpdate(leadId, {
      $set: {
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: startStage,
        emailSequenceStartDate: new Date(),
        emailSequenceStep: 1,
        nextScheduledEmail: firstEmailTime,
        emailStoppedReason: null,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Email sequence job created for ${lead.name}: ${emailSchedule.length} emails scheduled`);
    console.log(`🚀 First email in 10 seconds, sequence completes in ${Math.round((lastEmailTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes`);
    
    return NextResponse.json({
      success: true,
      job: {
        jobId: job.jobId,
        leadName: lead.name,
        leadEmail: lead.email,
        totalEmails: emailSchedule.length,
        firstEmailAt: firstEmailTime,
        lastEmailAt: lastEmailTime,
        estimatedDuration: job.estimatedDuration,
        emailSchedule: emailSchedule.map(email => ({
          step: email.step,
          stage: email.stage,
          scheduledAt: email.scheduledAt,
          status: email.status
        }))
      },
      message: `Email sequence created: ${emailSchedule.length} emails scheduled for ${lead.name}`
    });
    
  } catch (error: any) {
    console.error('Error creating email sequence job:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create email sequence job'
    }, { status: 500 });
  }
} 