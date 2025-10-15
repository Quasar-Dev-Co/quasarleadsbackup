import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { IncomingEmail, AIResponse } from '@/models/emailResponseSchema';
import { emailService } from '@/lib/emailService';
import User from '@/models/userSchema';

/**
 * POST - Manually sends an AI-generated response.
 * This is useful for sending responses from a UI or for testing.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { responseId, customSubject, customContent } = body;

    // Derive userId from Authorization header (preferred) to avoid trusting client body
    const authHeader = request.headers.get('authorization') || '';
    const bearerUserId = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';
    
    if (!responseId) {
      return NextResponse.json({ success: false, error: 'AI Response ID is required' }, { status: 400 });
    }
    
    // Fetch the AI response and its corresponding incoming email
    const aiResponse = await AIResponse.findById(responseId).populate('incomingEmailId');
    
    if (!aiResponse) {
      return NextResponse.json({ success: false, error: 'AI response not found' }, { status: 404 });
    }
    
    if (aiResponse.status === 'sent') {
      return NextResponse.json({ success: false, error: 'This response has already been sent' }, { status: 400 });
    }

    const originalEmail = aiResponse.incomingEmailId as any;
    if (!originalEmail) {
      return NextResponse.json({ success: false, error: 'Could not find the original email associated with this response' }, { status: 404 });
    }

    console.log(`📤 Manually sending AI response for responseId: ${responseId} to: ${originalEmail.leadEmail}`);

    const emailConfig = {
      to: originalEmail.leadEmail,
      subject: customSubject || aiResponse.generatedSubject,
      text: customContent || aiResponse.generatedContent,
      html: `<div style="font-family: Arial, sans-serif;">${(customContent || aiResponse.generatedContent).replace(/\n/g, '<br>')}</div>`,
    };
    
    // Always require authenticated user context for sending
    const effectiveUserId = bearerUserId;

    if (!effectiveUserId) {
      return NextResponse.json({ success: false, error: 'User authentication required to send email' }, { status: 401 });
    }

    // Validate SMTP creds exist for user first for clearer error
    const user = await User.findById(effectiveUserId).lean() as any;
    const creds = user?.credentials || {};
    const missing: string[] = [];
    if (!creds.SMTP_HOST) missing.push('SMTP_HOST');
    if (!creds.SMTP_PORT) missing.push('SMTP_PORT');
    if (!creds.SMTP_USER) missing.push('SMTP_USER');
    if (!creds.SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
    if (missing.length > 0) {
      return NextResponse.json({ success: false, error: `Missing SMTP credentials: ${missing.join(', ')}`, missingCredentials: missing }, { status: 400 });
    }

    // Use per-user SMTP only; no env fallback
    const result = await emailService.sendEmailForUser(effectiveUserId, emailConfig);

    if (result.success) {
      // Update statuses on successful send
      aiResponse.status = 'sent';
      aiResponse.sentAt = new Date();
      aiResponse.sentMessageId = result.messageId;
      await aiResponse.save();

      originalEmail.status = 'responded';
      originalEmail.respondedAt = new Date();
      await originalEmail.save();

      console.log(`✅ Email sent successfully to ${originalEmail.leadEmail}. Message ID: ${result.messageId}`);
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      // Log failure but don't retry here, keep it simple
      aiResponse.status = 'failed';
      aiResponse.lastError = result.error;
      await aiResponse.save();

      console.error(`❌ Failed to send manual email for responseId: ${responseId}. Error: ${result.error}`);
      return NextResponse.json({ success: false, error: `Failed to send email: ${result.error}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Error in manual send endpoint:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unknown error occurred' }, { status: 500 });
  }
}