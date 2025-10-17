import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Lead } from '@/models/leadSchema';
import EmailTemplate from '@/models/emailTemplateSchema';
import User from '@/models/userSchema';
import CompanySettings from '@/models/companySettingsSchema';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

// Email sequence stages
const EMAIL_STAGES = [
  'called_once',
  'called_twice', 
  'called_three_times',
  'called_four_times',
  'called_five_times',
  'called_six_times',
  'called_seven_times'
];

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { leadId, forceToStage } = body;
    
    if (!leadId) {
      return NextResponse.json({
        success: false,
        error: 'Lead ID is required'
      }, { status: 400 });
    }
    
    // Find the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({
        success: false,
        error: 'Lead not found'
      }, { status: 404 });
    }
    
    // Determine the next stage
    let nextStage: string;
    
    if (forceToStage) {
      // Manual stage specification
      if (!EMAIL_STAGES.includes(forceToStage)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid email stage'
        }, { status: 400 });
      }
      nextStage = forceToStage;
    } else {
      // Auto progression to next stage
      const currentStageIndex = EMAIL_STAGES.indexOf(lead.emailSequenceStage || 'called_once');
      if (currentStageIndex === -1 || currentStageIndex >= EMAIL_STAGES.length - 1) {
        return NextResponse.json({
          success: false,
          error: 'Lead is already at the final email stage'
        }, { status: 400 });
      }
      nextStage = EMAIL_STAGES[currentStageIndex + 1];
    }
    
    // Get the userId from the lead for user-specific templates and settings
    const userId = lead.userId || lead.assignedTo || lead.leadsCreatedBy;
    
    // Get email template (prefer user-specific, fallback to global)
    let template = userId 
      ? await EmailTemplate.findOne({ stage: nextStage, isActive: true, userId }).lean()
      : null;
    
    if (!template) {
      template = await EmailTemplate.findOne({ 
        stage: nextStage, 
        isActive: true, 
        $or: [{ userId: { $exists: false } }, { userId: '' }, { userId: null }] 
      }).lean();
    }
    
    // Get company settings (prefer user-specific, fallback to default)
    let companySettings = userId 
      ? await CompanySettings.findOne({ userId }).lean()
      : null;
    
    if (!companySettings) {
      companySettings = await CompanySettings.findOne({ type: 'default' }).lean();
    }
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: `No active email template found for stage: ${nextStage}`
      }, { status: 404 });
    }
    
    if (!companySettings) {
      return NextResponse.json({
        success: false,
        error: 'Company settings not found'
      }, { status: 404 });
    }
    
    // Process email template with variables (supports both modular and legacy)
    const emailContent = await processEmailTemplate(template, lead, companySettings, nextStage);
    
    // Send email immediately using user's SMTP credentials if available
    const emailResult = await sendEmail(lead.email, emailContent.subject, emailContent.htmlContent, emailContent.textContent, userId);
    
    if (emailResult.success) {
      // Check if this is the final stage
      const isCompleted = nextStage === 'called_seven_times';
      
      // Update lead with new stage and email history
      const updateData = {
        emailSequenceStage: nextStage,
        emailSequenceStep: EMAIL_STAGES.indexOf(nextStage) + 1,
        emailStatus: 'sent',
        emailRetryCount: 0,
        emailLastAttempt: new Date(),
        // Mark sequence as inactive if completed
        emailSequenceActive: !isCompleted,
        status: isCompleted ? 'emailed' : lead.status, // Update status to emailed when completed
        $push: {
          emailHistory: {
            stage: nextStage,
            step: EMAIL_STAGES.indexOf(nextStage) + 1,
            subject: emailContent.subject,
            htmlContent: emailContent.htmlContent,
            textContent: emailContent.textContent,
            sentAt: new Date(),
            retryCount: 0,
            status: 'sent',
            messageId: emailResult.messageId || null,
            forceProgressed: true,
            completed: isCompleted
          }
        },
        updatedAt: new Date()
      };
      
      await Lead.findByIdAndUpdate(leadId, updateData);
      
      console.log(`🚀 Forced email progression: Lead ${lead.name} (${lead.company}) advanced to ${nextStage}`);
      
      return NextResponse.json({
        success: true,
        message: `Email sent successfully and lead advanced to ${nextStage}`,
        data: {
          leadId,
          previousStage: lead.emailSequenceStage,
          newStage: nextStage,
          emailSent: true,
          messageId: emailResult.messageId
        }
      });
      
    } else {
      // Update lead with failed attempt
      const updateData = {
        emailStatus: 'failed',
        emailRetryCount: (lead.emailRetryCount || 0) + 1,
        emailFailureCount: (lead.emailFailureCount || 0) + 1,
        emailLastAttempt: new Date(),
        $push: {
          emailErrors: {
            attemptNumber: (lead.emailRetryCount || 0) + 1,
            error: emailResult.error,
            timestamp: new Date(),
            stage: nextStage,
            forceProgressed: true
          }
        },
        updatedAt: new Date()
      };
      
      await Lead.findByIdAndUpdate(leadId, updateData);
      
      return NextResponse.json({
        success: false,
        error: `Failed to send email: ${emailResult.error}`,
        data: {
          leadId,
          stage: nextStage,
          emailSent: false
        }
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Error in force email progression:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to force email progression'
    }, { status: 500 });
  }
}

