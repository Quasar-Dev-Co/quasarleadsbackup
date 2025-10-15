import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 SIMPLE LEAD COLLECTION TEST');
    console.log('==============================');
    
    const url = new URL(request.url);
    const service = url.searchParams.get('service') || 'web design';
    const location = url.searchParams.get('location') || 'Miami FL';
    
    // Step 1: Check what base URL would be used
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    console.log(`🌐 Base URL: ${baseUrl}`);
    console.log(`🎯 Testing: ${service} in ${location}`);
    
    // Step 2: Test the normal leads API directly
    const testEndpoint = `${baseUrl}/api/findleads-normal`;
    console.log(`📡 Testing endpoint: ${testEndpoint}`);
    
    const testPayload = {
      services: [service],
      locations: [location],
      leadQuantity: 5
    };
    
    console.log(`📋 Payload:`, JSON.stringify(testPayload, null, 2));
    
    // Step 3: Make the API call with detailed logging
    console.log(`⏰ Starting API call at: ${new Date().toISOString()}`);
    
    const startTime = Date.now();
    
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ API call took: ${duration}ms`);
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API call failed:`, errorText);
      
      return NextResponse.json({
        success: false,
        test: 'FAILED',
        error: `API returned ${response.status}: ${errorText}`,
        details: {
          baseUrl,
          endpoint: testEndpoint,
          payload: testPayload,
          responseStatus: response.status,
          responseText: errorText,
          duration: `${duration}ms`
        }
      });
    }
    
    // Step 4: Parse successful response
    const data = await response.json();
    const leads = data.leads || [];
    
    console.log(`✅ API call successful!`);
    console.log(`📊 Leads found: ${leads.length}`);
    console.log(`💬 Message: ${data.message}`);
    console.log(`📈 Stats:`, data.stats);
    
    if (leads.length > 0) {
      console.log(`🔍 Sample lead:`, JSON.stringify(leads[0], null, 2));
    }
    
    return NextResponse.json({
      success: true,
      test: 'PASSED',
      message: `Successfully collected ${leads.length} leads`,
      results: {
        baseUrl,
        endpoint: testEndpoint,
        payload: testPayload,
        responseStatus: response.status,
        duration: `${duration}ms`,
        leadsFound: leads.length,
        apiMessage: data.message,
        apiStats: data.stats,
        sampleLead: leads.length > 0 ? leads[0] : null
      },
      conclusion: leads.length > 0 
        ? `✅ SUCCESS! The API is working and collecting leads. The job processing issue is elsewhere.`
        : `⚠️ API works but returned 0 leads. Check SERPAPI_KEY or try different service/location.`
    });
    
  } catch (error: any) {
    console.error('💥 Test failed with error:', error);
    
    return NextResponse.json({
      success: false,
      test: 'ERROR',
      error: error.message,
      details: {
        errorType: error.constructor.name,
        stack: error.stack
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 TESTING COMPLETE JOB WORKFLOW');
    console.log('================================');
    
    const body = await request.json();
    const { service = 'web design', location = 'Miami FL' } = body;
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    console.log(`🌐 Using base URL: ${baseUrl}`);
    
    // Step 1: Check current running jobs
    console.log(`\n📋 Step 1: Checking current job status...`);
    
    const healthResponse = await fetch(`${baseUrl}/api/cron/health`);
    const healthData = await healthResponse.json();
    
    console.log(`📊 Current job stats:`, healthData.jobStats);
    console.log(`🔍 Recent jobs:`, healthData.recentJobs?.map((j: any) => `${j.jobId}: ${j.status}`).join(', '));
    
    // Step 2: Queue a test job
    console.log(`\n🎯 Step 2: Queueing test job...`);
    
    const queueResponse = await fetch(`${baseUrl}/api/jobs/queue-normal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        services: service,
        locations: location,
        leadQuantity: 3,
        type: 'lead-collection',
        priority: 1
      }),
    });
    
    if (!queueResponse.ok) {
      const errorText = await queueResponse.text();
      throw new Error(`Failed to queue job: ${queueResponse.status} - ${errorText}`);
    }
    
    const queueData = await queueResponse.json();
    const jobId = queueData.job.jobId;
    
    console.log(`✅ Job queued: ${jobId}`);
    
    // Step 3: Process the job immediately
    console.log(`\n🚀 Step 3: Processing job immediately...`);
    
    const processResponse = await fetch(`${baseUrl}/api/jobs/process-local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    });
    
    console.log(`📊 Process response status: ${processResponse.status}`);
    
    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error(`❌ Job processing failed: ${errorText}`);
      
      return NextResponse.json({
        success: false,
        test: 'FAILED',
        step: 'job_processing',
        error: `Job processing failed: ${processResponse.status} - ${errorText}`,
        jobId
      });
    }
    
    const processData = await processResponse.json();
    console.log(`✅ Job processing result:`, processData);
    
    // Step 4: Check final job status
    console.log(`\n📋 Step 4: Checking final job status...`);
    
    const statusResponse = await fetch(`${baseUrl}/api/jobs/status/${jobId}`);
    const statusData = await statusResponse.json();
    
    console.log(`📊 Final job status:`, statusData.job);
    
    return NextResponse.json({
      success: true,
      test: 'COMPLETED',
      workflow: {
        step1_initialStats: healthData.jobStats,
        step2_jobQueued: { jobId, status: 'success' },
        step3_jobProcessing: { 
          status: processResponse.status, 
          result: processData 
        },
        step4_finalStatus: statusData.job
      },
      conclusion: statusData.job?.totalLeadsCollected > 0
        ? `✅ SUCCESS! Complete workflow works. Collected ${statusData.job.totalLeadsCollected} leads.`
        : `❌ FAILED! Job completed but collected ${statusData.job?.totalLeadsCollected || 0} leads.`,
      leadsCollected: statusData.job?.totalLeadsCollected || 0,
      jobStatus: statusData.job?.status,
      errorMessage: statusData.job?.errorMessage
    });
    
  } catch (error: any) {
    console.error('💥 Workflow test failed:', error);
    
    return NextResponse.json({
      success: false,
      test: 'ERROR',
      error: error.message
    }, { status: 500 });
  }
} 