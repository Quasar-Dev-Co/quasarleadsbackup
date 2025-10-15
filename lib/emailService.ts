import nodemailer from 'nodemailer';
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';
import EmailTemplate from '@/models/emailTemplateSchema';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text: string;
  leadId?: string;
  stage?: string;
  fromName?: string;
  fromEmail?: string;
}

// MongoDB connection for template lookup
let db: any = null;
let templatesCollection: any = null;

async function initTemplateDb() {
  if (!db) {
    const connection = await dbConnect();
    db = connection.connection.db;
    templatesCollection = db.collection('emailTemplates');
  }
  return { db, templatesCollection };
}

// Default email templates (updated to avoid Gmail filtering)
const DEFAULT_EMAIL_TEMPLATES = {
  called_once: {
    subject: "Quick question about {{COMPANY_NAME}}",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {{LEAD_NAME}},</p>
        
        <p>I came across {{COMPANY_NAME}} while researching companies in your space and was genuinely impressed by what you're doing.</p>
        
        <p>I have a quick question - are you currently happy with how you're finding new customers? I ask because I've been helping similar companies discover some really interesting opportunities they didn't know existed.</p>
        
        <p>No sales pitch here, just wondering if you'd be open to a brief chat about what's working (or not working) for {{COMPANY_NAME}} right now?</p>
        
        <p>If you're interested, just reply and let me know a good time for a quick call this week.</p>
        
        <p>Best,<br>
        {{SENDER_NAME}}<br>
        {{SENDER_EMAIL}}</p>
        
        <p style="color: #666; font-size: 12px;">P.S. If this isn't relevant, no worries - just let me know and I won't follow up.</p>
      </div>
    `,
    textContent: `
Hi {{LEAD_NAME}},

I came across {{COMPANY_NAME}} while researching companies in your space and was genuinely impressed by what you're doing.

I have a quick question - are you currently happy with how you're finding new customers? I ask because I've been helping similar companies discover some really interesting opportunities they didn't know existed.

No sales pitch here, just wondering if you'd be open to a brief chat about what's working (or not working) for {{COMPANY_NAME}} right now?

If you're interested, just reply and let me know a good time for a quick call this week.

Best,
{{SENDER_NAME}}
{{SENDER_EMAIL}}

P.S. If this isn't relevant, no worries - just let me know and I won't follow up.
    `
  },
  
  called_twice: {
    subject: "Following up on my message to {{LEAD_NAME}}",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {{LEAD_NAME}},</p>
        
        <p>I sent you a message last week about {{COMPANY_NAME}} and wanted to follow up briefly.</p>
        
        <p>I realize you're probably busy, but I thought you might find this interesting: I recently helped a company very similar to yours increase their customer acquisition by 3x in just 30 days.</p>
        
        <p>The approach we used was pretty simple but most companies don't know about it.</p>
        
        <p>Would you be curious to hear how they did it? Takes about 10 minutes to explain.</p>
        
        <p>Let me know if you'd like to hear the story - I think it could be relevant for {{COMPANY_NAME}}.</p>
        
        <p>Thanks,<br>
        {{SENDER_NAME}}</p>
      </div>
    `,
    textContent: `
Hi {{LEAD_NAME}},

I sent you a message last week about {{COMPANY_NAME}} and wanted to follow up briefly.

I realize you're probably busy, but I thought you might find this interesting: I recently helped a company very similar to yours increase their customer acquisition by 3x in just 30 days.

The approach we used was pretty simple but most companies don't know about it.

Would you be curious to hear how they did it? Takes about 10 minutes to explain.

Let me know if you'd like to hear the story - I think it could be relevant for {{COMPANY_NAME}}.

Thanks,
{{SENDER_NAME}}
    `
  },
  
  called_three_times: {
    subject: "One more try - {{LEAD_NAME}}",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {{LEAD_NAME}},</p>
        
        <p>I've reached out a couple times now and haven't heard back, so I'll make this quick.</p>
        
        <p>I get it - you're probably getting tons of emails from people trying to sell you stuff. This isn't that.</p>
        
        <p>Simple question: What's the biggest challenge {{COMPANY_NAME}} is facing with getting new customers right now?</p>
        
        <p>I ask because the companies I work with usually mention one of these:</p>
        <ul>
          <li>Finding qualified prospects takes too much time</li>
          <li>Marketing campaigns aren't generating quality leads</li>
          <li>Hard to get people to respond to outreach</li>
          <li>Too expensive to acquire new customers</li>
            </ul>
        
        <p>If any of those sound familiar, I might have some ideas that could help.</p>
        
        <p>If not, no worries - just let me know you're all set and I'll stop reaching out.</p>
        
        <p>{{SENDER_NAME}}</p>
      </div>
    `,
    textContent: `
Hi {{LEAD_NAME}},

I've reached out a couple times now and haven't heard back, so I'll make this quick.

I get it - you're probably getting tons of emails from people trying to sell you stuff. This isn't that.

Simple question: What's the biggest challenge {{COMPANY_NAME}} is facing with getting new customers right now?

I ask because the companies I work with usually mention one of these:
- Finding qualified prospects takes too much time
- Marketing campaigns aren't generating quality leads  
- Hard to get people to respond to outreach
- Too expensive to acquire new customers

If any of those sound familiar, I might have some ideas that could help.

If not, no worries - just let me know you're all set and I'll stop reaching out.

{{SENDER_NAME}}
    `
  },

  called_four_times: {
    subject: "Thought you might find this interesting - {{LEAD_NAME}}",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {{LEAD_NAME}},</p>
        
        <p>Quick story that might interest you...</p>
        
        <p>Last month I was talking to the CEO of a company that does something similar to {{COMPANY_NAME}}. They were frustrated because their competitors were somehow getting all the good customers while they were struggling to get noticed.</p>
        
        <p>Turns out, their competitors were using a strategy they'd never heard of to identify companies that were actively looking for their services. Within 6 weeks, they went from struggling to having more qualified prospects than they could handle.</p>
        
        <p>The interesting part? It had nothing to do with traditional marketing or advertising.</p>
        
        <p>I won't share the details here (it's their competitive advantage), but if you're curious how they did it, I could walk you through it on a quick call.</p>
        
        <p>Might be relevant for {{COMPANY_NAME}} - or might not. Only one way to find out.</p>
        
        <p>Interested?</p>
        
        <p>{{SENDER_NAME}}</p>
      </div>
    `,
    textContent: `
Hi {{LEAD_NAME}},

Quick story that might interest you...

Last month I was talking to the CEO of a company that does something similar to {{COMPANY_NAME}}. They were frustrated because their competitors were somehow getting all the good customers while they were struggling to get noticed.

Turns out, their competitors were using a strategy they'd never heard of to identify companies that were actively looking for their services. Within 6 weeks, they went from struggling to having more qualified prospects than they could handle.

The interesting part? It had nothing to do with traditional marketing or advertising.

I won't share the details here (it's their competitive advantage), but if you're curious how they did it, I could walk you through it on a quick call.

Might be relevant for {{COMPANY_NAME}} - or might not. Only one way to find out.

Interested?

{{SENDER_NAME}}
    `
  },

  called_five_times: {
    subject: "Should I stop reaching out? - {{LEAD_NAME}}",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {{LEAD_NAME}},</p>
        
        <p>I've sent you a few messages now and haven't heard back. Before I continue, I wanted to check in.</p>
        
        <p>Is this just bad timing, or should I stop reaching out about {{COMPANY_NAME}}?</p>
        
        <p>I ask because:</p>
        <ul>
          <li>Maybe customer acquisition isn't a priority right now</li>
          <li>Maybe you've already got it figured out</li>
          <li>Maybe my emails aren't reaching the right person</li>
          <li>Or maybe you're just swamped with other stuff</li>
            </ul>
        
        <p>If it's just timing and you'd like to connect down the road, let me know and I'll circle back in a few months.</p>
        
        <p>If you're all set and don't want me to keep reaching out, just reply "all set" and I'll remove you from my list.</p>
        
        <p>If you ARE interested in hearing about that strategy I mentioned, just reply "yes" and I'll send over some times we could chat.</p>
        
        <p>Either way, thanks for your time.</p>
        
        <p>{{SENDER_NAME}}</p>
      </div>
    `,
    textContent: `
Hi {{LEAD_NAME}},

I've sent you a few messages now and haven't heard back. Before I continue, I wanted to check in.

Is this just bad timing, or should I stop reaching out about {{COMPANY_NAME}}?

I ask because:
- Maybe customer acquisition isn't a priority right now
- Maybe you've already got it figured out  
- Maybe my emails aren't reaching the right person
- Or maybe you're just swamped with other stuff

If it's just timing and you'd like to connect down the road, let me know and I'll circle back in a few months.

If you're all set and don't want me to keep reaching out, just reply "all set" and I'll remove you from my list.

If you ARE interested in hearing about that strategy I mentioned, just reply "yes" and I'll send over some times we could chat.

Either way, thanks for your time.

{{SENDER_NAME}}
    `
  },

  called_six_times: {
    subject: "Last message from me - {{LEAD_NAME}}",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {{LEAD_NAME}},</p>
        
        <p>This is my last email to you - I promise.</p>
        
        <p>Even though we haven't connected, I wanted to leave you with something useful.</p>
        
        <p>I put together a simple checklist that most companies find helpful for finding better customers. It's got:</p>
        <ul>
          <li>5 free tools for finding prospects</li>
          <li>Email templates that actually get responses</li>
          <li>A step-by-step process for reaching out</li>
          <li>How to track what's working and what isn't</li>
            </ul>
        
        <p>No catch, no signup required. Just something useful for {{COMPANY_NAME}}.</p>
        
        <p>If you want it, just reply "send it" and I'll email it over.</p>
        
        <p>If not, no worries. Best of luck with everything at {{COMPANY_NAME}}.</p>
        
        <p>{{SENDER_NAME}}</p>
        
        <p style="color: #666; font-size: 12px;">This really is my last email. Thanks for your patience with my outreach.</p>
      </div>
    `,
    textContent: `
Hi {{LEAD_NAME}},

This is my last email to you - I promise.

Even though we haven't connected, I wanted to leave you with something useful.

I put together a simple checklist that most companies find helpful for finding better customers. It's got:
- 5 free tools for finding prospects
- Email templates that actually get responses  
- A step-by-step process for reaching out
- How to track what's working and what isn't

No catch, no signup required. Just something useful for {{COMPANY_NAME}}.

If you want it, just reply "send it" and I'll email it over.

If not, no worries. Best of luck with everything at {{COMPANY_NAME}}.

{{SENDER_NAME}}

This really is my last email. Thanks for your patience with my outreach.
    `
  },

  called_seven_times: {
    subject: "Okay, I lied - one more message {{LEAD_NAME}}",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi {{LEAD_NAME}},</p>
        
        <p>I know I said my last email was my last email, but I couldn't resist one final attempt.</p>
        
        <p>Here's the thing - I've been doing this for a while, and I've learned that sometimes the best opportunities come from the people who take the longest to respond.</p>
        
        <p>Maybe you've been busy. Maybe my emails got lost in your inbox. Maybe you were waiting to see how persistent I'd be. 😄</p>
        
        <p>Either way, I figured I'd give it one more shot with a simple question:</p>
        
        <p><strong>What would have to be true for you to take 15 minutes to learn about a new way to find customers for {{COMPANY_NAME}}?</strong></p>
        
        <p>If the answer is "nothing" - totally fair. Just reply "remove me" and I'll stop.</p>
        
        <p>But if there's any scenario where you'd be curious to learn something new that could help {{COMPANY_NAME}}, just reply "maybe" and I'll share one specific thing you could try this week.</p>
        
        <p>That's it. No long sales call, no complicated proposal. Just one thing you could test.</p>
        
        <p>Sound fair?</p>
        
        <p>{{SENDER_NAME}}</p>
        
        <p style="color: #666; font-size: 12px;">Okay, THIS is really the last one. 😊</p>
      </div>
    `,
    textContent: `
Hi {{LEAD_NAME}},

I know I said my last email was my last email, but I couldn't resist one final attempt.

Here's the thing - I've been doing this for a while, and I've learned that sometimes the best opportunities come from the people who take the longest to respond.

Maybe you've been busy. Maybe my emails got lost in your inbox. Maybe you were waiting to see how persistent I'd be. 😄

Either way, I figured I'd give it one more shot with a simple question:

What would have to be true for you to take 15 minutes to learn about a new way to find customers for {{COMPANY_NAME}}?

If the answer is "nothing" - totally fair. Just reply "remove me" and I'll stop.

But if there's any scenario where you'd be curious to learn something new that could help {{COMPANY_NAME}}, just reply "maybe" and I'll share one specific thing you could try this week.

That's it. No long sales call, no complicated proposal. Just one thing you could test.

Sound fair?

{{SENDER_NAME}}

Okay, THIS is really the last one. 😊
    `
  }
};

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize with a placeholder transporter; per-send we will build from user credentials
    this.transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  // Build transporter from user's SMTP credentials in the database
  private async buildTransporterForUser(userId: string): Promise<nodemailer.Transporter> {
    await dbConnect();
    const user: any = await User.findById(userId).lean();
    const creds = user?.credentials || {};

    const missing: string[] = [];
    if (!creds.SMTP_HOST) missing.push('SMTP_HOST');
    if (!creds.SMTP_PORT) missing.push('SMTP_PORT');
    if (!creds.SMTP_USER) missing.push('SMTP_USER');
    if (!creds.SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
    if (missing.length > 0) {
      throw new Error(`Missing SMTP credentials: ${missing.join(', ')}`);
    }

    const portNumber = parseInt(String(creds.SMTP_PORT), 10);
    const secure = portNumber === 465; // common convention

    const smtpConfig = {
      host: String(creds.SMTP_HOST),
      port: portNumber,
      secure,
      auth: {
        user: String(creds.SMTP_USER),
        pass: String(creds.SMTP_PASSWORD),
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 90000,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    } as any;

    return nodemailer.createTransport(smtpConfig);
  }

  // Replace template variables with actual values
  private replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }

  // Get email template for specific stage (checks database first, then defaults)
  async getEmailTemplate(stage: string, userId?: string): Promise<EmailTemplate | null> {
    const validStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    if (!validStages.includes(stage)) {
      console.error(`Invalid email stage: ${stage}`);
      return null;
    }

    try {
      // Prefer user-specific template via Mongoose
      const templateForUser = (userId
        ? await EmailTemplate.findOne({ stage, isActive: true, userId }).lean()
        : null) as any;
      if (templateForUser) {
        console.log(`✅ Using user-specific template for stage: ${stage}`);
        return {
          subject: templateForUser.subject,
          htmlContent: templateForUser.htmlContent,
          textContent: templateForUser.textContent || ''
        };
      }

      // Fallback to global template (no userId)
      const globalTemplate = await EmailTemplate.findOne({ stage, isActive: true, $or: [ { userId: { $exists: false } }, { userId: '' }, { userId: null } ] }).lean() as any;
      if (globalTemplate) {
        console.log(`✅ Using global template for stage: ${stage}`);
        return {
          subject: globalTemplate.subject,
          htmlContent: globalTemplate.htmlContent,
          textContent: globalTemplate.textContent || ''
        };
      }

      // Fall back to built-in default template
      console.log(`⚠️ Using built-in default template for stage: ${stage} (no DB template found)`);
      return DEFAULT_EMAIL_TEMPLATES[stage as keyof typeof DEFAULT_EMAIL_TEMPLATES];

    } catch (error) {
      console.warn(`❌ Error loading custom template for ${stage}, using default:`, error);
      // Fall back to default template on error
      return DEFAULT_EMAIL_TEMPLATES[stage as keyof typeof DEFAULT_EMAIL_TEMPLATES];
    }
  }

  // Send email with template
  async sendEmail(config: EmailConfig): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        console.log(`📧 Attempt ${retryCount + 1}/${maxRetries} to send email to: ${config.to}`);
        
        // Validate email config
        if (!config.to || !config.subject || !config.html) {
          const error = 'Missing required email configuration (to, subject, or html)';
          console.error(error);
          return { success: false, error };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(config.to)) {
          const error = `Invalid email address: ${config.to}`;
          console.error(error);
          return { success: false, error };
        }

        // Try to verify connection with timeout
        console.log('🔍 Verifying email transporter connection...');
        try {
          await this.transporter.verify();
          console.log('✅ Email transporter verified successfully');
        } catch (verifyError: any) {
          console.warn('⚠️ SMTP verification failed:', verifyError.message);
        }

        // Prepare sender info (allow override)
        const senderName = config.fromName || process.env.SENDER_NAME || 'QuasarSEO Team';
        const senderEmail = config.fromEmail || (this.transporter as any)?.options?.auth?.user || 'no-reply@example.com';
        console.log('📧 SMTP host:', (this.transporter as any)?.options?.host, 'port:', (this.transporter as any)?.options?.port, 'secure:', (this.transporter as any)?.options?.secure);
        
        console.log(`📤 Sending email from: "${senderName}" <${senderEmail}>`);

        // Send email with timeout
        const info = await this.transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: config.to,
          subject: config.subject,
          text: config.text || '',
          html: config.html,
        });

        // Verify message ID format
        if (!info.messageId || !info.messageId.includes('@')) {
          throw new Error('Invalid message ID received from SMTP server');
        }

        console.log('✅ Email sent successfully! Message ID:', info.messageId);
        
        return {
          success: true,
          messageId: info.messageId
        };

      } catch (error: any) {
        lastError = error;
        console.error(`❌ Email sending failed (attempt ${retryCount + 1}/${maxRetries}):`, error);
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        
        retryCount++;
        
        // If this was the last retry, return the error
        if (retryCount === maxRetries) {
          // Provide more specific error messages and solutions
          let errorMessage = error.message || 'Failed to send email';
          
          if (error.code === 'EAUTH') {
            errorMessage = 'SMTP authentication failed. Check SMTP credentials.';
          } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Network error: Could not reach SMTP server. Check internet connection.';
          } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout: SMTP server is unreachable.';
          } else if (error.code === 'EENVELOPE') {
            errorMessage = 'Invalid email address format.';
          }
          
          return {
            success: false,
            error: `Failed after ${maxRetries} attempts: ${errorMessage}`
          };
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    };
  }

  // Send email using a specific user's SMTP credentials
  async sendEmailForUser(userId: string, config: EmailConfig): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const userTransporter = await this.buildTransporterForUser(userId);
      // Temporarily use user-specific transporter for this send
      const originalTransporter = this.transporter;
      this.transporter = userTransporter;
      const result = await this.sendEmail(config);
      this.transporter = originalTransporter;
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to configure SMTP' };
    }
  }

  // Send automated email based on CRM stage
  async sendStageEmail(
    leadData: {
      name: string;
      email: string;
      company: string;
      stage: string;
      senderOverride?: string;
    },
    userId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    console.log(`🎯 Sending stage email for lead: ${leadData.name} (${leadData.email}) - Stage: ${leadData.stage}`);
    
    // Validate lead data
    if (!leadData.name || !leadData.email || !leadData.company || !leadData.stage) {
      const error = 'Missing required lead data (name, email, company, or stage)';
      console.error(error);
      return { success: false, error };
    }

    const template = await this.getEmailTemplate(leadData.stage, userId);
    if (!template) {
      const error = `No email template found for stage: ${leadData.stage}`;
      console.error(error);
      return { success: false, error };
    }

    // Get company settings for template variables (prefer user-specific)
    let companySettings = {} as any;
    try {
      // Prefer using the Mongoose model to ensure consistent schema
      const { default: CompanySettings } = await import('@/models/companySettingsSchema');
      if (userId) {
        const userSettings = await CompanySettings.findOne({ userId }).lean();
        if (userSettings) {
          companySettings = userSettings;
          console.log(`✅ Loaded user-specific company settings for userId: ${userId}`);
        }
      }
      if (!companySettings || Object.keys(companySettings).length === 0) {
        const defaultSettings = await CompanySettings.findOne({ type: 'default' }).lean();
        if (defaultSettings) {
          companySettings = defaultSettings;
          console.log('✅ Loaded default company settings for email template');
        } else {
          console.log('⚠️ No company settings found, using defaults');
        }
      }
    } catch (error) {
      console.warn('❌ Could not load company settings, using defaults:', error);
    }

    // Template variables
    const variables = {
      LEAD_NAME: leadData.name,
      COMPANY_NAME: leadData.company,
      COMPANY_REVIEW: (leadData as any).reviews || (leadData as any).rating || 'excellent reputation',
      OWNER_NAME: (leadData as any).companyOwner || leadData.name,
      // Prefer explicit override (author), else user/company senderName
      SENDER_NAME: leadData.senderOverride || (companySettings as any)?.senderName || process.env.SENDER_NAME || 'QuasarSEO Team',
      SENDER_EMAIL: (companySettings as any)?.senderEmail || 'info@quasarseo.nl',
      COMPANY_SERVICE: (companySettings as any)?.service || 'AI-powered lead generation',
      TARGET_INDUSTRY: (companySettings as any)?.industry || 'Technology',
      WEBSITE_URL: (companySettings as any)?.websiteUrl || 'https://quasarleads.com'
    };

    console.log('🔄 Replacing template variables:', Object.keys(variables));

    // Replace variables in template
    const subject = this.replaceTemplateVariables(template.subject, variables);
    const htmlContent = this.replaceTemplateVariables(template.htmlContent, variables);
    const textContent = this.replaceTemplateVariables(template.textContent, variables);

    console.log(`📝 Email prepared - Subject: "${subject}"`);

    // Send email (prefer user-specific SMTP if userId provided)
    const emailPayload = {
      to: leadData.email,
      subject,
      html: htmlContent,
      text: textContent,
      leadId: leadData.name,
      stage: leadData.stage
    };
    if (userId) {
      return await this.sendEmailForUser(userId, emailPayload);
    }
    return await this.sendEmail(emailPayload);
  }

  // Test email connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Testing email service connection...');
      console.log('📧 Testing QuasarSEO SMTP connection (mail.zxcs.nl:465)');
      
      await this.transporter.verify();
      console.log('✅ Email service connection test successful');
      console.log('✅ QuasarSEO SMTP server connection verified');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Email service connection test failed:', error);
      
      let errorMessage = error.message || 'Connection test failed';
      
      if (error.code === 'EAUTH') {
        errorMessage = 'SMTP authentication failed. Check QuasarSEO SMTP credentials.';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Network error: Could not reach QuasarSEO SMTP server (mail.zxcs.nl).';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Connection error: Could not connect to QuasarSEO SMTP server.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default EmailService; 