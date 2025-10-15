import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, stage, companySettings, userPrompt } = await request.json();

    if (!prompt || !stage || !companySettings) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a comprehensive prompt that ensures proper formatting
    const systemPrompt = `You are an expert email marketing copywriter specializing in B2B lead generation emails. 

Your task is to generate a professional email template based on the user's custom requirements while maintaining proper formatting and including all required placeholders.

CRITICAL EMAIL STRUCTURE TO FOLLOW:
Use this professional one-paragraph business email structure:
1. Subject: Clear and specific topic (short and direct)
2. Greeting: Dear [Name]
3. Opening Line: Polite introduction or context - who you are or why you're writing
4. Main Message: State your purpose clearly with key information that shows value or reason for contact
5. Call to Action: What you'd like the recipient to do next (reply, schedule call, review, confirm)
6. Closing: Short, polite ending line (e.g., "Looking forward to your response")
7. Signature: Full name, position, company, website, email, phone, LinkedIn

CRITICAL REQUIREMENTS:
1. You MUST include ALL of these placeholders in the email content: {{LEAD_NAME}}, {{COMPANY_NAME}}, {{COMPANY_REVIEW}}, {{SENDER_NAME}}, {{SENDER_EMAIL}}, {{COMPANY_SERVICE}}, {{TARGET_INDUSTRY}}, {{WEBSITE_URL}}
2. If {{COMPANY_REVIEW}} is present, naturally reference their reviews/ratings in the opening or main message to show you did research about their business
3. Generate HTML content with inline CSS styles for email compatibility
4. Include a plain text version
5. Make it mobile-responsive
6. Include clear call-to-action buttons
7. Use professional but engaging tone
8. Keep email concise and focused on one clear purpose
9. Return ONLY valid JSON in this exact format:

{
  "subject": "Email subject line here",
  "htmlContent": "Complete HTML email with inline styles and all required placeholders",
  "textContent": "Plain text version with all required placeholders"
}

The email should be professionally designed, engaging, and include all the required placeholders naturally within the content.`;

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
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    // Parse the JSON response
    let template;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      template = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate that all required placeholders are present
    const requiredPlaceholders = [
      '{{LEAD_NAME}}',
      '{{COMPANY_NAME}}',
      '{{COMPANY_REVIEW}}',
      '{{SENDER_NAME}}',
      '{{SENDER_EMAIL}}',
      '{{COMPANY_SERVICE}}',
      '{{TARGET_INDUSTRY}}',
      '{{WEBSITE_URL}}'
    ];

    const htmlContent = template.htmlContent || '';
    const textContent = template.textContent || '';
    
    // Check if placeholders are missing and add them if necessary
    const missingPlaceholders = requiredPlaceholders.filter(placeholder => 
      !htmlContent.includes(placeholder) && !textContent.includes(placeholder)
    );

    if (missingPlaceholders.length > 0) {
      console.warn('Missing placeholders, regenerating with explicit instructions...');
      
      // Regenerate with more explicit instructions
      const enhancedPrompt = `${prompt}

IMPORTANT: The email MUST include these exact placeholders in the content:
${requiredPlaceholders.join(', ')}

Please naturally incorporate ALL of these placeholders into the email content.`;

      const secondCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const secondContent = secondCompletion.choices[0]?.message?.content;
      if (secondContent) {
        const cleanSecondContent = secondContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        template = JSON.parse(cleanSecondContent);
      }
    }

    // Final validation
    if (!template.subject || !template.htmlContent) {
      throw new Error('Generated template is missing required fields');
    }

    return NextResponse.json({
      success: true,
      template: {
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent || template.htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML as fallback
        stage,
        userPrompt,
        variables: requiredPlaceholders
      }
    });

  } catch (error) {
    console.error('Error generating custom email template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate template' 
      },
      { status: 500 }
    );
  }
} 