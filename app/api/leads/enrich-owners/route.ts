import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { updateExistingLeadsWithOwners } from '@/lib/leadEnrichment';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { userId, companyNames } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting owner enrichment for user ${userId}${companyNames ? ` for specific companies` : ` for all leads`}`);

    const result = await updateExistingLeadsWithOwners(userId, companyNames);

    return NextResponse.json({
      success: true,
      message: `Owner enrichment completed. Updated ${result.updated} out of ${result.total} leads.`,
      stats: result
    });

  } catch (error: any) {
    console.error('Error enriching leads with owners:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to enrich leads with owners' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Lead owner enrichment API endpoint',
    usage: {
      POST: 'Enrich existing leads with company owner information',
      body: {
        userId: 'Required: User ID for OpenAI credentials and lead filtering',
        companyNames: 'Optional: Array of specific company names to enrich'
      },
      example: {
        userId: '64b5c123e4f567890abcdef0',
        companyNames: ['Company A', 'Company B'] // Optional
      }
    }
  });
}
