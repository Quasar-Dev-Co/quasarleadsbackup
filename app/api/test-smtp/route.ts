import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';
import { auth } from '@/lib/auth';

/**
 * Tests SMTP connection and sends a test email
 * POST /api/test-smtp
 * 
 * Required body params:
 * - smtpHost: string
 * - smtpPort: string
 * - smtpUser: string
 * - smtpPassword: string
 * - saveCredentials: boolean (optional, defaults to false)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { smtpHost, smtpPort, smtpUser, smtpPassword, saveCredentials, testRecipient } = body;

    // Validate required fields
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return NextResponse.json({
        success: false,
        error: 'Missing required SMTP credentials'
      }, { status: 400 });
    }
    
    // For saving credentials, try to get the current user (but don't require it for testing)
    let user: any = null;
    if (saveCredentials) {
      try {
        user = await auth.getCurrentUserFromDB();
      } catch (authError) {
        console.log('User not authenticated but proceeding with SMTP test');
      }
    }

    // Create test transporter with provided credentials
    const portNumber = parseInt(smtpPort, 10);
    const secure = portNumber === 465; // Common convention

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: portNumber,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000
    });

    // Verify connection
    await transporter.verify();

    // Set up email data
    // Priority: 1. Explicitly provided test recipient, 2. User's email, 3. SMTP username
    const recipient = testRecipient || (user?.email) || smtpUser;
    const mailOptions = {
      from: `"QuasarLeads Test" <${smtpUser}>`,
      to: recipient,
      subject: 'SMTP Test Email - QuasarLeads',
      text: 'This is a test email to verify your SMTP settings are working correctly.',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background-color: #6d28d9;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
              margin: -20px -20px 20px -20px;
            }
            h1 {
              margin: 0;
              font-weight: 600;
              font-size: 24px;
            }
            .content {
              padding: 20px 0;
            }
            .info-box {
              background-color: #f3f4f6;
              border-left: 4px solid #6d28d9;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-item {
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
              display: flex;
            }
            .info-item:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              width: 100px;
            }
            .value {
              flex: 1;
              text-align: right;
            }
            .success-badge {
              display: inline-block;
              background-color: #10b981;
              color: white;
              padding: 8px 16px;
              border-radius: 50px;
              font-weight: 500;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #6b7280;
              font-size: 14px;
            }
            .logo {
              font-weight: 700;
              font-size: 20px;
              letter-spacing: 0.5px;
            }
            .time {
              color: #6b7280;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">QuasarLeads</div>
              <h1>SMTP Configuration Test</h1>
            </div>
            
            <div class="content">
              <p>This email confirms that your SMTP settings are working correctly! 🎉</p>
              
              <div class="success-badge">
                ✓ Connection Successful
              </div>
              
              <div class="info-box">
                <div class="info-item">
                  <div class="label">Host</div>
                  <div class="value">${smtpHost}</div>
                </div>
                <div class="info-item">
                  <div class="label">Port</div>
                  <div class="value">${portNumber}</div>
                </div>
                <div class="info-item">
                  <div class="label">User</div>
                  <div class="value">${smtpUser}</div>
                </div>
              </div>
              
              <p>You can now use these settings for sending automated emails through QuasarLeads.</p>
              
              <p class="time">
                <strong>Sent at:</strong> ${new Date().toLocaleString()}<br>
                <strong>Recipient:</strong> ${recipient}
              </p>
            </div>
            
            <div class="footer">
              © ${new Date().getFullYear()} QuasarLeads - All rights reserved
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send test email
    const info = await transporter.sendMail(mailOptions);

    // Save credentials to user if requested and user is available
    const userId = user?._id || user?.id;
    if (saveCredentials && userId) {
      try {
        await dbConnect();
        
        await User.findByIdAndUpdate(userId, {
          credentials: {
            ...(user.credentials || {}),
            SMTP_HOST: smtpHost,
            SMTP_PORT: smtpPort.toString(),
            SMTP_USER: smtpUser,
            SMTP_PASSWORD: smtpPassword
          }
        });
      } catch (saveError) {
        console.error('Error saving credentials:', saveError);
        // Continue anyway since the test was successful
      }
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP connection successful! Test email sent.',
      data: {
        messageId: info.messageId,
        recipient
      }
    });

  } catch (error: any) {
    console.error('SMTP Test Error:', error);
    
    // Extract meaningful error message
    let errorMessage = error.message || 'Unknown error occurred';
    
    // Handle common SMTP errors with more user-friendly messages
    if (errorMessage.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused. Check your SMTP host and port.';
    } else if (errorMessage.includes('ETIMEDOUT')) {
      errorMessage = 'Connection timed out. Check your SMTP host and port.';
    } else if (errorMessage.includes('EAUTH')) {
      errorMessage = 'Authentication failed. Check your username and password.';
    } else if (errorMessage.includes('certificate')) {
      errorMessage = 'SSL/TLS certificate error. Try a different port or disable secure option.';
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}