// Helper function to get author/owner name
function getAuthorName(lead: any): string {
  if (lead.companyOwner) return lead.companyOwner;
  if (lead.author && lead.author !== 'Unknown Author') return lead.author;
  return lead.name || 'there';
}

// Replace template variables with actual values
function replaceEmailVariables(content: string, lead: any, companySettings: any): string {
  const companyReview = lead?.rating && lead?.reviews 
    ? `${lead.rating} stars with ${lead.reviews} reviews`
    : lead?.rating 
    ? `Rated ${lead.rating} stars`
    : 'excellent reputation';

  const variables: Record<string, string> = {
    '{{LEAD_NAME}}': lead.name || 'there',
    '{{NAME}}': lead.name || 'there',
    '{{OWNER_NAME}}': getAuthorName(lead),
    '{{COMPANY_NAME}}': lead.company || 'your company',
    '{{COMPANY_REVIEW}}': companyReview,
    '{{LOCATION}}': lead.location || 'your area',
    '{{SENDER_NAME}}': companySettings?.senderName || 'QuasarSEO Team',
    '{{SENDER_EMAIL}}': companySettings?.senderEmail || 'info@quasarseo.nl',
    '{{COMPANY_SERVICE}}': companySettings?.service || 'AI-powered lead generation',
    '{{TARGET_INDUSTRY}}': companySettings?.industry || 'Technology',
    '{{WEBSITE_URL}}': companySettings?.websiteUrl || 'https://quasarleads.com'
  };

  let processedContent = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    processedContent = processedContent.replace(regex, value || '');
  });

  return processedContent;
}

