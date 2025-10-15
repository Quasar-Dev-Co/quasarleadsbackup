import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue from '@/models/jobQueueSchema';

/**
 * GET - Health check endpoint for cronjob system
 * Use this to verify that cronjobs are running properly
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🏥 Health check requested...');
    await dbConnect();
    
    const url = new URL(request.url);
    const triggerJobs = url.searchParams.get('trigger') === 'true';
    
    // Get job statistics
    const totalJobs = await JobQueue.countDocuments();
    const pendingJobs = await JobQueue.countDocuments({ status: 'pending' });
    const runningJobs = await JobQueue.countDocuments({ status: 'running' });
    const completedJobs = await JobQueue.countDocuments({ status: 'completed' });
    const failedJobs = await JobQueue.countDocuments({ status: 'failed' });
    
    // Get recent jobs for debugging
    const recentJobs = await JobQueue.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('jobId status services locations progress progressMessage createdAt startedAt completedAt includeGoogleAdsAnalysis analyzeLeads')
      .lean();
    
    const healthData: any = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'connected',
      apiEndpoints: {
        findleads: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/findleads`,
        findleadsNormal: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/findleads-normal`,
        processJobs: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/process-jobs`,
      },
      environmentVariables: {
        SERPAPI_KEY: process.env.SERPAPI_KEY ? '✅ Set' : '❌ Missing',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
        MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
        VERCEL_URL: process.env.VERCEL_URL ? '✅ Set' : '❌ Missing',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? '✅ Set' : '❌ Missing',
        CRON_SECRET: process.env.CRON_SECRET ? '✅ Set' : '❌ Missing (needed for production)',
      },
      jobStats: {
        total: totalJobs,
        pending: pendingJobs,
        running: runningJobs,
        completed: completedJobs,
        failed: failedJobs
      },
      recentJobs: recentJobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        type: 'normal',
        services: job.services,
        locations: job.locations,
        progress: job.progress,
        message: job.progressMessage,
        created: job.createdAt,
        started: job.startedAt,
        completed: job.completedAt
      })),
      cronJobStatus: pendingJobs > 0 ? 'Jobs waiting to be processed' : 'No pending jobs',
      instructions: {
        manualTrigger: 'Add ?trigger=true to manually process jobs',
        testJob: 'Visit /api/cron/process-jobs (POST) to manually trigger job processing',
        queueJob: 'Use /api/jobs/queue-normal to queue new jobs'
      }
    };
    
    // Optionally trigger job processing
    if (triggerJobs && pendingJobs > 0) {
      console.log('🚀 Health check triggered job processing...');
      
      try {
        const triggerResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/process-jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (triggerResponse.ok) {
          const triggerData = await triggerResponse.json();
          healthData.jobTriggerResult = {
            success: true,
            message: triggerData.message || 'Job processing triggered successfully'
          };
        } else {
          healthData.jobTriggerResult = {
            success: false,
            error: `Failed to trigger jobs: ${triggerResponse.statusText}`
          };
        }
      } catch (error: any) {
        healthData.jobTriggerResult = {
          success: false,
          error: `Error triggering jobs: ${error.message}`
        };
      }
    }
    
    return NextResponse.json(healthData);
    
  } catch (error: any) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST - Manual trigger for testing cronjob functionality
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 Manual Cronjob Test: Simulating cron job execution...');
    
    // Simulate the cron job request
    const testRequest = new NextRequest(`${request.url.split('/health')[0]}/process-jobs`, {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
        'user-agent': 'Manual-Test-Trigger'
      }
    });
    
    // Import and call the cron job handler
    const { GET: processCronJob } = await import('../process-jobs/route');
    const result = await processCronJob(testRequest);
    
    const resultData = await result.json();
    
    console.log('🧪 Manual test result:', resultData);
    
    return NextResponse.json({
      success: true,
      message: 'Manual cronjob test completed',
      testResult: resultData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('💥 Manual test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Manual test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 