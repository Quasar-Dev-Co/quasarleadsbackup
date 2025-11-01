import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { IncomingEmail, AIResponse } from '@/models/emailResponseSchema';
import mongoose from 'mongoose';

/**
 * GET: Fetches combined data of incoming emails with their AI responses
 * This provides a unified view for the email-responses page
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status'); // optional filter: 'ready_to_send', 'sent', 'all'
    
    // Get userId from authorization header
    const authHeader = request.headers.get('authorization') || '';
    const bearerUserId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    
    const query: any = {};
    
    // Filter by userId if provided
    if (bearerUserId && mongoose.Types.ObjectId.isValid(bearerUserId)) {
      query.userId = bearerUserId;
    }
    
    // Get incoming emails
    const emails = await IncomingEmail.find(query)
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    // Get AI responses for these emails
    const emailIds = emails.map(email => (email as any)._id);
    const aiResponses = await AIResponse.find({
      incomingEmailId: { $in: emailIds }
    }).lean();
    
    // Create a map of email ID to AI responses
    const responseMap = new Map();
    aiResponses.forEach(response => {
      const emailId = response.incomingEmailId?.toString();
      if (emailId) {
        if (!responseMap.has(emailId)) {
          responseMap.set(emailId, []);
        }
        responseMap.get(emailId).push(response);
      }
    });
    
    // Combine emails with their responses
    const combinedData = emails.map(email => {
      const emailId = (email as any)._id.toString();
      const responses = responseMap.get(emailId) || [];
      
      // Get the latest AI response
      const latestResponse = responses.length > 0 
        ? responses.reduce((latest: any, current: any) => {
            return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
          })
        : null;
      
      return {
        email: {
          id: emailId,
          leadId: email.leadId?.toString() || '',
          leadName: email.leadName,
          leadEmail: email.leadEmail,
          leadCompany: email.leadEmail.split('@')[1] || 'Unknown',
          subject: email.subject,
          content: email.content,
          htmlContent: email.htmlContent || '',
          status: email.status,
          receivedAt: email.receivedAt,
          respondedAt: email.respondedAt,
          isReply: email.isReply || false,
          isRecent: email.isRecent !== undefined ? email.isRecent : true,
          threadId: email.threadId || '',
          sentiment: email.sentiment || 'neutral',
          conversationCount: (email as any).conversationCount || 1,
          isThirdReply: (email as any).isThirdReply || false,
          metadata: email.metadata || {}
        },
        aiResponse: latestResponse ? {
          id: (latestResponse as any)._id.toString(),
          incomingEmailId: latestResponse.incomingEmailId?.toString() || '',
          generatedSubject: latestResponse.generatedSubject,
          generatedContent: latestResponse.generatedContent,
          confidence: latestResponse.confidence || 0,
          reasoning: latestResponse.reasoning || '',
          status: latestResponse.status,
          responseType: latestResponse.responseType || 'general',
          createdAt: latestResponse.createdAt,
          sentAt: latestResponse.sentAt
        } : null,
        hasResponse: latestResponse !== null
      };
    });
    
    // Apply status filter if requested
    let filteredData = combinedData;
    if (status === 'ready_to_send') {
      filteredData = combinedData.filter(item => 
        item.aiResponse && 
        (item.aiResponse.status === 'draft' || item.aiResponse.status === 'approved')
      );
    } else if (status === 'sent') {
      filteredData = combinedData.filter(item => 
        item.aiResponse && item.aiResponse.status === 'sent'
      );
    }
    
    const totalCount = await IncomingEmail.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching combined email data:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch combined email data'
    }, { status: 500 });
  }
}
