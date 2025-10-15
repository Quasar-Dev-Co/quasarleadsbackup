import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { IncomingEmail, AIResponse } from '@/models/emailResponseSchema';
import mongoose from 'mongoose';

// AI Settings Schema (copied from settings route)
const aiSettingsSchema = new mongoose.Schema({
  isEnabled: { type: Boolean, default: true },
  autoSendThreshold: { type: Number, default: 85 },
  defaultTone: {
    type: String,
    enum: ['professional', 'friendly', 'casual', 'formal'],
    default: 'professional'
  },
  includeCompanyInfo: { type: Boolean, default: true },
  maxResponseLength: { type: Number, default: 300 },
  customInstructions: { type: String, default: '' },
  responsePrompt: { type: String, default: '' },
  companyName: { type: String, default: 'QuasarSEO' },
  senderName: { type: String, default: 'Team QuasarSEO' },
  senderEmail: { type: String, default: 'info@quasarseo.nl' },
  signature: { type: String, default: 'Warmly,\nTeam QuasarSEO' },
  settingsId: { type: String, default: 'default' }
}, {
  timestamps: true
});
const AISettings = mongoose.models.AISettings || mongoose.model('AISettings', aiSettingsSchema);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * POST: Generates an AI response for an incoming email.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const body = await request.json();
    const authHeader = request.headers.get('authorization') || '';
    const bearerUserId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    const { 
      incomingEmailId, 
      leadInfo, 
      emailContent, 
      emailSubject
      // aiSettings (ignore this from frontend)
    } = body;
    
    if (!incomingEmailId) {
      return NextResponse.json({
        success: false,
        error: 'Incoming email ID is required'
      }, { status: 400 });
    }
    
    // Find the incoming email
    const incomingEmail = await IncomingEmail.findById(incomingEmailId);
    if (!incomingEmail) {
      return NextResponse.json({
        success: false,
        error: 'Incoming email not found'
      }, { status: 404 });
    }
    
    // Fetch latest AI settings from DB
    const aiSettings = await AISettings.findOne({ settingsId: 'default' }).lean();
    if (!aiSettings) {
      return NextResponse.json({
        success: false,
        error: 'AI settings not found in database.'
      }, { status: 500 });
    }
    
    // Check if AI response already exists for this email
    const existingResponse = await AIResponse.findOne({ incomingEmailId });
    if (existingResponse) {
      return NextResponse.json({
        success: true,
        response: {
          id: existingResponse._id.toString(),
          incomingEmailId: existingResponse.incomingEmailId.toString(),
          generatedSubject: existingResponse.generatedSubject,
          generatedContent: existingResponse.generatedContent,
          confidence: 85, // Default confidence
          reasoning: existingResponse.reasoning,
          status: existingResponse.status,
          createdAt: existingResponse.createdAt,
          responseType: 'general' as const
        },
        message: 'AI response already exists for this email'
      });
    }
    
    // Generate AI response using latest settings
    const aiResponse = await generateAIResponse(incomingEmail, aiSettings);
    
    if (aiResponse.isDropped) {
      return NextResponse.json({
        success: false,
        error: aiResponse.reasoning
      }, { status: 400 });
    }
    
    // Save the AI response to database
    const newAIResponse = new AIResponse({
      incomingEmailId: incomingEmailId,
      generatedSubject: aiResponse.subject,
      generatedContent: aiResponse.content,
      status: 'sending', // Changed from 'draft' to 'sending'
      responseType: 'ai_generated',
      reasoning: aiResponse.reasoning,
      userId: bearerUserId || undefined,
    });
    
    await newAIResponse.save();
    
    console.log(`✅ AI response generated for email ${incomingEmailId}`);
    
    return NextResponse.json({
      success: true,
      response: {
        id: newAIResponse._id.toString(),
        incomingEmailId: newAIResponse.incomingEmailId.toString(),
        generatedSubject: newAIResponse.generatedSubject,
        generatedContent: newAIResponse.generatedContent,
        confidence: 85, // Default confidence
        reasoning: newAIResponse.reasoning,
        status: newAIResponse.status,
        createdAt: newAIResponse.createdAt,
        responseType: 'general' as const
      },
      message: 'AI response generated successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error generating AI response:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate AI response'
    }, { status: 500 });
  }
}

