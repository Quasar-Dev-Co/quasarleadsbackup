import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import { emailService } from '@/lib/emailService';

/**
 * GET - DISABLED: Use /api/cron/email-automation instead for email processing
 * This endpoint now only handles starting/stopping automation via POST
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚨 OLD EMAIL AUTOMATION ENDPOINT - REDIRECTING TO NEW SYSTEM');
    console.log('===============================================================');
    console.log('This endpoint is DISABLED. Email processing now handled by:');
    console.log('📍 /api/cron/email-automation - For automated email processing');
    console.log('📍 Use POST method on this endpoint for starting/stopping automation');
    
    return NextResponse.json({
      success: false,
      message: 'This endpoint is DISABLED - Use /api/cron/email-automation for email processing',
      redirect: '/api/cron/email-automation',
      note: 'The new system provides better timing accuracy and uses your configured settings'
    });
    
  } catch (error: any) {
    console.error('💥 Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Endpoint disabled'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Start or manage email automation for a lead
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { leadId, action, stage } = body;
    
    if (!leadId || !action) {
      return NextResponse.json(
        { success: false, error: 'Lead ID and action are required' },
        { status: 400 }
      );
    }
    
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    if (action === 'start') {
      // Start email automation sequence using JOB QUEUE SYSTEM
      if (!stage || !['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'].includes(stage)) {
        return NextResponse.json(
          { success: false, error: 'Valid stage is required to start automation' },
          { status: 400 }
        );
      }
      
      // Load your configured timing settings from company settings
      const connection = await dbConnect();
      const db = connection.connection.db;
      const settingsCollection = db.collection('companySettings');
      const settings = await settingsCollection.findOne({ type: 'default' });
      
      let firstEmailDate = new Date();
      firstEmailDate.setSeconds(firstEmailDate.getSeconds() + 10); // 10 seconds from now
      
      if (settings?.emailTimings) {
        const timing = settings.emailTimings.find((t: any) => t.stage === stage);
        if (timing) {
          const delayMs = timing.unit === 'minutes' ? timing.delay * 60 * 1000 : 
                         timing.unit === 'hours' ? timing.delay * 60 * 60 * 1000 :
                         timing.unit === 'days' ? timing.delay * 24 * 60 * 60 * 1000 :
                         timing.delay * 60 * 1000; // Default to minutes
          
          firstEmailDate = new Date(Date.now() + Math.max(delayMs, 10000)); // At least 10 seconds
          console.log(`⏰ Using configured timing: ${timing.delay} ${timing.unit} = ${firstEmailDate.toISOString()}`);
        }
      }
      
      // Update lead with automation enabled
      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          emailAutomationEnabled: true,
          emailSequenceActive: true,
          emailSequenceStage: stage,
          emailSequenceStartDate: new Date(),
          emailSequenceStep: 1,
          nextScheduledEmail: firstEmailDate,
          emailStoppedReason: null,
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: `Email automation started for ${lead.name}`,
        leadName: lead.name,
        startStage: stage,
        nextEmailAt: firstEmailDate.toISOString()
      });
      
    } else if (action === 'stop') {
      // Stop email automation
      const reason = body.reason || 'Manual stop';
      
      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          emailSequenceActive: false,
          emailStoppedReason: reason,
          nextScheduledEmail: null,
          updatedAt: new Date()
        }
      });
      
      console.log(`⏹️ Email automation stopped for ${lead.name} - Reason: ${reason}`);
      
      return NextResponse.json({
        success: true,
        message: `Email automation stopped for ${lead.name}`,
        reason
      });
      
    } else if (action === 'pause') {
      // Pause email automation
      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          emailSequenceActive: false,
          emailStoppedReason: 'Paused by user',
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `Email automation paused for ${lead.name}`
      });
      
    } else if (action === 'resume') {
      // Resume email automation
      const nextEmailDate = new Date();
      nextEmailDate.setDate(nextEmailDate.getDate() + 7);
      
      await Lead.findByIdAndUpdate(leadId, {
        $set: {
          emailSequenceActive: true,
          emailStoppedReason: null,
          nextScheduledEmail: nextEmailDate,
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `Email automation resumed for ${lead.name}`,
        nextEmailDate
      });
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: start, stop, pause, or resume' },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 Email Automation Management Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to manage email automation'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update automation settings for a lead
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { leadId, emailAutomationEnabled } = body;
    
    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      );
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (emailAutomationEnabled !== undefined) {
      updateData.emailAutomationEnabled = emailAutomationEnabled;
      
      // If disabling automation, also stop active sequences
      if (!emailAutomationEnabled) {
        updateData.emailSequenceActive = false;
        updateData.emailStoppedReason = 'Automation disabled';
        updateData.nextScheduledEmail = null;
      }
    }
    
    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: updateData },
      { new: true }
    );
    
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email automation settings updated',
      lead: {
        id: lead._id,
        name: lead.name,
        emailAutomationEnabled: lead.emailAutomationEnabled,
        emailSequenceActive: lead.emailSequenceActive
      }
    });
    
  } catch (error: any) {
    console.error('💥 Email Automation Settings Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update automation settings'
      },
      { status: 500 }
    );
  }
} 