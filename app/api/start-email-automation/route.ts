import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/userSchema';
import { Lead } from '@/models/leadSchema';

export async function POST(request: NextRequest) {
  try {
    const { leadIds, userId, outreachRecipient, senderIdentity } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Validate SMTP credentials for the user
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    const user = await (User as any).findById(userId).lean();
    const creds = user?.credentials || {};
    const missing: string[] = [];
    ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD'].forEach((k) => { if (!creds[k]) missing.push(k); });
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing SMTP credentials: ${missing.join(', ')}`, missingCredentials: missing }, { status: 400 });
    }

    // Validate presence of all 7 templates (user-specific preferred, fallback to global)
    const requiredStages = ['called_once','called_twice','called_three_times','called_four_times','called_five_times','called_six_times','called_seven_times'];
    const Template = (await import('@/models/emailTemplateSchema')).default as any;
    const missingStages: string[] = [];
    for (const stage of requiredStages) {
      const found = await Template.findOne({ stage, isActive: true, userId }).lean() ||
                    await Template.findOne({ stage, isActive: true, $or: [ { userId: { $exists: false } }, { userId: '' }, { userId: null } ] }).lean();
      if (!found) missingStages.push(stage);
    }
    if (missingStages.length > 0) {
      return NextResponse.json({ error: `Missing email templates: ${missingStages.join(', ')}`, missingTemplates: missingStages }, { status: 400 });
    }

    // Find the leads and validate them
    const leads = await Lead.find({ 
      _id: { $in: leadIds },
      email: { $exists: true, $nin: [null, '', undefined] }
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'No valid leads found with email addresses' },
        { status: 404 }
      );
    }

    const updateResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      try {
        // Check if email automation is already active
        if (lead.emailSequenceActive) {
          updateResults.push({
            leadId: lead._id,
            email: lead.email,
            status: 'skipped',
            message: 'Email automation already active'
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lead.email)) {
          updateResults.push({
            leadId: lead._id,
            email: lead.email,
            status: 'error',
            message: 'Invalid email format'
          });
          errorCount++;
          continue;
        }

        // Start email automation
        const now = new Date();
        // CRITICAL: Add 2-minute delay before first email to prevent race conditions
        const firstEmailTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
        
        const updateData: any = {
          emailSequenceActive: true,
          emailAutomationEnabled: true,
          emailSequenceStage: 'not_called',
          emailSequenceStep: 0,
          emailSequenceStartDate: now,
          nextScheduledEmail: firstEmailTime, // Wait 2 minutes before first email
          emailStatus: 'ready',
          emailRetryCount: 0,
          emailFailureCount: 0,
          emailLastAttempt: null,
          // Ensure lead is assigned to the user starting the automation
          assignedTo: userId,
          leadsCreatedBy: userId
        };

        // Add sender identity and outreach recipient if provided
        if (senderIdentity && ['company', 'author'].includes(senderIdentity)) {
          updateData.senderIdentity = senderIdentity;
        }
        if (outreachRecipient && ['lead', 'company'].includes(outreachRecipient)) {
          updateData.outreachRecipient = outreachRecipient;
        }

        const result = await Lead.findByIdAndUpdate(
          lead._id,
          { $set: updateData },
          { new: true }
        );

        if (result) {
          updateResults.push({
            leadId: lead._id,
            email: lead.email,
            name: lead.name,
            company: lead.company,
            status: 'started',
            message: 'Email automation started successfully'
          });
          successCount++;
        } else {
          updateResults.push({
            leadId: lead._id,
            email: lead.email,
            status: 'error',
            message: 'Failed to update lead'
          });
          errorCount++;
        }

      } catch (error: any) {
        console.error(`Error starting automation for lead ${lead._id}:`, error);
        updateResults.push({
          leadId: lead._id,
          email: lead.email,
          status: 'error',
          message: error.message
        });
        errorCount++;
      }
    }

    console.log(`📧 Email automation started for ${successCount} leads, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Email automation started for ${successCount} leads`,
      results: updateResults,
      summary: {
        total: leadIds.length,
        found: leads.length,
        started: successCount,
        errors: errorCount,
        skipped: updateResults.filter(r => r.status === 'skipped').length
      }
    });

  } catch (error: any) {
    console.error('Failed to start email automation:', error);
    return NextResponse.json(
      { error: 'Failed to start email automation', details: error.message },
      { status: 500 }
    );
  }
} 