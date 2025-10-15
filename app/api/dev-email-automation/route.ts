import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import { emailService } from '@/lib/emailService';

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
    
    // Return default timings if none found
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

// Helper function to calculate next email date based on timing settings
function calculateNextEmailDate(timingSettings: any[], nextStage: string): Date | null {
  const timing = timingSettings.find((t: any) => t.stage === nextStage);
  
  if (!timing) {
    return null;
  }
  
  const nextEmailDate = new Date();
  
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
      // Default to 1 minute for development
      nextEmailDate.setMinutes(nextEmailDate.getMinutes() + 1);
  }
  
  return nextEmailDate;
}

/**
 * GET - DISABLED: Development email automation endpoint 
 * This endpoint is DISABLED to prevent timing conflicts with production system
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚨 DEV EMAIL AUTOMATION DISABLED - Use /api/cron/email-automation instead');
    console.log('===============================================================================');
    console.log('This dev endpoint was causing timing conflicts by sending emails too fast!');
    console.log('Production system: /api/cron/email-automation');
    
    return NextResponse.json({
      success: false,
      message: 'DEV Email Automation DISABLED - Use /api/cron/email-automation for production',
      note: 'This endpoint was causing timing conflicts with the main automation system',
      redirect: '/api/cron/email-automation',
      reason: 'Prevented fast email sending that conflicted with proper 5-minute intervals'
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
 * POST - Development email testing (still available for manual testing)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 DEV Starting frequent email automation for testing');
    
    // Call the GET handler
    const testRequest = new NextRequest(request.url, {
      method: 'GET'
    });
    
    return await GET(testRequest);
    
  } catch (error: any) {
    console.error('💥 DEV Manual test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'DEV Manual test failed',
        developmentMode: true
      },
      { status: 500 }
    );
  }
} 