import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

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
      { stage: 'called_twice', delay: 7, unit: 'days', description: 'Send after 7 days' },
      { stage: 'called_three_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
      { stage: 'called_four_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
      { stage: 'called_five_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
      { stage: 'called_six_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
      { stage: 'called_seven_times', delay: 7, unit: 'days', description: 'Send after 7 days' }
    ];
  } catch (error) {
    console.error('Error loading email timing settings:', error);
    return [];
  }
}

// Helper function to calculate email date based on timing settings
function calculateEmailDate(timingSettings: any[], stage: string): Date {
  const timing = timingSettings.find(t => t.stage === stage);
  
  if (!timing) {
    return new Date();
  }
  
  const emailDate = new Date();
  
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
      // Default to immediate send
      break;
  }
  
  return emailDate;
}

/**
 * GET - Test email timing calculations
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const timingSettings = await getEmailTimingSettings();
    const currentTime = new Date();
    
    const testResults = {
      currentTime: currentTime.toISOString(),
      timingSettings: timingSettings,
      calculatedDates: {} as any
    };
    
    // Test each stage timing
    const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    
    for (const stage of stages) {
      const calculatedDate = calculateEmailDate(timingSettings, stage);
      const timeDifference = calculatedDate.getTime() - currentTime.getTime();
             const timingConfig = timingSettings.find((t: any) => t.stage === stage);
      
      testResults.calculatedDates[stage] = {
        scheduledDate: calculatedDate.toISOString(),
        timeDifferenceMs: timeDifference,
        timeDifferenceHuman: timeDifference === 0 ? 'Immediate' : 
          timeDifference < 60000 ? `${Math.round(timeDifference / 1000)} seconds` :
          timeDifference < 3600000 ? `${Math.round(timeDifference / 60000)} minutes` :
          timeDifference < 86400000 ? `${Math.round(timeDifference / 3600000)} hours` :
          `${Math.round(timeDifference / 86400000)} days`,
        configuredTiming: timingConfig || 'Not found'
      };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email timing test completed',
      data: testResults
    });
    
  } catch (error: any) {
    console.error('Error testing email timing:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to test email timing'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Test setting custom email timing and calculating dates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stage, delay, unit } = body;
    
    if (!stage || delay === undefined || !unit) {
      return NextResponse.json(
        { success: false, error: 'Stage, delay, and unit are required' },
        { status: 400 }
      );
    }
    
    const testTiming = { stage, delay, unit, description: `Send after ${delay} ${unit}` };
    const currentTime = new Date();
    const calculatedDate = calculateEmailDate([testTiming], stage);
    const timeDifference = calculatedDate.getTime() - currentTime.getTime();
    
    return NextResponse.json({
      success: true,
      message: 'Custom timing test completed',
      data: {
        input: testTiming,
        currentTime: currentTime.toISOString(),
        calculatedDate: calculatedDate.toISOString(),
        timeDifferenceMs: timeDifference,
        timeDifferenceHuman: timeDifference === 0 ? 'Immediate' : 
          timeDifference < 60000 ? `${Math.round(timeDifference / 1000)} seconds` :
          timeDifference < 3600000 ? `${Math.round(timeDifference / 60000)} minutes` :
          timeDifference < 86400000 ? `${Math.round(timeDifference / 3600000)} hours` :
          `${Math.round(timeDifference / 86400000)} days`
      }
    });
    
  } catch (error: any) {
    console.error('Error testing custom timing:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to test custom timing'
      },
      { status: 500 }
    );
  }
} 