import { NextRequest, NextResponse } from 'next/server';
import { AIResponse } from '@/models/emailResponseSchema';
import dbConnect from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Derive userId from Authorization header
    const authHeader = req.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { responseId, generatedSubject, generatedContent } = await req.json();

    if (!responseId || !generatedSubject || !generatedContent) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the AI response
    const aiResponse = await AIResponse.findById(responseId);
    
    if (!aiResponse) {
      return NextResponse.json(
        { success: false, error: 'AI response not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (aiResponse.userId && aiResponse.userId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this response' },
        { status: 403 }
      );
    }

    // Update the AI response
    aiResponse.generatedSubject = generatedSubject;
    aiResponse.generatedContent = generatedContent;
    await aiResponse.save();

    console.log(`✅ AI response updated: ${responseId}`);

    return NextResponse.json({
      success: true,
      message: 'AI response updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error updating AI response:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update AI response' },
      { status: 500 }
    );
  }
}
