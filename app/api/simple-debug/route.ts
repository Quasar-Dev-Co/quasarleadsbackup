import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 SIMPLE DEBUG TEST');
    
    // Test basic API call - use production URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://testqlagain.vercel.app';
    
    const url = new URL(request.url);
    const service = url.searchParams.get('service') || 'dentist';
    const location = url.searchParams.get('location') || 'Miami';
    
    console.log(`Testing: ${baseUrl}/api/findleads-normal`);
    
    const response = await fetch(`${baseUrl}/api/findleads-normal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        services: [service],
        locations: [location],
        leadQuantity: 5
      }),
    });
    
    const responseText = await response.text();
    
    return NextResponse.json({
      baseUrl,
      endpoint: `${baseUrl}/api/findleads-normal`,
      requestData: {
        services: [service],
        locations: [location],
        leadQuantity: 5
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 1000),
        bodyLength: responseText.length
      },
      environment: {
        SERPAPI_KEY: process.env.SERPAPI_KEY ? 'SET' : 'MISSING',
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'MISSING',
        VERCEL_URL: process.env.VERCEL_URL || 'MISSING',
        NODE_ENV: process.env.NODE_ENV
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 