/**
 * Generates an AI-powered response using the latest settings from database
 */
async function generateAIResponse(email: any, aiSettings?: any): Promise<{ subject: string; content: string; isDropped: boolean; reasoning: string; }> {
  if (!OPENAI_API_KEY) {
    return { isDropped: true, subject: '', content: '', reasoning: 'OPENAI_API_KEY is not configured.' };
  }

  // CRITICAL: Only use the prompt from the database settings (what user configured in frontend)
  if (!aiSettings?.responsePrompt) {
    return { 
      isDropped: true, 
      subject: '', 
      content: '', 
      reasoning: 'No AI prompt found in settings. Please configure the prompt in the frontend AI Response Configuration section.' 
    };
  }

  // Build system prompt from user's configured prompt + guardrails
  const basePrompt: string = aiSettings.responsePrompt || '';
  const extraDirectives = `
You must follow the user's exact persona and tone. Never include placeholders like [your name], [phone], [email], etc. Do not add brackets around variables. Keep the response concise and human.`;
  const systemPrompt = `${basePrompt}\n\n${aiSettings.customInstructions || ''}\n\n${extraDirectives}`.trim();

  // Prepare signature formatting (HTML block with divider and line-break conversion)
  const signatureRaw: string = aiSettings.signature || '';
  const formattedSignature = signatureRaw ? `
<br/><br/>
<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; font-family: Arial, sans-serif;">
${signatureRaw.replace(/\n/g, '<br/>')}
</div>
` : '';

  const userPrompt = `Here is the email you need to respond to using the configured instructions.

RESPONSE REQUIREMENTS:
1) Do NOT use any placeholders. Never write strings like [name], [phone], [email], etc.
2) Do NOT include any signature or sign-off in your response - the signature will be added automatically
3) Keep the body warm and professional. No sales pressure. Keep paragraphs short.
4) End your response after the main content - do not add "Best regards", "Sincerely", etc.

FROM: ${email.leadName} (${email.leadEmail})
SUBJECT: ${email.subject}
CONTENT:
---
${email.content}
---

Respond according to the configured instructions. Output HTML for any formatting you include.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: aiSettings?.maxResponseLength || 400,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API Error: ${response.status} ${response.statusText}`, errorText);
      return { isDropped: true, subject: '', content: '', reasoning: `OpenAI API returned status ${response.status}` };
    }

    const data = await response.json();
    let aiContent = data.choices?.[0]?.message?.content?.trim();

    if (!aiContent) {
      return { isDropped: true, subject: '', content: '', reasoning: 'OpenAI response was empty.' };
    }

    // Generate subject as "Re: [original subject]"
    const subject = `Re: ${email.subject}`;
    
    // Remove any existing signature-like content from AI response to prevent duplicates
    let cleanedContent = aiContent;
    
    // Remove common sign-offs that AI might add
    const signOffPatterns = [
      /Best regards,?\s*[\s\S]*$/i,
      /Sincerely,?\s*[\s\S]*$/i,
      /Kind regards,?\s*[\s\S]*$/i,
      /Thank you,?\s*[\s\S]*$/i,
      /Greetings,?\s*[\s\S]*$/i,
      /---SIGNATURE_START---[\s\S]*?---SIGNATURE_END---/gi,
    ];
    
    signOffPatterns.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '').trim();
    });
    
    // Always append the formatted signature (no duplication check needed since we cleaned the content)
    const content = cleanedContent + formattedSignature;

    if (!content || content.length < 20) {
      return { isDropped: true, subject: '', content: '', reasoning: 'AI content was too short or missing.' };
    }
    
    return {
      isDropped: false,
      subject,
      content,
      reasoning: 'Successfully generated using your configured prompt from frontend settings.'
    };

  } catch (error: any) {
    console.error(`❌ Error calling OpenAI API:`, error.message);
    return { isDropped: true, subject: '', content: '', reasoning: `OpenAI API error: ${error.message}` };
  }
} 