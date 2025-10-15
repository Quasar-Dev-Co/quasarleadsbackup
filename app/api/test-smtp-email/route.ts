import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { emailService } from '@/lib/emailService';

export async function GET(): Promise<NextResponse> {
  try {
    console.log('🧪 Testing SMTP email sending...');
    await dbConnect();
    
    // Test connection first
    console.log('🔍 Testing SMTP connection...');
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: `SMTP connection failed: ${connectionTest.error}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    console.log('✅ SMTP connection verified successfully');
    
    // Send test email
    console.log('📧 Sending test email...');
    const testEmail = process.env.TEST_EMAIL || 'info.pravas.cmp@gmail.com';
    
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: `SMTP Test Email - ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">✅ SMTP Test Email</h2>
          <p>This is a test email to verify the QuasarSEO SMTP configuration is working correctly.</p>
          
          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px 0;">✅ Configuration Details:</h3>
            <ul style="margin: 0; color: #0c4a6e;">
              <li><strong>SMTP Host:</strong> mail.zxcs.nl</li>
              <li><strong>SMTP Port:</strong> 465 (SSL)</li>
              <li><strong>From:</strong> info@quasarseo.nl</li>
              <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p style="color: #64748b;">
            If you received this email, your QuasarSEO SMTP configuration is working perfectly! 🎉
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            QuasarSEO Email System Test<br>
            info@quasarseo.nl
          </p>
        </div>
      `,
      text: `SMTP Test Email - ${new Date().toISOString()}\n\nThis is a test email to verify the QuasarSEO SMTP configuration is working correctly.\n\nConfiguration:\n- SMTP Host: mail.zxcs.nl\n- SMTP Port: 465 (SSL)\n- From: info@quasarseo.nl\n- Test Time: ${new Date().toLocaleString()}\n\nIf you received this email, your QuasarSEO SMTP configuration is working perfectly!`
    });
    
    if (result.success) {
      console.log('✅ Test email sent successfully!', result);
      return NextResponse.json({
        success: true,
        message: 'SMTP test email sent successfully!',
        messageId: result.messageId,
        to: testEmail,
        timestamp: new Date().toISOString(),
        smtpConfig: {
          host: 'mail.zxcs.nl',
          port: 465,
          from: 'info@quasarseo.nl',
          secure: true
        }
      });
    } else {
      console.error('❌ Test email failed:', result.error);
      return NextResponse.json({
        success: false,
        error: `Failed to send test email: ${result.error}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Error in SMTP test:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test SMTP',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 