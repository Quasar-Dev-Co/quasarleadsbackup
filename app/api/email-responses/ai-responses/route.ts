import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AIResponse } from '@/models/emailResponseSchema';

/**
 * GET: Fetches a paginated list of AI responses.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status'); // Optional filter by status
    const authHeader = request.headers.get('authorization') || '';
    const bearerUserId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    
    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (bearerUserId) {
      query.userId = bearerUserId;
    }
    
    const responses = await AIResponse.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const totalCount = await AIResponse.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      responses: responses.map(response => ({
        id: (response as any)._id.toString(),
        incomingEmailId: response.incomingEmailId?.toString() || '',
        generatedSubject: response.generatedSubject,
        generatedContent: response.generatedContent,
        confidence: 85, // Default confidence since it's not in the schema
        reasoning: response.reasoning,
        status: response.status,
        createdAt: response.createdAt,
        sentAt: response.sentAt,
        responseType: (response as any).responseType || 'general'
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching AI responses:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch AI responses'
    }, { status: 500 });
  }
} 