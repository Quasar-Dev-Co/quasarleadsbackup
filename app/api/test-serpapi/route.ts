import { NextRequest, NextResponse } from 'next/server';
import { getJson } from 'serpapi';

const SERPAPI_KEY = process.env.SERPAPI_KEY;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 Testing SERPAPI directly...');
    
    if (!SERPAPI_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SERPAPI_KEY not found in environment variables'
      }, { status: 500 });
    }
    
    console.log(`🔑 SERPAPI_KEY exists: ${SERPAPI_KEY.substring(0, 10)}...`);
    
    const url = new URL(request.url);
    const service = url.searchParams.get('service') || 'dentist';
    const location = url.searchParams.get('location') || 'Miami';
    
    // Test basic search
    const searchParams = {
      engine: "google",
      q: `${service} ${location}`,
      api_key: SERPAPI_KEY,
      num: 5,
      location: location,
      google_domain: "google.com",
      gl: "us",
      hl: "en"
    };
    
    console.log(`📡 Testing SERPAPI with:`, JSON.stringify(searchParams, null, 2));
    
    const startTime = Date.now();
    const response = await getJson(searchParams);
    const endTime = Date.now();
    
    console.log(`⏱️ SERPAPI call took: ${endTime - startTime}ms`);
    console.log(`📨 Response keys:`, Object.keys(response));
    
    if (response.error) {
      console.error(`❌ SERPAPI Error:`, response.error);
      return NextResponse.json({
        success: false,
        error: `SERPAPI Error: ${response.error}`,
        details: response
      }, { status: 400 });
    }
    
    const organicResults = response.organic_results || [];
    
    console.log(`✅ Found ${organicResults.length} organic results`);
    
    // Sample the first few results
    const sampleResults = organicResults.slice(0, 3).map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet
    }));
    
    return NextResponse.json({
      success: true,
      message: `SERPAPI test successful`,
      searchParams: {
        service,
        location,
        query: searchParams.q
      },
      results: {
        totalOrganic: organicResults.length,
        totalLocal: (response.local_results || []).length,
        sampleResults,
        responseTime: `${endTime - startTime}ms`
      },
      fullResponse: {
        hasOrganicResults: !!response.organic_results,
        hasLocalResults: !!response.local_results,
        hasAdsResults: !!response.ads,
        hasError: !!response.error,
        searchInformation: response.search_information
      }
    });
    
  } catch (error: any) {
    console.error('SERPAPI test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'SERPAPI test failed',
      stack: error.stack
    }, { status: 500 });
  }
} 