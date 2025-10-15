import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Lead } from '@/models/leadSchema';
import EmailTemplate from '@/models/emailTemplateSchema';
import User from '@/models/userSchema';
import nodemailer from 'nodemailer';

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
    
    // Get email template and company settings using mongoose models
    const template = await EmailTemplate.findOne({ stage: nextStage, isActive: true });
    
    // Get company settings from raw collection (keeping this for now as we don't have a mongoose model for it)
    const mongooseConnection = await dbConnect();
    const db = mongooseConnection.connection.db;
    const settingsCollection = db.collection('companySettings');
    const companySettings = await settingsCollection.findOne({ type: 'default' });
    
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
    
    // Process email template with variables
    const emailContent = processEmailTemplate(template, lead, companySettings);
    
    // Get the userId from the lead if available
    const userId = lead.userId || lead.assignedTo;
    
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

// Process email template with variable substitution
function processEmailTemplate(template: any, lead: any, companySettings: any) {
  const variables = {
    '{{LEAD_NAME}}': lead.name || 'there',
    '{{NAME}}': lead.name || 'there',
    '{{COMPANY_NAME}}': lead.company || 'your company',
    '{{LOCATION}}': lead.location || 'your area',
    '{{SENDER_NAME}}': companySettings.senderName || 'QuasarSEO Team',
    '{{SENDER_EMAIL}}': companySettings.senderEmail || 'info@quasarseo.nl',
    '{{COMPANY_SERVICE}}': companySettings.service || 'AI-powered lead generation',
    '{{TARGET_INDUSTRY}}': companySettings.industry || 'Technology',
    '{{WEBSITE_URL}}': companySettings.websiteUrl || 'https://quasarleads.com'
  };
  
  let processedSubject = template.subject;
  let processedHtmlContent = template.htmlContent;
  let processedTextContent = template.textContent || '';
  
  // Replace variables in all content
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    processedSubject = processedSubject.replace(regex, value);
    processedHtmlContent = processedHtmlContent.replace(regex, value);
    processedTextContent = processedTextContent.replace(regex, value);
  });
  
  return {
    subject: processedSubject,
    htmlContent: processedHtmlContent,
    textContent: processedTextContent
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