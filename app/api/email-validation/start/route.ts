import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Lead } from '@/models/leadSchema';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ONLY validate NEW LEADS (status='active') that have never been validated
    const leadsToValidate = await Lead.countDocuments({
      $and: [
        {
          $or: [
            { leadsCreatedBy: userId },
            { assignedTo: userId }
          ]
        },
        { status: 'active' }, // CRITICAL: Only NEW LEADS
        {
          $or: [
            { emailValidationStatus: { $exists: false } },
            { emailValidationStatus: null },
            { emailValidationStatus: 'notScanned' }
          ]
        },
        { emailValidationCheckedAt: { $exists: false } } // Never been validated before
      ]
    });

    if (leadsToValidate === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new leads need validation. All emails already validated!',
        leadsToValidate: 0
      });
    }

    // Ensure leads are marked as notScanned (will be processed by cron)
    const result = await Lead.updateMany(
      {
        $and: [
          {
            $or: [
              { leadsCreatedBy: userId },
              { assignedTo: userId }
            ]
          },
          { status: 'active' }, // Only NEW LEADS
          {
            $or: [
              { emailValidationStatus: { $exists: false } },
              { emailValidationStatus: null }
            ]
          },
          { emailValidationCheckedAt: { $exists: false } }
        ]
      },
      {
        $set: {
          emailValidationStatus: 'notScanned' // Mark for processing
        }
      }
    );

    const totalBatches = Math.ceil(leadsToValidate / 20);
    console.log(`✅ Email validation queued for ${leadsToValidate} NEW leads (${totalBatches} batches of 20)`);

    return NextResponse.json({
      success: true,
      message: `Email validation started for ${leadsToValidate} leads`,
      leadsToValidate,
      info: 'Cron job will process validations in batches of 20 every 3 minutes'
    });

  } catch (error: any) {
    console.error('❌ Failed to start email validation:', error);
    return NextResponse.json(
      { error: 'Failed to start email validation', details: error.message },
      { status: 500 }
    );
  }
}
