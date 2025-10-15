import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';

/**
 * POST - Send test email with template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, testEmail, testLead, companySettings, userId: userIdFromBody } = body;
    const authHeader = request.headers.get('authorization') || '';
    const userIdFromHeader = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    const userId = userIdFromHeader || userIdFromBody || '';
    
    // Validate input
    if (!template || !testEmail || !testLead || !companySettings) {
      return NextResponse.json(
        { success: false, error: 'Template, test email, test lead data, and company settings are required' },
        { status: 400 }
      );
    }

    if (!template.subject || !template.htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Template must have subject and HTML content' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid test email address' },
        { status: 400 }
      );
    }

    // Ensure userId and SMTP credentials exist
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId. Please login again.' },
        { status: 401 }
      );
    }

    await dbConnect();
    const user: any = await User.findById(userId).lean();
    const creds = user?.credentials || {};
    const smtpMissing: string[] = [];
    if (!creds.SMTP_HOST) smtpMissing.push('SMTP_HOST');
    if (!creds.SMTP_PORT) smtpMissing.push('SMTP_PORT');
    if (!creds.SMTP_USER) smtpMissing.push('SMTP_USER');
    if (!creds.SMTP_PASSWORD) smtpMissing.push('SMTP_PASSWORD');
    if (smtpMissing.length > 0) {
      return NextResponse.json(
        { success: false, error: `SMTP not configured. Missing: ${smtpMissing.join(', ')}. Save your SMTP in Credentials first.` },
        { status: 400 }
      );
    }

    // Replace template variables with test data
    const variables = {
      '{{LEAD_NAME}}': testLead.name || 'Test Lead',
      '{{OWNER_NAME}}': testLead.ownerName || testLead.name || 'Test Owner',
      '{{COMPANY_NAME}}': testLead.company || 'Test Company',
      '{{COMPANY_REVIEW}}': testLead.reviews || testLead.rating || '4.5 stars with 127 positive reviews',
      '{{SENDER_NAME}}': companySettings.senderName || 'QuasarLeads Team',
      '{{SENDER_EMAIL}}': companySettings.senderEmail || 'info@quasarseo.nl',
      '{{COMPANY_SERVICE}}': companySettings.service || 'AI-powered lead generation',
      '{{TARGET_INDUSTRY}}': companySettings.industry || 'Technology',
      '{{WEBSITE_URL}}': companySettings.websiteUrl || 'https://quasarleads.com'
    };

    // Process subject
    let processedSubject = template.subject;
    Object.entries(variables).forEach(([key, value]) => {
      processedSubject = processedSubject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // Process HTML content
    let processedHtmlContent = template.htmlContent;
    Object.entries(variables).forEach(([key, value]) => {
      processedHtmlContent = processedHtmlContent.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // Process text content
    let processedTextContent = template.textContent || '';
    Object.entries(variables).forEach(([key, value]) => {
      processedTextContent = processedTextContent.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // Add test notice to subject and content
    const testSubject = `[TEST] ${processedSubject}`;
    const testNotice = `
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin-bottom: 20px; text-align: center;">
      <strong>⚠️ TEST EMAIL</strong><br>
      <small>This is a test email sent from the QuasarLeads Email Template Manager</small>
    </div>
    `;
    const testHtmlContent = testNotice + processedHtmlContent;
    
    const testTextNotice = `
==== TEST EMAIL ====
This is a test email sent from the QuasarLeads Email Template Manager
Template Stage: ${template.stage || 'Unknown'}
====================

`;
    const testTextContent = testTextNotice + processedTextContent;

    // Send email using the user's SMTP credentials
    const emailResult = await emailService.sendEmailForUser(userId, {
      to: testEmail,
      subject: testSubject,
      html: testHtmlContent,
      text: testTextContent,
      leadId: 'test-lead',
      stage: template.stage || 'test'
    });

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        emailData: {
          to: testEmail,
          subject: testSubject,
          messageId: emailResult.messageId,
          stage: template.stage,
          testData: {
            leadName: testLead.name,
            companyName: testLead.company
          }
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to send test email: ${emailResult.error}` 
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Test email sending error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test email'
      },
      { status: 500 }
    );
  }
} 