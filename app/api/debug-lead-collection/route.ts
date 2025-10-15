import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 DEBUG: Lead Collection System Check');
    
    const url = new URL(request.url);
    const service = url.searchParams.get('service') || 'web design';
    const location = url.searchParams.get('location') || 'Miami FL';
    
    // Check environment variables
    const envCheck = {
      SERPAPI_KEY: process.env.SERPAPI_KEY ? '✅ Set' : '❌ Missing',
      MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL || '❌ Not set',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '❌ Not set'
    };
    
    // Determine the base URL that would be used by job processor
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    console.log(`🌐 Base URL that would be used: ${baseUrl}`);
    
    // Test API endpoint directly
    const testEndpoint = `${baseUrl}/api/findleads-normal`;
    
    console.log(`🧪 Testing API endpoint: ${testEndpoint}`);
    
    const testPayload = {
      services: [service],
      locations: [location],
      leadQuantity: 5
    };
    
    let apiTestResult: {
      status: 'success' | 'failed' | 'error';
      statusCode?: number;
      leadsFound?: number;
      message?: string;
      stats?: any;
      error?: string;
    } = { status: 'error' };
    
    try {
      const testResponse = await fetch(testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        apiTestResult = {
          status: 'success',
          statusCode: testResponse.status,
          leadsFound: testData.leads?.length || 0,
          message: testData.message,
          stats: testData.stats
        };
      } else {
        const errorText = await testResponse.text();
        apiTestResult = {
          status: 'failed',
          statusCode: testResponse.status,
          error: errorText
        };
      }
    } catch (error: any) {
      apiTestResult = {
        status: 'error',
        error: error.message
      };
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        environment: envCheck,
        urlDetection: {
          baseUrlUsed: baseUrl,
          testEndpoint: testEndpoint
        },
        testPayload,
        apiTestResult,
        recommendations: [
          envCheck.SERPAPI_KEY === '❌ Missing' ? '🔑 Add SERPAPI_KEY to environment variables' : '✅ SERPAPI_KEY is configured',
          envCheck.MONGODB_URI === '❌ Missing' ? '🗄️ Add MONGODB_URI to environment variables' : '✅ MongoDB is configured',
          apiTestResult.status === 'success' ? `✅ API is working! Found ${apiTestResult.leadsFound || 0} leads` : '❌ API test failed - check logs above',
          apiTestResult.status === 'failed' ? `🔍 API returned ${apiTestResult.statusCode}: ${apiTestResult.error}` : '',
          'ℹ️ If API test works but jobs still fail, check Vercel function logs for detailed error messages'
        ].filter(Boolean)
      }
    });
    
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        error: 'Debug endpoint failed - check server logs'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { service = 'web design', location = 'Miami FL' } = body;
    
    console.log('🔧 DEBUG: Testing complete job workflow...');
    
    // Step 1: Queue a test job
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const queueResponse = await fetch(`${baseUrl}/api/jobs/queue-normal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        services: service,
        locations: location,
        leadQuantity: 5,
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
    
    console.log(`✅ Job queued successfully: ${jobId}`);
    
    // Step 2: Start local processing immediately
    const processResponse = await fetch(`${baseUrl}/api/jobs/process-local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    });
    
    let processResult: {
      status: 'success' | 'failed';
      message?: string;
      leadsCollected?: number;
      error?: string;
    } = { status: 'failed' };
    
    if (processResponse.ok) {
      const processData = await processResponse.json();
      processResult = {
        status: 'success',
        message: processData.message,
        leadsCollected: processData.totalLeadsCollected
      };
    } else {
      const errorText = await processResponse.text();
      processResult = {
        status: 'failed',
        error: `${processResponse.status} - ${errorText}`
      };
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        testJob: {
          jobId,
          service,
          location,
          queueResult: 'success',
          processResult
        },
        conclusion: processResult.status === 'success' 
          ? `✅ Complete workflow test successful! Collected ${processResult.leadsCollected || 0} leads`
          : `❌ Workflow test failed: ${processResult.error}`
      }
    });
    
  } catch (error: any) {
    console.error('Debug workflow test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        error: 'Debug workflow test failed - check server logs'
      }
    }, { status: 500 });
  }
} 