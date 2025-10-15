import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST - Generate ONLY email content (body) from prompt using OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, stage, companySettings } = body;
    
    // Validate input
    if (!prompt || !companySettings) {
      return NextResponse.json(
        { success: false, error: 'Prompt and company settings are required' },
        { status: 400 }
      );
    }

    // Use OpenAI to generate ONLY the email content (no subject, no signature)
    const systemPrompt = `You are an expert B2B email copywriter who creates highly effective email content.

CRITICAL INSTRUCTIONS:
1. Generate ONLY the main email body/content (NO subject line, NO signature)
2. Use professional one-paragraph business email structure:
   - Opening Line: Polite introduction or context
   - Main Message: State purpose clearly with key information that shows value
   - Call to Action: What you'd like recipient to do next
   - Closing: Short, polite ending line (e.g., "Looking forward to your response")
3. MUST include these variables naturally in the content: {{LEAD_NAME}}, {{COMPANY_NAME}}, {{COMPANY_REVIEW}}, {{SENDER_NAME}}, {{COMPANY_SERVICE}}, {{TARGET_INDUSTRY}}
4. If {{COMPANY_REVIEW}} is mentioned, reference it naturally to show research
5. Use HTML paragraph tags with inline CSS styles for email compatibility
6. Professional but friendly tone
7. Keep concise and focused on one clear purpose
8. Mobile-responsive formatting

Return ONLY the HTML content (just paragraph tags with inline styles, NO JSON wrapper, NO subject, NO signature).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    // Clean up the response (remove any markdown code blocks if present)
    let cleanedContent = content.trim();
    cleanedContent = cleanedContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');

    return NextResponse.json({
      success: true,
      content: cleanedContent
    });

  } catch (error: any) {
    console.error('Content generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate email content'
      },
      { status: 500 }
    );
  }
}
