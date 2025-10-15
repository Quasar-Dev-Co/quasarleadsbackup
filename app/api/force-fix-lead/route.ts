import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

/**
 * POST - Force fix a lead's email automation state
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { leadEmail } = body;
    
    if (!leadEmail) {
      return NextResponse.json(
        { success: false, error: 'Lead email is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔧 Force fixing lead: ${leadEmail}`);
    
    // Find the lead
    const lead = await Lead.findOne({ email: leadEmail });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    console.log(`📧 Found lead: ${lead.name}`);
    console.log(`Current state: emails sent=${lead.emailHistory?.length || 0}, step=${lead.emailSequenceStep}, active=${lead.emailSequenceActive}`);
    
    // Calculate correct state
    const emailsSent = lead.emailHistory?.length || 0;
    const nextStep = emailsSent + 1;
    const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    
    if (nextStep > 7) {
      return NextResponse.json({
        success: true,
        message: 'Lead has completed all 7 emails',
        lead: {
          name: lead.name,
          email: lead.email,
          emailsSent,
          status: 'completed'
        }
      });
    }
    
    const nextStage = stages[nextStep - 1];
    
    // Set next email time to NOW (immediate)
    const nextEmailTime = new Date();
    
    console.log(`🎯 Fixing to: step=${nextStep}, stage=${nextStage}, nextEmail=${nextEmailTime.toISOString()}`);
    
    // Force update the lead
    const updateResult = await Lead.findByIdAndUpdate(
      lead._id,
      {
        $set: {
          stage: nextStage,
          emailAutomationEnabled: true,
          emailSequenceActive: true,
          emailSequenceStep: nextStep,
          emailSequenceStage: nextStage,
          nextScheduledEmail: nextEmailTime,
          emailStoppedReason: null,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!updateResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to update lead' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Lead fixed successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Lead fixed successfully',
      lead: {
        name: updateResult.name,
        email: updateResult.email,
        stage: updateResult.stage,
        emailAutomationEnabled: updateResult.emailAutomationEnabled,
        emailSequenceActive: updateResult.emailSequenceActive,
        emailSequenceStep: updateResult.emailSequenceStep,
        emailSequenceStage: updateResult.emailSequenceStage,
        nextScheduledEmail: updateResult.nextScheduledEmail,
        emailsSent: updateResult.emailHistory?.length || 0
      }
    });
    
  } catch (error: any) {
    console.error('💥 Error fixing lead:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fix lead'
      },
      { status: 500 }
    );
  }
} 