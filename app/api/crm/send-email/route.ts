import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

/**
 * POST handler for sending automated emails based on CRM stage changes
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 CRM Email API: Starting email send request');
    await dbConnect();
    
    const body = await request.json();
    const { leadId, stage, manual = false, userId, recipientOption } = body;
    
    console.log(`📥 CRM Email API: Request data - leadId: ${leadId}, stage: ${stage}, manual: ${manual}`);
    
    // Validate input
    if (!leadId || !stage) {
      const error = 'Lead ID and stage are required';
      console.error(`❌ CRM Email API: ${error}`);
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    // Check if this stage should trigger an email
    const emailStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    if (!emailStages.includes(stage)) {
      const error = `Stage "${stage}" does not trigger automated emails`;
      console.log(`⚠️ CRM Email API: ${error}`);
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    console.log(`✅ CRM Email API: Stage "${stage}" is valid for email sending`);
    
    // Get lead from database
    console.log(`🔍 CRM Email API: Looking up lead with ID: ${leadId}`);
    const lead = await Lead.findById(leadId);
    if (!lead) {
      const error = 'Lead not found';
      console.error(`❌ CRM Email API: ${error} - ID: ${leadId}`);
      return NextResponse.json(
        { success: false, error },
        { status: 404 }
      );
    }
    
    console.log(`✅ CRM Email API: Found lead - Name: ${lead.name}, Email: ${lead.email}, Company: ${lead.company}`);
    
    // Check if we have required email data
    if (!lead.email || !lead.name || !lead.company) {
      const error = 'Lead missing required email data (name, email, or company)';
      console.error(`❌ CRM Email API: ${error} - Lead data:`, {
        name: lead.name,
        email: lead.email,
        company: lead.company
      });
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lead.email)) {
      const error = `Invalid email address format: ${lead.email}`;
      console.error(`❌ CRM Email API: ${error}`);
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    // Check if email already sent for this stage (only block if not manual)
    const emailHistory = lead.emailHistory || [];
    const alreadySent = emailHistory.some((email: any) => email.stage === stage);
    
    if (alreadySent && !manual) {
      const error = `Email already sent for stage: ${stage}. Use manual=true to override.`;
      console.log(`⚠️ CRM Email API: ${error}`);
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }
    
    if (alreadySent && manual) {
      console.log(`🔄 CRM Email API: Manual override enabled - resending email for stage: ${stage}`);
    }
    
    console.log(`📧 CRM Email API: Calling email service for lead: ${lead.name}`);
    
    // Determine recipient address and sender identity
    const targetEmail = recipientOption === 'company' && lead.authInformation?.company_email
      ? lead.authInformation.company_email
      : lead.email;

    const authorName = lead.companyOwner || lead.authInformation?.owner_name || lead.authInformation?.executive_name || lead.name;

    // Send email
    const emailResult = await emailService.sendStageEmail({
      name: lead.name,
      email: targetEmail,
      company: lead.company,
      stage: stage,
      senderOverride: recipientOption === 'author' ? authorName : undefined
    }, userId);
    
    console.log(`📨 CRM Email API: Email service result:`, emailResult);
    
    if (emailResult.success) {
      // Update lead with email history
      const emailRecord = {
        stage: stage,
        sentAt: new Date(),
        messageId: emailResult.messageId,
        status: 'sent',
        manual: manual || false // Track if this was a manual send
      };
      
      console.log(`💾 CRM Email API: Updating lead with email history:`, emailRecord);
      
      await Lead.findByIdAndUpdate(leadId, {
        $push: { emailHistory: emailRecord },
        $set: { 
          lastEmailedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ CRM Email API: Email sent successfully to ${lead.email} for stage: ${stage} (manual: ${manual})`);
      
      return NextResponse.json({
        success: true,
        message: `Email sent successfully for stage: ${stage}${manual ? ' (manual)' : ''}`,
        emailData: {
          to: targetEmail,
          stage: stage,
          messageId: emailResult.messageId,
          leadName: lead.name,
          company: lead.company,
          manual: manual
        }
      });
    } else {
      console.error(`❌ CRM Email API: Email sending failed:`, emailResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to send email: ${emailResult.error}` 
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 CRM Email API: Unexpected error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send email'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for testing email connection
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 CRM Email API: Testing email connection...');
    
    console.log(`📧 CRM Email API: Testing connection with QuasarSEO SMTP server`);
    
    // Test email service connection
    const connectionTest = await emailService.testConnection();
    
    console.log(`📨 CRM Email API: Connection test result:`, connectionTest);
    
    if (connectionTest.success) {
      console.log('✅ CRM Email API: Email connection successful');
      return NextResponse.json({
        success: true,
        message: 'Email service connection successful',
        config: {
          service: 'QuasarSEO SMTP',
          host: 'mail.zxcs.nl',
          port: 465,
          user: 'info@quasarseo.nl',
          senderName: process.env.SENDER_NAME || 'QuasarLeads Team'
        }
      });
    } else {
      console.error(`❌ CRM Email API: Email connection failed:`, connectionTest.error);
      return NextResponse.json(
        {
          success: false,
          error: `Email connection failed: ${connectionTest.error}`
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 CRM Email API: Connection test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Email connection test failed'
      },
      { status: 500 }
    );
  }
} 