// Generate email content from prompt using OpenAI
async function generateEmailContentFromPrompt(
  prompt: string,
  lead: any,
  companySettings: any,
  stage: string,
  htmlDesign?: string
): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const companyReview = lead?.rating && lead?.reviews 
      ? `${lead.rating} stars with ${lead.reviews} reviews`
      : lead?.rating 
      ? `Rated ${lead.rating} stars`
      : '';
    
    const leadData = {
      leadName: lead.name || '',
      ownerName: getAuthorName(lead),
      companyName: lead.company || '',
      companyReview: companyReview,
      location: lead.location || '',
      industry: companySettings?.industry || '',
      service: companySettings?.service || '',
      senderName: companySettings?.senderName || 'Team',
      websiteUrl: companySettings?.websiteUrl || ''
    };
    
    let aiPrompt = '';
    
    if (htmlDesign && htmlDesign.trim()) {
      aiPrompt = `You are generating personalized email content for a sales/marketing email.

LEAD INFORMATION:
- Lead Name: ${leadData.leadName}
- Company Owner: ${leadData.ownerName}
- Company Name: ${leadData.companyName}
- Company Reviews: ${leadData.companyReview || 'Not available'}
- Location: ${leadData.location}
- Target Industry: ${leadData.industry}

YOUR COMPANY:
- Service: ${leadData.service}
- Sender Name: ${leadData.senderName}
- Website: ${leadData.websiteUrl}

EMAIL STAGE: ${stage}

USER'S CONTENT PROMPT:
${prompt}

CUSTOM HTML DESIGN TEMPLATE:
${htmlDesign}

INSTRUCTIONS:
1. ANALYZE the HTML design template structure carefully
2. IDENTIFY the styling patterns (classes, inline styles, HTML elements used)
3. Generate content that MATCHES the design's HTML structure and styling
4. Use the SAME HTML elements, classes, and style attributes as the design
5. If the design uses specific div structures, buttons, or formatting, replicate that style
6. Naturally incorporate the lead's data where relevant
7. If company reviews are available, reference them to show research
8. Keep it concise and focused (2-3 short paragraphs max)
9. Include a clear call-to-action
10. Use these placeholders where appropriate:
   - {{LEAD_NAME}} for the lead's name
   - {{OWNER_NAME}} for the company owner
   - {{COMPANY_NAME}} for the company
   - {{COMPANY_REVIEW}} for reviews
   - {{SENDER_NAME}} for your name
   - {{COMPANY_SERVICE}} for your service
   - {{TARGET_INDUSTRY}} for industry
   - {{WEBSITE_URL}} for your website

11. Make it feel personal and human, not templated
12. Return ONLY the main email body content (NO subject line, NO signature, NO {{GENERATED_CONTENT}} placeholder)
13. The content should be ready to replace {{GENERATED_CONTENT}} in the design template

Generate the email body content now with HTML formatting that matches the design:`;
    } else {
      aiPrompt = `You are generating personalized email content for a sales/marketing email.

LEAD INFORMATION:
- Lead Name: ${leadData.leadName}
- Company Owner: ${leadData.ownerName}
- Company Name: ${leadData.companyName}
- Company Reviews: ${leadData.companyReview || 'Not available'}
- Location: ${leadData.location}
- Target Industry: ${leadData.industry}

YOUR COMPANY:
- Service: ${leadData.service}
- Sender Name: ${leadData.senderName}
- Website: ${leadData.websiteUrl}

EMAIL STAGE: ${stage}

USER'S CONTENT PROMPT:
${prompt}

INSTRUCTIONS:
1. Generate ONLY the main email body content (NO subject line, NO signature)
2. Use professional, conversational tone
3. Naturally incorporate the lead's data where relevant
4. If company reviews are available, reference them to show research
5. Keep it concise and focused (2-3 short paragraphs max)
6. Include a clear call-to-action
7. Use these placeholders where appropriate:
   - {{LEAD_NAME}} for the lead's name
   - {{OWNER_NAME}} for the company owner
   - {{COMPANY_NAME}} for the company
   - {{COMPANY_REVIEW}} for reviews
   - {{SENDER_NAME}} for your name
   - {{COMPANY_SERVICE}} for your service
   - {{TARGET_INDUSTRY}} for industry
   - {{WEBSITE_URL}} for your website

8. Return HTML formatted content with proper paragraph tags
9. Make it feel personal and human, not templated

Generate the email body content now:`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert email copywriter specialized in B2B sales and marketing emails.' },
        { role: 'user', content: aiPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const generatedContent = completion.choices[0]?.message?.content || '';
    console.log(`✨ Generated email content from prompt for ${lead.email}`);
    
    return generatedContent;
    
  } catch (error) {
    console.error('❌ Error generating content from prompt:', error);
    return `<p>Hello {{LEAD_NAME}},</p><p>I hope this email finds you well.</p>`;
  }
}

