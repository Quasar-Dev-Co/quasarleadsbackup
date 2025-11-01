import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Lead } from '@/models/leadSchema';
import EmailTemplate from '@/models/emailTemplateSchema';
import CompanySettings from '@/models/companySettingsSchema';
import User from '@/models/userSchema';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

const MAX_RETRY_ATTEMPTS = 0; // NO RETRIES - Send only once, if failed then stop
const RETRY_DELAY_MINUTES = 5; // Not used since retries are disabled

// Load email templates and settings from database
async function getEmailTemplateAndSettings(stage: string, userId?: string) {
  try {
    await dbConnect();
    
    // Get email template using mongoose model - PREFER user-specific template first
    let template: any = null;
    
    if (userId) {
      // Try to find user-specific template first
      template = await EmailTemplate.findOne({ stage, isActive: true, userId }).lean().exec();
      console.log(`🔍 User-specific template lookup for stage "${stage}" (userId: ${userId}): ${template ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    if (!template) {
      // Fallback to global template (no userId)
      template = await EmailTemplate.findOne({ 
        stage, 
        isActive: true, 
        $or: [ 
          { userId: { $exists: false } }, 
          { userId: '' }, 
          { userId: null } 
        ] 
      }).lean().exec();
      console.log(`🔍 Global template lookup for stage "${stage}": ${template ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Get company settings including timing (prefer user-specific, fallback to default)
    let companySettings = null as any;
    if (userId) {
      companySettings = await CompanySettings.findOne({ userId }).lean();
      console.log(`🔍 User-specific company settings lookup for userId: ${userId} - ${companySettings ? 'FOUND' : 'NOT FOUND'}`);
    }
    if (!companySettings) {
      companySettings = await CompanySettings.findOne({ type: 'default' }).lean();
      console.log(`🔍 Global company settings lookup - ${companySettings ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    console.log(`📧 Template result for stage "${stage}" ${userId ? `(user: ${userId})` : '(global)'}: ${template ? 'FOUND' : 'NOT FOUND'}`);
    
    if (template) {
      console.log(`   📋 Template Fields:`);
      console.log(`      - Subject: ${template.subject ? '✓' : '✗'}`);
      console.log(`      - Content Prompt: ${template.contentPrompt ? '✓' : '✗'}`);
      console.log(`      - Email Signature: ${template.emailSignature ? '✓' : '✗'}`);
      console.log(`      - Media Links: ${template.mediaLinks ? '✓ (HAS CONTENT)' : '✗ (EMPTY)'}`);
      console.log(`      - Media Links Length: ${template.mediaLinks ? template.mediaLinks.length : 0} characters`);
      if (template.mediaLinks) {
        console.log(`      - Media Content Full: "${template.mediaLinks}"`);
      } else {
        console.log(`      - ⚠️ WARNING: mediaLinks field is empty or undefined!`);
      }
    }
    
    return {
      template,
      companySettings,
      timing: companySettings?.emailTimings?.find((t: any) => t.stage === stage)
    };
  } catch (error) {
    console.error(`❌ Error loading template/settings for stage ${stage}:`, error);
    return { template: null, companySettings: null, timing: null };
  }
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
          
          return nodemailer.createTransport({
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
          });
        } else {
          console.log(`⚠️ User ${userId} has incomplete SMTP credentials, falling back to default`);
        }
      } else {
        console.log(`⚠️ User ${userId} not found or has no credentials, falling back to default`);
      }
    }
    
    // Fallback to default SMTP settings from environment variables
    console.log('📧 Using default SMTP credentials from environment variables');
    return nodemailer.createTransport({
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
    });
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    // Fallback to default SMTP settings
    return nodemailer.createTransport({
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
    });
  }
}

function getAuthorName(lead: any): string {
  return lead?.authInformation?.owner_name || lead.companyOwner || lead?.authInformation?.executive_name || lead?.name || 'Team';
}

function getCompanyName(lead: any, companySettings: any = null): string {
  return lead?.authInformation?.company_name || lead.company || companySettings?.companyName || 'QuasarSEO Team';
}

function replaceEmailVariables(content: string, lead: any, companySettings: any = null): string {
  // Determine sender identity: check lead-specific setting first, then company default
  const senderIdentity = lead?.senderIdentity || companySettings?.defaultSenderIdentity || 'company';
  const chosenSenderName = senderIdentity === 'author'
    ? getAuthorName(lead)
    : (companySettings?.senderName || 'QuasarSEO Team');
  
  // Format company reviews if available
  const companyReview = lead?.rating && lead?.reviews 
    ? `${lead.rating} stars with ${lead.reviews} reviews`
    : lead?.rating 
    ? `Rated ${lead.rating} stars`
    : 'your company';
  
  const variables = {
    '{{NAME}}': lead.name || 'there',
    '{{LEAD_NAME}}': lead.name || 'there',
    '{{OWNER_NAME}}': getAuthorName(lead),
    '{{COMPANY_NAME}}': lead.company || 'your company',
    '{{COMPANY_REVIEW}}': companyReview,
    '{{LOCATION}}': lead.location || 'your area',
    '{{EMAIL}}': lead.email,
    // Use company settings sender name unless author identity is selected
    '{{SENDER_NAME}}': chosenSenderName,
    '{{SENDER_EMAIL}}': companySettings?.senderEmail || 'info@quasarseo.nl',
    '{{COMPANY_SERVICE}}': companySettings?.service || 'AI-powered lead generation',
    '{{TARGET_INDUSTRY}}': companySettings?.industry || 'Technology',
    '{{WEBSITE_URL}}': companySettings?.websiteUrl || 'https://quasarleads.com'
  };
  
  let processedContent = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    processedContent = processedContent.replace(regex, value);
  });
  
  return processedContent;
}

// Generate email content from prompt using OpenAI
async function generateEmailContentFromPrompt(
  prompt: string,
  lead: any,
  companySettings: any,
  stage: string
): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Prepare lead data for AI
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
    
    // Generate AI prompt for email content with professional HTML formatting
    const aiPrompt = `You are generating personalized email content for a sales/marketing email.

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

CRITICAL INSTRUCTIONS:
1. Generate ONLY the email body content - NO markdown, NO code blocks, NO '''html tags
2. Length: MUST be 350-500 words (this is important for engagement)
3. Use professional, conversational tone - sound like a human, not a robot
4. Naturally incorporate the lead's data where relevant
5. If company reviews are available, reference them to show you did research
6. Write 4-5 detailed paragraphs to reach 350-500 words:
   - Paragraph 1: Personalized opening (mention their company/industry)
   - Paragraph 2-3: Explain your service and how it solves their specific problems
   - Paragraph 4: Build credibility (mention results, expertise, or reviews if available)
   - Paragraph 5: Clear call-to-action (schedule call, reply, visit website)
7. Use these placeholders where appropriate:
   - {{LEAD_NAME}} for the lead's name
   - {{OWNER_NAME}} for the company owner
   - {{COMPANY_NAME}} for the company
   - {{COMPANY_REVIEW}} for reviews
   - {{SENDER_NAME}} for your name
   - {{COMPANY_SERVICE}} for your service
   - {{TARGET_INDUSTRY}} for industry
   - {{WEBSITE_URL}} for your website

8. Format as HTML with <p> tags and inline styles for email compatibility
9. Make it feel personal and human, not templated
10. DO NOT include: subject line, signature, markdown syntax, code blocks, or '''html tags
11. Return ONLY the HTML paragraph tags with the content

Generate the email body content now (350-500 words):`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert email copywriter specialized in B2B sales and marketing emails. Return only clean HTML without markdown code blocks.' },
        { role: 'user', content: aiPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    let generatedContent = completion.choices[0]?.message?.content || '';
    
    // Clean up any markdown code block syntax that might have slipped through
    generatedContent = generatedContent.replace(/```html\s*/gi, '');
    generatedContent = generatedContent.replace(/```\s*/g, '');
    generatedContent = generatedContent.replace(/'''html\s*/gi, '');
    generatedContent = generatedContent.replace(/'''\s*/g, '');
    generatedContent = generatedContent.trim();
    
    console.log(`✨ Generated email content from prompt for ${lead.email} (${generatedContent.length} chars)`);
    
    return generatedContent;
    
  } catch (error) {
    console.error('❌ Error generating content from prompt:', error);
    // Return a fallback message if AI fails
    return `<p>Hello {{LEAD_NAME}},</p><p>I hope this email finds you well.</p>`;
  }
}

// Assemble final email from modular components
async function assembleFinalEmail(template: any, lead: any, companySettings: any, stage: string): Promise<{ htmlContent: string; textContent: string }> {
  let finalHTML = '';
  let finalText = '';
  
  // Check if template has new modular structure (contentPrompt)
  if (template.contentPrompt && template.contentPrompt.trim()) {
    console.log('📝 Using NEW modular template system with AI generation');
    
    // Generate content from prompt using AI + lead data
    const generatedContent = await generateEmailContentFromPrompt(
      template.contentPrompt,
      lead,
      companySettings,
      stage
    );
    
    // Replace variables in generated content
    const processedContent = replaceEmailVariables(generatedContent, lead, companySettings);
    
    // Replace variables in other components
    console.log(`\n🔍 BEFORE PROCESSING:`);
    console.log(`   - template.emailSignature type: ${typeof template.emailSignature}, value: ${template.emailSignature ? 'EXISTS' : 'NULL/UNDEFINED'}`);
    console.log(`   - template.mediaLinks type: ${typeof template.mediaLinks}, value: ${template.mediaLinks ? 'EXISTS' : 'NULL/UNDEFINED'}`);
    console.log(`   - template.mediaLinks length: ${template.mediaLinks?.length || 0}`);
    console.log(`   - template.mediaLinks raw: "${template.mediaLinks}"`);
    
    const processedSignature = (template.emailSignature && template.emailSignature.trim())
      ? replaceEmailVariables(template.emailSignature, lead, companySettings)
      : '';
    const processedMediaLinks = (template.mediaLinks && template.mediaLinks.trim())
      ? replaceEmailVariables(template.mediaLinks, lead, companySettings)
      : '';
    
    console.log(`\n📧 Email Assembly - Stage: ${stage}`);
    console.log(`   - Content: ${processedContent ? 'Generated ✓' : 'Missing ✗'}`);
    console.log(`   - Signature: ${processedSignature ? 'Included ✓' : 'Empty'}`);
    console.log(`   - Media Links: ${processedMediaLinks ? 'Included ✓' : 'Empty'}`);
    console.log(`   - Template Media Field: "${template.mediaLinks || '(empty)'}"`);
    console.log(`   - Processed Media Length: ${processedMediaLinks.length} chars`);
    console.log(`   - Processed Media: "${processedMediaLinks || '(empty)'}"`);
    
    // Use default professional email structure with proper media support
    finalHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 100%; margin: 0 auto; background: #ffffff;">
        <div style="padding: 20px; background: white;">
          ${processedContent}
          ${processedMediaLinks ? `<div style="margin: 40px 0; text-align: center; line-height: 0;">${processedMediaLinks}</div>` : ''}
          ${processedSignature ? `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; line-height: 1.5;">${processedSignature}</div>` : ''}
        </div>
      </div>
    `;
    
    // Generate plain text version
    finalText = `${processedContent.replace(/<[^>]*>/g, '')}\n\n${processedMediaLinks ? 'Media: ' + processedMediaLinks.replace(/<[^>]*>/g, '') + '\n\n' : ''}${processedSignature.replace(/<[^>]*>/g, '')}`;
    
    console.log(`\n📧 FINAL EMAIL HTML (first 500 chars):`);
    console.log(finalHTML.substring(0, 500));
    console.log(`\n📧 FINAL EMAIL HTML (contains iframe): ${finalHTML.includes('<iframe') ? '✅ YES' : '❌ NO'}`);
    
  } else {
    // Fallback to OLD system (backwards compatibility)
    console.log('📜 Using LEGACY template system (pre-generated HTML)');
    finalHTML = replaceEmailVariables(template.htmlContent || '', lead, companySettings);
    finalText = replaceEmailVariables(template.textContent || '', lead, companySettings);
  }
  
  return { htmlContent: finalHTML, textContent: finalText };
}

async function sendEmailWithRetry(lead: any, stage: string, retryCount: number = 0): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`📧 Attempting to send email to ${lead.email} (Stage: ${stage}, Retry: ${retryCount})`);
    
    // Get the userId from the lead if available (need this for user-specific templates)
    const userId = lead.userId || lead.assignedTo || lead.leadsCreatedBy;
    console.log(`🔧 Using userId for template lookup: ${userId || 'none (will use global template)'}`);
    
    // Get template and settings from database
    const { template, companySettings, timing } = await getEmailTemplateAndSettings(stage, userId);
    
    if (!template) {
      throw new Error(`No active template found for stage: ${stage}`);
    }

    // Assemble email using NEW modular system or LEGACY system
    const { htmlContent, textContent } = await assembleFinalEmail(template, lead, companySettings, stage);
    const subject = replaceEmailVariables(template.subject, lead, companySettings);

    // Update lead status to sending
    await Lead.findByIdAndUpdate(lead._id, {
      emailStatus: 'sending',
      emailLastAttempt: new Date(),
      emailRetryCount: retryCount
    });

    console.log(`🔧 Creating email transporter for userId: ${userId || 'default'}`);
    const transporter = await createEmailTransporter(userId);
    
    // Get the sender email from the user's credentials or fall back to default
    let senderEmail = 'info@quasarseo.nl';
    let senderName = 'QuasarSEO Team';
    
    if (userId) {
      const user = await User.findById(userId).lean();
      if (user && typeof user === 'object' && 'credentials' in user && user.credentials) {
        senderEmail = user.credentials.SMTP_USER || senderEmail;
        senderName = user.name || user.username || senderName;
      }
    }
    
    const chosenTo = (lead?.outreachRecipient === 'company' && lead?.authInformation?.company_email)
      ? lead.authInformation.company_email
      : lead.email;

    // Envelope from.name should mirror the same logic used for {{SENDER_NAME}}
    const fromName = (lead?.senderIdentity === 'author')
      ? getAuthorName(lead)
      : (companySettings?.senderName || senderName);

    // Final verification before sending
    console.log(`\n📤 ABOUT TO SEND EMAIL:`);
    console.log(`   - To: ${chosenTo}`);
    console.log(`   - Subject: ${subject}`);
    console.log(`   - HTML length: ${htmlContent.length} chars`);
    console.log(`   - HTML contains '<iframe': ${htmlContent.includes('<iframe') ? '✅ YES' : '❌ NO'}`);
    console.log(`   - HTML preview (first 800 chars):\n${htmlContent.substring(0, 800)}`);
    
    const mailOptions = {
      from: {
        name: fromName,
        address: senderEmail
      },
      to: chosenTo,
      subject: subject,
      text: textContent,
      html: htmlContent,
      headers: {
        'X-Lead-ID': lead._id.toString(),
        'X-Email-Stage': stage,
        'X-Retry-Count': retryCount.toString()
      }
    };

    console.log(`📮 Sending email to ${chosenTo} with subject: "${subject}"`);
    console.log(`📮 Email options:`, { 
      to: mailOptions.to, 
      from: mailOptions.from, 
      subject: mailOptions.subject,
      htmlLength: htmlContent.length,
      textLength: textContent.length
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${lead.email}. Message ID: ${info.messageId}`);

    // Update lead with success
    const nextStage = getNextStage(stage);
    let nextScheduledEmail = null;
    
    if (nextStage) {
      // Calculate next email time based on timing settings
      const { timing: nextTiming } = await getEmailTemplateAndSettings(nextStage, userId);
      if (nextTiming) {
        const delayMs = convertTimingToMs(nextTiming.delay, nextTiming.unit);
        nextScheduledEmail = new Date(Date.now() + delayMs);
      } else {
        // Fallback to 7 days if no timing settings
        nextScheduledEmail = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    await Lead.findByIdAndUpdate(lead._id, {
      $set: {
        emailSequenceStage: stage,
        emailSequenceStep: getStepNumber(stage),
        nextScheduledEmail: nextScheduledEmail,
        emailStatus: 'sent',
        emailRetryCount: 0,
        emailFailureCount: 0,
        lastEmailedAt: new Date()
      },
      $push: {
        emailHistory: {
          stage: stage,
          sentAt: new Date(),
          messageId: info.messageId,
          status: 'sent',
          retryCount: retryCount,
          manual: false,
          emailContent: {
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent,
            from: senderEmail,
            to: lead.email
          }
        }
      }
    });

    return { success: true, messageId: info.messageId };

  } catch (error: any) {
    console.error(`❌ Failed to send email to ${lead.email}:`, error);
    
    // NO RETRIES: Stop the email sequence immediately when email fails
    await Lead.findByIdAndUpdate(lead._id, {
      $set: {
        emailSequenceActive: false, // Stop the sequence
        emailStatus: 'failed',
        emailLastAttempt: new Date(),
        emailRetryCount: 0,
        emailFailureCount: (lead.emailFailureCount || 0) + 1,
        emailStoppedReason: `Email sending failed: ${error.message}`
      },
      $push: {
        emailErrors: {
          attempt: 1,
          error: error.message,
          timestamp: new Date()
        }
      }
    });

    console.log(`🛑 Email sequence stopped for ${lead.email} due to failure (no retries enabled)`);
    return { success: false, error: error.message };
  }
}

function getStepNumber(stage: string): number {
  const stageMap: { [key: string]: number } = {
    'called_once': 1,
    'called_twice': 2,
    'called_three_times': 3,
    'called_four_times': 4,
    'called_five_times': 5,
    'called_six_times': 6,
    'called_seven_times': 7
  };
  return stageMap[stage] || 1;
}

function getNextStage(currentStage: string): string | null {
  const stageFlow: { [key: string]: string | null } = {
    'called_once': 'called_twice',
    'called_twice': 'called_three_times',
    'called_three_times': 'called_four_times',
    'called_four_times': 'called_five_times',
    'called_five_times': 'called_six_times',
    'called_six_times': 'called_seven_times',
    'called_seven_times': null // End of sequence
  };
  return stageFlow[currentStage] || null;
}

function convertTimingToMs(delay: number, unit: string): number {
  switch (unit) {
    case 'minutes':
      return delay * 60 * 1000;
    case 'hours':
      return delay * 60 * 60 * 1000;
    case 'days':
      return delay * 24 * 60 * 60 * 1000;
    default:
      return delay * 24 * 60 * 60 * 1000; // Default to days
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🕐 Email automation cron job started at:', new Date().toISOString());

  try {
    await dbConnect();
    
    const now = new Date();
    console.log('🔍 Current time:', now.toISOString());

    console.log(`🔍 Starting atomic lead selection and locking process...`);

    // CRITICAL FIX: Atomically SELECT and LOCK leads one by one to prevent batch race conditions
    const leadsToProcess = [];
    const maxLeadsToProcess = 20;
    let attemptsCount = 0;
    const maxAttempts = 100; // Try up to 100 leads to find 20 available ones
    
    // Define the query criteria for eligible leads
    const baseQuery = {
      emailSequenceActive: true,
      emailAutomationEnabled: true,
      // CRITICAL: Exclude locked statuses AND failed status (no retries)
      emailStatus: { $nin: ['sending', 'processing', 'completed', 'max_retries_exceeded', 'failed'] },
      // CRITICAL: Only process leads with scheduled time in the past
      nextScheduledEmail: { $lte: now },
      $or: [
        // Ready status leads (new or existing stages)
        {
          emailStatus: { $in: ['ready', null] },
          $or: [
            { emailLastAttempt: null },
            { emailLastAttempt: { $lte: new Date(now.getTime() - 2 * 60 * 1000) } }
          ]
        },
        // Ready for next scheduled email (previous email was sent)
        {
          emailStatus: 'sent',
          $or: [
            { emailLastAttempt: null },
            { emailLastAttempt: { $lte: new Date(now.getTime() - 2 * 60 * 1000) } }
          ]
        }
        // REMOVED: Failed email retry logic - no retries enabled
      ]
    };

    // Atomically lock leads one by one until we have enough
    while (leadsToProcess.length < maxLeadsToProcess && attemptsCount < maxAttempts) {
      attemptsCount++;
      
      // ATOMIC OPERATION: Find one lead and immediately lock it
      const lockedLead = await Lead.findOneAndUpdate(
        baseQuery,
        {
          $set: {
            emailStatus: 'processing',
            emailLastAttempt: now
          }
        },
        { 
          new: true,
          sort: { nextScheduledEmail: 1 } // Process oldest scheduled first
        }
      );
      
      if (lockedLead) {
        leadsToProcess.push(lockedLead);
        console.log(`🔒 Locked lead ${leadsToProcess.length}/${maxLeadsToProcess}: ${lockedLead.email}`);
      } else {
        // No more leads available
        break;
      }
    }

    console.log(`📋 Successfully locked ${leadsToProcess.length} leads for processing`);

    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    let retryCount = 0;

    for (const lockResult of leadsToProcess) {
      try {
        processedCount++;
        console.log(`\n🔄 Processing lead ${processedCount}/${leadsToProcess.length}: ${lockResult.email}`);
        
        // Get email history to determine what's been sent
        const emailHistory = lockResult.emailHistory || [];
        const sentEmails = emailHistory.filter((email: any) => email.status === 'sent');
        const emailsSentCount = sentEmails.length;
        
        console.log(`\n📋 Lead analysis for ${lockResult.email}:`);
        console.log(`   Emails sent so far: ${emailsSentCount}/7`);
        console.log(`   Email status: ${lockResult.emailStatus}`);
        console.log(`   Retry count: ${lockResult.emailRetryCount || 0}`);
        console.log(`   Next scheduled: ${lockResult.nextScheduledEmail}`);
        console.log(`   Current time: ${now.toISOString()}`);
        
        // Check if sequence is completed
        if (emailsSentCount >= 7) {
          console.log(`🏁 Email sequence completed for ${lockResult.email} (${emailsSentCount}/7 emails sent)`);
          await Lead.findByIdAndUpdate(lockResult._id, {
            emailSequenceActive: false,
            emailStatus: 'completed',
            emailStoppedReason: 'Sequence completed (7 emails sent)',
            nextScheduledEmail: null,
            updatedAt: new Date()
          });
          continue;
        }
        
        // Determine which stage to send next
        const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
        const nextStageIndex = emailsSentCount; // 0-based index
        const nextStage = stages[nextStageIndex];
        
        console.log(`🎯 Next email should be: ${nextStage} (Step ${emailsSentCount + 1}/7)`);
        
        // Check if this email was already sent recently (prevent duplicates)
        // CRITICAL: Check last 10 minutes to prevent concurrent cron jobs from sending duplicates
        const recentlySent = emailHistory.find((email: any) => 
          email.stage === nextStage && 
          email.status === 'sent' &&
          new Date(email.sentAt).getTime() > (Date.now() - 10 * 60 * 1000) // Last 10 minutes
        );
        
        if (recentlySent) {
          console.log(`⏭️ Email for ${nextStage} already sent within last 10 minutes, skipping to prevent duplicate`);
          // Update status to 'sent' to prevent re-selection
          await Lead.findByIdAndUpdate(lockResult._id, {
            emailStatus: 'sent',
            emailLastAttempt: new Date()
          });
          continue;
        }
        
        // RETRY LOGIC REMOVED: No retries - failed emails stay failed and sequence stops
        
        // Check if it's time to send the next email
        if (lockResult.emailStatus === 'sent' && lockResult.nextScheduledEmail && lockResult.nextScheduledEmail > now) {
          console.log(`⏭️ Not time yet for ${lockResult.email} - next email scheduled for ${lockResult.nextScheduledEmail.toISOString()}`);
          continue;
        }

        // Send the email
        console.log(`🚀 About to send ${nextStage} to ${lockResult.email} (Step ${emailsSentCount + 1}/7)`);
        const result = await sendEmailWithRetry(lockResult, nextStage, lockResult.emailRetryCount || 0);
        console.log(`📨 Email send result:`, result);
        
        if (result.success) {
          successCount++;
          console.log(`✅ Successfully sent ${nextStage} to ${lockResult.email} - MessageID: ${result.messageId}`);
        } else {
          failureCount++;
          console.log(`❌ Failed to send ${nextStage} to ${lockResult.email}: ${result.error}`);
          console.log(`❌ Full error details:`, result);
        }

        // Add small delay between sends to avoid overwhelming SMTP server
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`💥 Error processing lead ${lockResult.email}:`, error);
        failureCount++;
        
        // Mark lead as failed
        await Lead.findByIdAndUpdate(lockResult._id, {
          emailStatus: 'failed',
          emailLastAttempt: new Date(),
          $push: {
            emailErrors: {
              attempt: (lockResult.emailRetryCount || 0) + 1,
              error: error.message,
              timestamp: new Date()
            }
          }
        });
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      totalLeads: leadsToProcess.length,
      processed: processedCount,
      successful: successCount,
      failed: failureCount,
      retries: retryCount,
    };

    console.log('\n🎉 Email automation cron job completed:');
    console.log(`   📊 Summary:`, summary);

    return NextResponse.json({
      success: true,
      message: `Email automation completed: ${successCount} emails sent, ${failureCount} failed`,
      results: summary
    });

  } catch (error: any) {
    console.error('💥 Email automation cron job error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Email automation failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 