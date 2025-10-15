import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue from '@/models/jobQueueSchema';
import Lead from '@/models/leadSchema';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 COMPREHENSIVE CRON JOB DEBUG TEST');
    console.log('=====================================');
    
    await dbConnect();
    
    const url = new URL(request.url);
    const service = url.searchParams.get('service') || 'dentist';
    const location = url.searchParams.get('location') || 'Miami FL';
    
    // Step 1: Check current job status
    console.log('\n📊 STEP 1: Current Job Status');
    const jobStats = await JobQueue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const stats = jobStats.reduce((acc: any, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
    
    console.log('Job Stats:', stats);
    
    // Step 2: Get recent jobs
    const recentJobs = await JobQueue.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log('\n📋 STEP 2: Recent Jobs');
    recentJobs.forEach(job => {
      const duration = job.completedAt && job.startedAt 
        ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
        : 'N/A';
      console.log(`${job.jobId}: ${job.status} | Duration: ${duration}s | Leads: ${job.totalLeadsCollected || 0} | Error: ${job.errorMessage || 'None'}`);
    });
    
    // Step 3: Test API endpoint directly
    console.log('\n🔍 STEP 3: Testing API Endpoint Directly');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://testqlagain.vercel.app';
    
    const apiEndpoint = `${baseUrl}/api/findleads-normal`;
    console.log(`Testing: ${apiEndpoint}`);
    
    let apiResult: any = null;
    try {
      const startTime = Date.now();
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: [service],
          locations: [location],
          leadQuantity: 3
        }),
      });
      
      const duration = Date.now() - startTime;
      const responseText = await response.text();
      
      apiResult = {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        bodyPreview: responseText.substring(0, 500),
        success: response.ok
      };
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          apiResult.leadsFound = data.leads?.length || 0;
          apiResult.savedLeads = data.stats?.savedLeads || 0;
          apiResult.message = data.message;
        } catch (e) {
          apiResult.parseError = 'Could not parse JSON response';
        }
      }
      
      console.log('✅ API Test Result:', apiResult);
      
    } catch (error: any) {
      apiResult = {
        error: error.message,
        success: false
      };
      console.log('❌ API Test Failed:', error.message);
    }
    
    // Step 4: Check database connectivity
    console.log('\n💾 STEP 4: Database Connectivity Test');
    let dbTest = null;
    try {
      const leadCount = await Lead.countDocuments();
      const recentLeads = await Lead.find().sort({ createdAt: -1 }).limit(3).lean();
      
      dbTest = {
        success: true,
        totalLeads: leadCount,
        recentLeads: recentLeads.map(lead => ({
          company: lead.company,
          email: lead.email,
          createdAt: lead.createdAt
        }))
      };
      console.log('✅ Database working. Total leads:', leadCount);
      
    } catch (error: any) {
      dbTest = {
        success: false,
        error: error.message
      };
      console.log('❌ Database test failed:', error.message);
    }
    
    // Step 5: Test job creation and processing
    console.log('\n🚀 STEP 5: Testing Complete Job Workflow');
    let jobTest: any = null;
    try {
      // Create a test job
      const testJob = new JobQueue({
        jobId: `debug-${Date.now()}`,
        type: 'lead-collection',
        services: [service],
        locations: [location],
        leadQuantity: 3,
        priority: 1,
        status: 'pending',
        includeGoogleAdsAnalysis: false,
        analyzeLeads: false,
        totalSteps: 1,
        estimatedDuration: 5
      });
      
      await testJob.save();
      console.log(`✅ Created test job: ${testJob.jobId}`);
      
      // Try to process it
      const processEndpoint = `${baseUrl}/api/cron/process-jobs`;
      const processResponse = await fetch(processEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const processResult = await processResponse.text();
      
      jobTest = {
        jobCreated: true,
        jobId: testJob.jobId,
        processResponse: {
          status: processResponse.status,
          success: processResponse.ok,
          body: processResult.substring(0, 300)
        }
      };
      
      // Check job status after processing
      const updatedJob: any = await JobQueue.findOne({ jobId: testJob.jobId }).lean();
      if (updatedJob) {
        jobTest.finalJobStatus = {
          status: updatedJob.status,
          totalLeadsCollected: updatedJob.totalLeadsCollected,
          errorMessage: updatedJob.errorMessage,
          completedAt: updatedJob.completedAt
        };
      }
      
      console.log('🧪 Job workflow test completed');
      
    } catch (error: any) {
      jobTest = {
        error: error.message,
        success: false
      };
      console.log('❌ Job workflow test failed:', error.message);
    }
    
    // Step 6: Environment check
    console.log('\n🔧 STEP 6: Environment Variables Check');
    const envCheck = {
      SERPAPI_KEY: process.env.SERPAPI_KEY ? '✅ Set' : '❌ Missing',
      MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL || 'Not set',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'Not set'
    };
    
    console.log('Environment check:', envCheck);
    
    // Final diagnosis
    const diagnosis = [];
    
    if (!apiResult?.success) {
      diagnosis.push('🚨 MAIN ISSUE: API endpoint is failing');
    } else if (apiResult.leadsFound === 0) {
      diagnosis.push('🚨 MAIN ISSUE: API works but finds 0 leads');
    } else if (apiResult.savedLeads === 0) {
      diagnosis.push('🚨 MAIN ISSUE: Leads found but not saved to database');
    }
    
    if (!dbTest?.success) {
      diagnosis.push('💾 Database connection issue');
    }
    
    if (envCheck.SERPAPI_KEY === '❌ Missing') {
      diagnosis.push('🔑 SERPAPI_KEY is missing');
    }
    
    if (!jobTest?.processResponse?.success) {
      diagnosis.push('⚙️ Cron job processor is failing');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug test completed',
      timestamp: new Date().toISOString(),
      testResults: {
        jobStats: stats,
        recentJobs: recentJobs.map(job => ({
          jobId: job.jobId,
          status: job.status,
          leadsCollected: job.totalLeadsCollected || 0,
          error: job.errorMessage,
          duration: job.completedAt && job.startedAt 
            ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
            : null
        })),
        apiTest: apiResult,
        databaseTest: dbTest,
        jobWorkflowTest: jobTest,
        environmentCheck: envCheck,
        diagnosis,
        recommendations: [
          diagnosis.length === 0 ? '✅ System appears to be working correctly' : '❌ Issues found - see diagnosis',
          apiResult?.success ? '✅ API endpoint working' : '🔧 Fix API endpoint first',
          dbTest?.success ? '✅ Database working' : '🔧 Fix database connection',
          envCheck.SERPAPI_KEY === '✅ Set' ? '✅ SERPAPI configured' : '🔧 Add SERPAPI_KEY environment variable'
        ]
      }
    });
    
  } catch (error: any) {
    console.error('Debug test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action = 'full-test' } = body;
    
    if (action === 'clean-failed-jobs') {
      // Clean up failed/stuck jobs
      await dbConnect();
      
      const result = await JobQueue.updateMany(
        { 
          status: 'running',
          startedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // Older than 10 minutes
        },
        { 
          status: 'failed',
          errorMessage: 'Job timeout - reset by debug tool',
          completedAt: new Date()
        }
      );
      
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${result.modifiedCount} stuck jobs`,
        action: 'clean-failed-jobs'
      });
    }
    
    // Default: redirect to GET for full test
    return NextResponse.redirect(new URL('/api/test-cron-debug', request.url));
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 