// Process email template with variable substitution (supports modular and legacy)
async function processEmailTemplate(template: any, lead: any, companySettings: any, stage: string) {
  let finalHTML = '';
  let finalText = '';
  
  // Check if template has new modular structure (contentPrompt)
  if (template.contentPrompt && template.contentPrompt.trim()) {
    console.log('📝 Using NEW modular template system with AI generation');
    
    // Generate content from prompt using AI + lead data + HTML design
    const generatedContent = await generateEmailContentFromPrompt(
      template.contentPrompt,
      lead,
      companySettings,
      stage,
      template.htmlDesign
    );
    
    // Replace variables in generated content
    const processedContent = replaceEmailVariables(generatedContent, lead, companySettings);
    
    // Replace variables in other components
    const processedSignature = template.emailSignature 
      ? replaceEmailVariables(template.emailSignature, lead, companySettings)
      : '';
    const processedMediaLinks = template.mediaLinks 
      ? replaceEmailVariables(template.mediaLinks, lead, companySettings)
      : '';
    
    // Use custom HTML design or default
    if (template.htmlDesign && template.htmlDesign.trim()) {
      finalHTML = template.htmlDesign
        .replace('{{GENERATED_CONTENT}}', processedContent)
        .replace('{{SIGNATURE}}', processedSignature)
        .replace('{{MEDIA_LINKS}}', processedMediaLinks);
    } else {
      finalHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
          <div style="padding: 40px 30px; background: white;">
            ${processedContent}
            ${processedMediaLinks ? `<div style="margin: 20px 0;">${processedMediaLinks}</div>` : ''}
            ${processedSignature ? `<div style="margin-top: 30px;">${processedSignature}</div>` : ''}
          </div>
        </div>
      `;
    }
    
    finalText = `${processedContent.replace(/<[^>]*>/g, '')}\n\n${processedMediaLinks ? 'Media: ' + processedMediaLinks.replace(/<[^>]*>/g, '') + '\n\n' : ''}${processedSignature.replace(/<[^>]*>/g, '')}`;
    
  } else {
    // Fallback to OLD system (backwards compatibility)
    console.log('📜 Using LEGACY template system (pre-generated HTML)');
    finalHTML = replaceEmailVariables(template.htmlContent || '', lead, companySettings);
    finalText = replaceEmailVariables(template.textContent || '', lead, companySettings);
  }
  
  const processedSubject = replaceEmailVariables(template.subject, lead, companySettings);
  
  return {
    subject: processedSubject,
    htmlContent: finalHTML,
    textContent: finalText
  };
}

// Create email transporter using user credentials from database
async function createEmailTransporter(userId?: string) {
  try {
    // If userId is provided, try to get user's SMTP credentials
    if (userId) {
      await dbConnect();
      const user = await User.findById(userId).lean();
      
      // Check if user exists and has SMTP credentials
      if (user && typeof user === 'object' && 'credentials' in user && user.credentials) {
        const creds = user.credentials;
        
        // Check if all required SMTP credentials are available
        if (creds.SMTP_HOST && creds.SMTP_PORT && creds.SMTP_USER && creds.SMTP_PASSWORD) {
          console.log(`📧 Using user-specific SMTP credentials for userId: ${userId}`);
          
          const portNumber = parseInt(String(creds.SMTP_PORT), 10);
          const secure = portNumber === 465; // common convention
          
          return {
            transporter: nodemailer.createTransport({
              host: String(creds.SMTP_HOST),
              port: portNumber,
              secure,
              auth: {
                user: String(creds.SMTP_USER),
                pass: String(creds.SMTP_PASSWORD),
              },
              connectionTimeout: 30000,
              greetingTimeout: 30000,
              socketTimeout: 30000
            }),
            senderEmail: String(creds.SMTP_USER),
            senderName: user.name || user.username || 'QuasarSEO Team'
          };
        } else {
          console.log(`⚠️ User ${userId} has incomplete SMTP credentials, falling back to default`);
        }
      } else {
        console.log(`⚠️ User ${userId} not found or has no credentials, falling back to default`);
      }
    }
    
    // Fallback to default SMTP settings from environment variables
    console.log('📧 Using default SMTP credentials from environment variables');
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'mail.zxcs.nl',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER || 'info@quasarseo.nl',
          pass: process.env.SMTP_PASSWORD || 'Bz76WRRu7Auu3A97ZQfq'
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
      }),
      senderEmail: process.env.SMTP_USER || 'info@quasarseo.nl',
      senderName: 'QuasarSEO Team'
    };
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    // Fallback to default SMTP settings
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'mail.zxcs.nl',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER || 'info@quasarseo.nl',
          pass: process.env.SMTP_PASSWORD || 'Bz76WRRu7Auu3A97ZQfq'
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
      }),
      senderEmail: process.env.SMTP_USER || 'info@quasarseo.nl',
      senderName: 'QuasarSEO Team'
    };
  }
}

// Send email function
async function sendEmail(to: string, subject: string, htmlContent: string, textContent: string, userId?: string) {
  try {
    const { transporter, senderEmail, senderName } = await createEmailTransporter(userId);
    
    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal'
      }
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`📧 Force progression email sent to ${to}: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to send force progression email to ${to}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
} 