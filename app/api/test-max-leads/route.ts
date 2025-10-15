import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service') || 'dentist';
  const location = searchParams.get('location') || 'Miami';

  try {
    console.log(`🧪 Testing MAXIMIZED lead collection for: ${service} in ${location}`);

    // Test the maximized findleads-normal API
    const testBody = {
      services: [service],
      locations: [location],
      leadQuantity: 500 // Request lots of leads
    };

    const response = await fetch('https://text-gpt-test.vercel.app/api/findleads-normal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBody)
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'GOOGLE MAPS Lead Collection Test Results',
      testParams: {
        service,
        location,
        requestedQuantity: 500
      },
      results: {
        leadsFound: data.leads?.length || 0,
        withEmails: data.leads?.filter((l: any) => l.email).length || 0,
        withoutEmails: data.leads?.filter((l: any) => !l.email).length || 0,
        organicLeads: data.stats?.organicLeads || 0,
        localLeads: data.stats?.localLeads || 0,
        totalLeads: data.stats?.totalLeads || 0
      },
      improvements: [
        '✅ 100 SERP results per search (was 10)',
        '✅ ALL results processed (was limited to 8+5)',
        '✅ 5 search variations per service/location',
        '✅ Includes leads without emails',
        '✅ 2x faster processing (500ms delays)',
        '✅ Automatic deduplication',
        '✅ Multiple search query types'
      ],
      searchVariations: [
        'Basic organic: "dentist Miami"',
        'Best search: "best dentist in Miami"', 
        'Top services: "top dentist services Miami"',
        'Local search: "dentist near Miami"',
        'Companies search: "dentist companies near Miami"'
      ],
      apiUsage: data.stats?.apiUsage || 'Enhanced but still minimal',
      rawData: data
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test maximized lead collection'
    }, { status: 500 });
  }
} 