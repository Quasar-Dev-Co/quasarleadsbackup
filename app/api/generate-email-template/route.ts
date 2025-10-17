import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST - Generate email template using AI with OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, stage, companySettings } = body;
    
    // Validate input
    if (!prompt || !stage || !companySettings) {
      return NextResponse.json(
        { success: false, error: 'Prompt, stage, and company settings are required' },
        { status: 400 }
      );
    }

    // Use OpenAI to generate the email template
    const systemPrompt = `You are an expert B2B email copywriter who creates email templates for automated outreach systems.

IMPORTANT: You need to generate template COMPONENTS that will be used by AI during email automation:

1. SUBJECT: A clear, compelling subject line (plain text)
2. CONTENT PROMPT: A detailed prompt/instruction that describes what the email should say. This will be used by AI to generate personalized content for each lead.
3. SIGNATURE: Professional email signature with placeholders

CONTENT PROMPT REQUIREMENTS:
- Write a detailed prompt describing the email's message, tone, and purpose
- Include instructions about what to mention (company service, value proposition, etc.)
- Mention to reference {{COMPANY_REVIEW}} if available
- Specify the tone (professional, friendly, etc.)
- Include call-to-action instructions
Example: "Write a professional email introducing our AI-powered lead generation service. Mention how we can help them improve their business. If company reviews are available, reference them to show we did research. Keep it friendly and professional. Include a call-to-action to schedule a call."

SIGNATURE REQUIREMENTS:
- Use HTML formatting
- Include these placeholders: {{SENDER_NAME}}, {{SENDER_EMAIL}}, {{WEBSITE_URL}}
Example: "Best regards,<br>{{SENDER_NAME}}<br>{{SENDER_EMAIL}}<br>{{WEBSITE_URL}}"

Return ONLY valid JSON in this exact format:
{
  "subject": "Email subject here",
  "contentPrompt": "Detailed prompt for AI to generate email content",
  "signature": "HTML signature with placeholders"
}`;

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
      max_tokens: 2500,
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
      // Fallback to pre-built templates if OpenAI parsing fails
      const generatedTemplate = generateTemplateForStage(stage, companySettings);
      return NextResponse.json({
        success: true,
        template: generatedTemplate,
        message: 'Template generated successfully (fallback)'
      });
    }

    // Validate required fields - support BOTH new (contentPrompt) and old (htmlContent) formats
    if (!template.subject) {
      throw new Error('Generated template is missing subject field');
    }
    
    // Check if it's new format (contentPrompt) or old format (htmlContent)
    const hasNewFormat = template.contentPrompt || template.signature;
    const hasOldFormat = template.htmlContent;
    
    if (!hasNewFormat && !hasOldFormat) {
      throw new Error('Generated template must have either contentPrompt or htmlContent');
    }

    return NextResponse.json({
      success: true,
      template: {
        subject: template.subject,
        contentPrompt: template.contentPrompt || '',
        signature: template.signature || '',
        htmlContent: template.htmlContent || '',
        textContent: template.textContent || '',
        stage
      },
      message: 'Template generated successfully'
    });

  } catch (error: any) {
    console.error('Template generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate template'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate professional email template based on stage and company settings
 */
function generateTemplateForStage(stage: string, companySettings: any) {
  const { companyName, service, industry, senderName } = companySettings;
  
  const templates = {
    called_once: {
      subject: `Transform ${industry} Lead Generation with ${companyName}`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${companyName}</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">${service}</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Hello {{LEAD_NAME}},</h2>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I hope this message finds you well. I've been researching companies in the ${industry} space, and {{COMPANY_NAME}} caught my attention as a forward-thinking organization.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              At ${companyName}, we specialize in ${service} and have helped ${industry} companies like yours achieve remarkable growth through strategic lead generation.
            </p>
            
            <div style="background: #f7fafc; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #2d3748; margin-top: 0; font-size: 20px;">What We Can Deliver for {{COMPANY_NAME}}:</h3>
              <ul style="color: #4a5568; line-height: 1.8; padding-left: 20px;">
                <li>🎯 Targeted lead generation strategies for ${industry}</li>
                <li>📈 Proven systems that generate 3-5x more qualified prospects</li>
                <li>⚡ Automated workflows that save 15+ hours per week</li>
                <li>📊 Real-time analytics and performance tracking</li>
              </ul>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 30px; font-size: 16px;">
              Would you be open to a brief 15-minute conversation this week? I'd love to share some specific insights about lead generation opportunities in the ${industry} market that could benefit {{COMPANY_NAME}}.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:{{SENDER_EMAIL}}?subject=Interested in ${companyName} Lead Generation" 
                 style="background: #667eea; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.4);">
                Let's Schedule a Call
              </a>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Best regards,<br>
              <strong style="color: #2d3748;">{{SENDER_NAME}}</strong><br>
              <span style="color: #718096;">${service} Specialist</span><br>
              <span style="color: #718096;">${companyName}</span>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0;">
              You're receiving this email because we believe ${companyName} can help {{COMPANY_NAME}} achieve its growth goals.
            </p>
          </div>
        </div>
      `,
      textContent: `
Hello {{LEAD_NAME}},

I hope this message finds you well. I've been researching companies in the ${industry} space, and {{COMPANY_NAME}} caught my attention as a forward-thinking organization.

At ${companyName}, we specialize in ${service} and have helped ${industry} companies like yours achieve remarkable growth through strategic lead generation.

What We Can Deliver for {{COMPANY_NAME}}:
• Targeted lead generation strategies for ${industry}
• Proven systems that generate 3-5x more qualified prospects
• Automated workflows that save 15+ hours per week
• Real-time analytics and performance tracking

Would you be open to a brief 15-minute conversation this week? I'd love to share some specific insights about lead generation opportunities in the ${industry} market that could benefit {{COMPANY_NAME}}.

Best regards,
{{SENDER_NAME}}
${service} Specialist
${companyName}

---
You're receiving this email because we believe ${companyName} can help {{COMPANY_NAME}} achieve its growth goals.
      `
    },

    called_twice: {
      subject: `Quick Follow-up: ${industry} Lead Generation Insights for {{COMPANY_NAME}}`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${companyName}</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Follow-up on ${service}</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Hi {{LEAD_NAME}},</h2>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I wanted to follow up on my previous email regarding ${service} opportunities for {{COMPANY_NAME}}.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I understand you're busy managing {{COMPANY_NAME}}, but I thought you'd be interested in some recent results we've achieved for ${industry} companies similar to yours:
            </p>
            
            <div style="background: #f7fafc; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #f5576c;">
              <h3 style="color: #2d3748; margin-top: 0; font-size: 20px;">Recent ${industry} Client Results:</h3>
              <ul style="color: #4a5568; line-height: 1.8; padding-left: 20px;">
                <li>📈 280% increase in qualified leads within 45 days</li>
                <li>⭐ 94% email deliverability rate with premium prospects</li>
                <li>🎯 Identified 200+ high-value prospects in ${industry}</li>
                <li>💰 Generated $75K+ in new pipeline value</li>
              </ul>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 30px; font-size: 16px;">
              Would you be interested in a brief 10-minute call to explore how we could achieve similar results for {{COMPANY_NAME}}? I can share specific strategies that work particularly well in the ${industry} sector.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:{{SENDER_EMAIL}}?subject=Let's Discuss ${companyName} for {{COMPANY_NAME}}" 
                 style="background: #f5576c; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(245, 87, 108, 0.4);">
                Yes, Let's Connect
              </a>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Best regards,<br>
              <strong style="color: #2d3748;">{{SENDER_NAME}}</strong><br>
              <span style="color: #718096;">${companyName}</span>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0;">
              If this isn't relevant, simply reply "NOT INTERESTED" and I won't follow up again.
            </p>
          </div>
        </div>
      `,
      textContent: `
Hi {{LEAD_NAME}},

I wanted to follow up on my previous email regarding ${service} opportunities for {{COMPANY_NAME}}.

I understand you're busy managing {{COMPANY_NAME}}, but I thought you'd be interested in some recent results we've achieved for ${industry} companies similar to yours:

Recent ${industry} Client Results:
• 280% increase in qualified leads within 45 days
• 94% email deliverability rate with premium prospects
• Identified 200+ high-value prospects in ${industry}
• Generated $75K+ in new pipeline value

Would you be interested in a brief 10-minute call to explore how we could achieve similar results for {{COMPANY_NAME}}? I can share specific strategies that work particularly well in the ${industry} sector.

Best regards,
{{SENDER_NAME}}
${companyName}

---
If this isn't relevant, simply reply "NOT INTERESTED" and I won't follow up again.
      `
    },

    called_three_times: {
      subject: `QuasarLeads - Quick Question About Your Lead Generation`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${companyName}</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Third Follow-up</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Hi {{LEAD_NAME}},</h2>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I realize you've received a couple of emails from me about ${companyName}, and I don't want to be a bother.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Before I wrap up my outreach, I have a quick question: <strong>What's your biggest challenge with lead generation right now?</strong>
            </p>
            
            <div style="background: #e8f4fd; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #4facfe;">
              <h3 style="color: #2d3748; margin-top: 0; font-size: 20px;">Common challenges we solve:</h3>
              <ul style="color: #4a5568; line-height: 1.8; padding-left: 20px;">
                <li>🔍 Finding qualified prospects in the ${industry} space</li>
                <li>📧 Getting responses from cold outreach campaigns</li>
                <li>⏰ Time-consuming manual research processes</li>
                <li>💰 High cost per lead from traditional ${industry} marketing</li>
              </ul>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 30px; font-size: 16px;">
              If any of these resonate with {{COMPANY_NAME}}, I'd love to share how we've helped similar ${industry} companies overcome these exact challenges.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:{{SENDER_EMAIL}}?subject=Lead Generation Challenge at {{COMPANY_NAME}}" 
                 style="background: #4facfe; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(79, 172, 254, 0.4);">
                Share Your Challenge
              </a>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Best regards,<br>
              <strong style="color: #2d3748;">{{SENDER_NAME}}</strong><br>
              <span style="color: #718096;">${companyName}</span>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0;">
              If you'd prefer not to hear from me again, just reply "NO THANKS" and I'll respect your wishes.
            </p>
          </div>
        </div>
      `,
      textContent: `
Hi {{LEAD_NAME}},

I realize you've received a couple of emails from me about ${companyName}, and I don't want to be a bother.

Before I wrap up my outreach, I have a quick question: What's your biggest challenge with lead generation right now?

Common challenges we solve:
• Finding qualified prospects in the ${industry} space
• Getting responses from cold outreach campaigns
• Time-consuming manual research processes
• High cost per lead from traditional ${industry} marketing

If any of these resonate with {{COMPANY_NAME}}, I'd love to share how we've helped similar ${industry} companies overcome these exact challenges.

Best regards,
{{SENDER_NAME}}
${companyName}

---
If you'd prefer not to hear from me again, just reply "NO THANKS" and I'll respect your wishes.
      `
    },

    called_four_times: {
      subject: `Case Study: How a ${industry} Company Increased Leads by 400%`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 40px 30px; text-align: center; color: #2d3748;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${companyName}</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.8;">Case Study Spotlight</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Hi {{LEAD_NAME}},</h2>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I wanted to share a recent success story from the ${industry} space that might interest you, especially given {{COMPANY_NAME}}'s position in the market.
            </p>
            
            <div style="background: #f0fff4; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #48bb78;">
              <h3 style="color: #2d3748; margin-top: 0; font-size: 20px;">📊 Real ${industry} Case Study:</h3>
              <p style="color: #4a5568; margin-bottom: 15px; line-height: 1.8;">
                A ${industry} company similar to {{COMPANY_NAME}} was struggling with expensive, low-quality leads from traditional marketing channels.
              </p>
              <h4 style="color: #2d3748; margin: 15px 0 10px 0; font-size: 18px;">Results after 60 days with ${companyName}:</h4>
              <ul style="color: #4a5568; line-height: 1.8; padding-left: 20px;">
                <li>🚀 <strong>400% increase</strong> in qualified ${industry} leads</li>
                <li>💰 <strong>67% reduction</strong> in cost per lead</li>
                <li>⭐ <strong>94% email deliverability</strong> rate with ${industry} prospects</li>
                <li>📈 <strong>$120K+</strong> in new ${industry} pipeline generated</li>
              </ul>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              The key was identifying ${industry} prospects who were already spending money on ads but weren't ranking organically - exactly the kind of high-intent leads that convert.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 30px; font-size: 16px;">
              I'm curious - would you be interested in seeing how this same strategy could work for {{COMPANY_NAME}} in the ${industry} market?
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:{{SENDER_EMAIL}}?subject=Yes, Show Me the ${industry} Case Study" 
                 style="background: #48bb78; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(72, 187, 120, 0.4);">
                Show Me How This Works
              </a>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Best regards,<br>
              <strong style="color: #2d3748;">{{SENDER_NAME}}</strong><br>
              <span style="color: #718096;">${companyName}</span>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0;">
              Real results from real ${industry} clients. No generic promises, just proven strategies.
            </p>
          </div>
        </div>
      `,
      textContent: `
Hi {{LEAD_NAME}},

I wanted to share a recent success story from the ${industry} space that might interest you, especially given {{COMPANY_NAME}}'s position in the market.

REAL ${industry.toUpperCase()} CASE STUDY:
A ${industry} company similar to {{COMPANY_NAME}} was struggling with expensive, low-quality leads from traditional marketing channels.

Results after 60 days with ${companyName}:
• 400% increase in qualified ${industry} leads
• 67% reduction in cost per lead
• 94% email deliverability rate with ${industry} prospects
• $120K+ in new ${industry} pipeline generated

The key was identifying ${industry} prospects who were already spending money on ads but weren't ranking organically - exactly the kind of high-intent leads that convert.

I'm curious - would you be interested in seeing how this same strategy could work for {{COMPANY_NAME}} in the ${industry} market?

Best regards,
{{SENDER_NAME}}
${companyName}

---
Real results from real ${industry} clients. No generic promises, just proven strategies.
      `
    },

    called_five_times: {
      subject: `{{LEAD_NAME}}, Is Lead Generation Still a Priority for {{COMPANY_NAME}}?`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 40px 30px; text-align: center; color: #8b4513;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${companyName}</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Checking In</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Hi {{LEAD_NAME}},</h2>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I've reached out a few times about helping {{COMPANY_NAME}} with ${service} in the ${industry} space, and I haven't heard back.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I'm wondering if this means:
            </p>
            
            <div style="background: #fff8e1; padding: 25px; border-radius: 12px; margin: 30px 0;">
              <ul style="color: #4a5568; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>❓ Lead generation isn't a current priority for {{COMPANY_NAME}}</li>
                <li>✅ You're already happy with your current ${industry} lead sources</li>
                <li>💼 You're too busy managing {{COMPANY_NAME}} to explore new opportunities</li>
                <li>🤔 My emails aren't reaching the right person at {{COMPANY_NAME}}</li>
              </ul>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              If lead generation <strong>is</strong> still important to {{COMPANY_NAME}}, I'd love to share one specific insight that could help you identify 50+ new ${industry} prospects this week.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 30px; font-size: 16px;">
              If not, just let me know and I'll stop following up. I respect your time and don't want to be a bother.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:{{SENDER_EMAIL}}?subject=Yes, Lead Generation is Still a Priority for {{COMPANY_NAME}}" 
                 style="background: #fcb69f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 10px; font-weight: 600; font-size: 16px;">
                Yes, Still Interested
              </a>
              <a href="mailto:{{SENDER_EMAIL}}?subject=No, Please Stop Following Up with {{COMPANY_NAME}}" 
                 style="background: #cbd5e0; color: #4a5568; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                Not Right Now
              </a>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Best regards,<br>
              <strong style="color: #2d3748;">{{SENDER_NAME}}</strong><br>
              <span style="color: #718096;">${companyName}</span>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0;">
              Your feedback helps us better understand how to serve ${industry} companies like {{COMPANY_NAME}}.
            </p>
          </div>
        </div>
      `,
      textContent: `
Hi {{LEAD_NAME}},

I've reached out a few times about helping {{COMPANY_NAME}} with ${service} in the ${industry} space, and I haven't heard back.

I'm wondering if this means:
• Lead generation isn't a current priority for {{COMPANY_NAME}}
• You're already happy with your current ${industry} lead sources
• You're too busy managing {{COMPANY_NAME}} to explore new opportunities
• My emails aren't reaching the right person at {{COMPANY_NAME}}

If lead generation IS still important to {{COMPANY_NAME}}, I'd love to share one specific insight that could help you identify 50+ new ${industry} prospects this week.

If not, just let me know and I'll stop following up. I respect your time and don't want to be a bother.

Reply with:
- "YES" if you're still interested
- "NO" if you'd like me to stop following up

Best regards,
{{SENDER_NAME}}
${companyName}

---
Your feedback helps us better understand how to serve ${industry} companies like {{COMPANY_NAME}}.
      `
    },

    called_six_times: {
      subject: `One Last Resource for {{COMPANY_NAME}} - Then I'll Step Back`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${companyName}</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Final Resource</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Hi {{LEAD_NAME}},</h2>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              I know I've reached out several times, and I appreciate your patience. This will be my final email.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Even if ${companyName} isn't the right fit for {{COMPANY_NAME}} right now, I wanted to leave you with something valuable:
            </p>
            
            <div style="background: #e6fffa; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #38b2ac;">
              <h3 style="color: #2d3748; margin-top: 0; font-size: 20px;">🎁 Free ${industry} Lead Generation Checklist:</h3>
              <ul style="color: #4a5568; line-height: 1.8; padding-left: 20px;">
                <li>✅ 7 places to find high-quality ${industry} prospects online</li>
                <li>📧 Email templates that get 40%+ open rates in ${industry}</li>
                <li>🔍 Free tools for finding ${industry} contact information</li>
                <li>📊 Metrics to track ${industry} lead quality and ROI</li>
                <li>⚡ Automation strategies to save 10+ hours/week on ${industry} outreach</li>
              </ul>
              <p style="color: #4a5568; margin: 15px 0 0 0; font-style: italic; font-size: 15px;">
                No strings attached - just value I can provide to {{COMPANY_NAME}}.
              </p>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              If you'd like this ${industry} lead generation checklist, just reply with "CHECKLIST" and I'll send it over immediately.
            </p>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 30px; font-size: 16px;">
              And if you ever decide to explore lead generation partnerships for {{COMPANY_NAME}} in the future, you know where to find me.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:{{SENDER_EMAIL}}?subject=CHECKLIST - Please Send the ${industry} Lead Generation Resources" 
                 style="background: #38b2ac; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(56, 178, 172, 0.4);">
                Send Me the Checklist
              </a>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Wishing {{COMPANY_NAME}} continued success in the ${industry} market,<br>
              <strong style="color: #2d3748;">{{SENDER_NAME}}</strong><br>
              <span style="color: #718096;">${companyName}</span>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0;">
              This is my final outreach email. Thank you for your time and consideration.
            </p>
          </div>
        </div>
      `,
      textContent: `
Hi {{LEAD_NAME}},

I know I've reached out several times, and I appreciate your patience. This will be my final email.

Even if ${companyName} isn't the right fit for {{COMPANY_NAME}} right now, I wanted to leave you with something valuable:

FREE ${industry.toUpperCase()} LEAD GENERATION CHECKLIST:
✅ 7 places to find high-quality ${industry} prospects online
📧 Email templates that get 40%+ open rates in ${industry}
🔍 Free tools for finding ${industry} contact information
📊 Metrics to track ${industry} lead quality and ROI
⚡ Automation strategies to save 10+ hours/week on ${industry} outreach

No strings attached - just value I can provide to {{COMPANY_NAME}}.

If you'd like this ${industry} lead generation checklist, just reply with "CHECKLIST" and I'll send it over immediately.

And if you ever decide to explore lead generation partnerships for {{COMPANY_NAME}} in the future, you know where to find me.

Wishing {{COMPANY_NAME}} continued success in the ${industry} market,
{{SENDER_NAME}}
${companyName}

---
This is my final outreach email. Thank you for your time and consideration.
      `
    },

    called_seven_times: {
      subject: `Breaking Up is Hard to Do - {{COMPANY_NAME}} Final Goodbye`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 40px 30px; text-align: center; color: #744c4c;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${companyName}</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">The Final Goodbye</p>
          </div>
          
          <div style="padding: 40px 30px; background: white;">
            <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Dear {{LEAD_NAME}},</h2>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              Well, this is awkward. I've been trying to get your attention for a while now, and it's clear that {{COMPANY_NAME}} and ${companyName} just aren't meant to be.
            </p>
            
            <div style="background: #fef2f2; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #f56565;">
              <h3 style="color: #2d3748; margin-top: 0; font-size: 20px;">💔 This is our official breakup email</h3>
              <p style="color: #4a5568; line-height: 1.8; margin: 0; font-size: 16px;">
                I'm filing for separation from your inbox. I promise to return all your unread email space and won't ask for half of your ${industry} lead generation budget.
              </p>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              But seriously, {{LEAD_NAME}}, I want you to know that this isn't about you - it's about me. Specifically, my inability to craft an email compelling enough to earn 30 seconds of your valuable time.
            </p>
            
            <div style="background: #f0fff4; padding: 25px; border-radius: 12px; margin: 30px 0;">
              <h4 style="color: #2d3748; margin-top: 0; font-size: 18px;">🤝 No hard feelings though!</h4>
              <p style="color: #4a5568; line-height: 1.8; margin-bottom: 15px; font-size: 16px;">Here's what I wish for {{COMPANY_NAME}}:</p>
              <ul style="color: #4a5568; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>🚀 May your ${industry} leads always be qualified and ready to buy</li>
                <li>📈 May your conversion rates exceed all ${industry} benchmarks</li>
                <li>💰 May your ROI in ${industry} marketing be legendary</li>
                <li>⭐ May your ${industry} clients always leave glowing 5-star reviews</li>
              </ul>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
              If you ever change your mind about ${service} (or if you were just playing hard to get this whole time), you know how to reach me. I'll be here, probably writing overly dramatic breakup emails to other ${industry} prospects.
            </p>
            
            <div style="text-align: center; margin: 30px 0; padding: 25px; background: #fff5f5; border-radius: 12px;">
              <p style="color: #744c4c; font-style: italic; margin: 0; font-size: 18px; line-height: 1.6;">
                "It's not you, it's your ${industry} lead generation strategy."<br>
                <small style="font-size: 14px; opacity: 0.8;">- Every sales email ever</small>
              </p>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 30px; font-size: 16px;">
              Farewell, {{COMPANY_NAME}}. It's been real, it's been fun, but it hasn't been real fun.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:{{SENDER_EMAIL}}?subject=Wait! Don't Break Up With {{COMPANY_NAME}} Yet!" 
                 style="background: #f56565; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(245, 101, 101, 0.4);">
                Wait, Don't Go! 💔
              </a>
            </div>
            
            <p style="color: #4a5568; line-height: 1.8; margin-bottom: 15px; font-size: 16px;">
              Signing off for the last time,<br>
              <strong style="color: #2d3748;">{{SENDER_NAME}}</strong><br>
              <em style="color: #718096;">Your Former ${industry} Lead Generation Admirer</em><br>
              <span style="color: #718096;">${companyName}</span>
            </p>
            
            <p style="color: #a0aec0; font-size: 14px; font-style: italic;">
              P.S. If this email made you smile, my work here is done. 😊
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0;">
              This is really, truly, definitely the last email about ${service}. Unless you reply. Then we might have to get back together. ❤️
            </p>
          </div>
        </div>
      `,
      textContent: `
Dear {{LEAD_NAME}},

Well, this is awkward. I've been trying to get your attention for a while now, and it's clear that {{COMPANY_NAME}} and ${companyName} just aren't meant to be.

💔 THIS IS OUR OFFICIAL BREAKUP EMAIL

I'm filing for separation from your inbox. I promise to return all your unread email space and won't ask for half of your ${industry} lead generation budget.

But seriously, {{LEAD_NAME}}, I want you to know that this isn't about you - it's about me. Specifically, my inability to craft an email compelling enough to earn 30 seconds of your valuable time.

🤝 NO HARD FEELINGS THOUGH!

Here's what I wish for {{COMPANY_NAME}}:
🚀 May your ${industry} leads always be qualified and ready to buy
📈 May your conversion rates exceed all ${industry} benchmarks
💰 May your ROI in ${industry} marketing be legendary
⭐ May your ${industry} clients always leave glowing 5-star reviews

If you ever change your mind about ${service} (or if you were just playing hard to get this whole time), you know how to reach me. I'll be here, probably writing overly dramatic breakup emails to other ${industry} prospects.

"It's not you, it's your ${industry} lead generation strategy."
- Every sales email ever

Farewell, {{COMPANY_NAME}}. It's been real, it's been fun, but it hasn't been real fun.

Signing off for the last time,
{{SENDER_NAME}}
Your Former ${industry} Lead Generation Admirer
${companyName}

P.S. If this email made you smile, my work here is done. 😊

---
This is really, truly, definitely the last email about ${service}. Unless you reply. Then we might have to get back together. ❤️
      `
    }
  };

  return templates[stage as keyof typeof templates] || templates.called_once;
} 