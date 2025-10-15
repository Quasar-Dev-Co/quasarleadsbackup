import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { IncomingEmail, AIResponse } from '@/models/emailResponseSchema';
import { emailService } from '@/lib/emailService';
import { Lead } from '@/models/leadSchema';
import mongoose from 'mongoose';
import User from '@/models/userSchema';

// Import AI Settings model from the proper settings route
// NO hardcoded defaults - all values come from user's database settings
const aiSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  isEnabled: { type: Boolean, default: true },
  autoSendThreshold: { type: Number, default: 85 },
  defaultTone: { type: String, enum: ['professional', 'friendly', 'casual', 'formal'], default: 'professional' },
  includeCompanyInfo: { type: Boolean, default: true },
  maxResponseLength: { type: Number, default: 300 },
  customInstructions: { type: String, default: '' },
  responsePrompt: { type: String, default: '' },
  companyName: { type: String, default: '' },
  senderName: { type: String, default: '' },
  senderEmail: { type: String, default: '' },
  signature: { type: String, default: '' }
}, { timestamps: true });

const AISettings = mongoose.models.AISettings || mongoose.model('AISettings', aiSettingsSchema);

let OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generates an AI-powered response using OpenAI and the latest settings from database.
 * @param email The incoming email object from the database.
 * @param aiSettings The AI settings from the database (configured in frontend).
 * @returns An object containing the generated subject, content, and a flag if the response was dropped.
 */
async function generateAIResponse(email: any, aiSettings: any, apiKey: string): Promise<{ subject: string; content: string; isDropped: boolean; reasoning: string; }> {
  if (!apiKey) {
    return { isDropped: true, subject: '', content: '', reasoning: 'OPENAI_API_KEY is missing.' };
  }

  // CRITICAL: Only use the prompt from the database settings (what user configured in frontend)
  if (!aiSettings?.responsePrompt) {
    return { 
      isDropped: true, 
      subject: '', 
      content: '', 
      reasoning: 'No AI prompt found in settings. Please configure the prompt in the frontend AI Response Configuration section.' 
    };
  }

  // Build system prompt from user's configured prompt + guardrails
  const basePrompt: string = aiSettings.responsePrompt || '';
  const extraDirectives = `
You must follow the user's exact persona and tone. Never include placeholders like [your name], [phone], [email], etc. Do not add brackets around variables. Keep the response concise and human.
`;
  const systemPrompt = `${basePrompt}\n\n${aiSettings.customInstructions || ''}\n\n${extraDirectives}`.trim();

  const signatureRaw: string = aiSettings.signature || '';
  
  // Format the signature properly with HTML structure
  const formattedSignature = signatureRaw ? `
<br/><br/>
<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; font-family: Arial, sans-serif;">
${signatureRaw.replace(/\n/g, '<br/>')}
</div>
` : '';

  const userPrompt = `Here is the email you need to respond to using the configured instructions.

RESPONSE REQUIREMENTS:
1) Do NOT use any placeholders. Never write strings like [name], [phone], [email], etc.
2) Do NOT include any signature or sign-off in your response - the signature will be added automatically
3) Keep the body warm and professional. No sales pressure. Keep paragraphs short.
4) End your response after the main content - do not add "Best regards", "Sincerely", etc.

FROM: ${email.leadName} (${email.leadEmail})
SUBJECT: ${email.subject}
CONTENT:
---
${email.content}
---

Respond according to the configured instructions. Output HTML for any formatting you include.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_completion_tokens: aiSettings?.maxResponseLength || 400,
      }),
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API Error: ${response.status} ${response.statusText}`, errorText);
      return { isDropped: true, subject: '', content: '', reasoning: `OpenAI API returned status ${response.status}` };
    }

    const data = await response.json();
    let aiContent = data.choices?.[0]?.message?.content?.trim();
    if (!aiContent && data.output_text) {
      aiContent = String(data.output_text).trim();
    }

    if (!aiContent) {
      return { isDropped: true, subject: '', content: '', reasoning: 'OpenAI response was empty.' };
    }

    // Generate subject as "Re: [original subject]"
    const subject = `Re: ${email.subject}`;
    
    // Remove any existing signature-like content from AI response to prevent duplicates
    let cleanedContent = aiContent;
    
    // Remove common sign-offs that AI might add
    const signOffPatterns = [
      /Best regards,?\s*[\s\S]*$/i,
      /Sincerely,?\s*[\s\S]*$/i,
      /Kind regards,?\s*[\s\S]*$/i,
      /Thank you,?\s*[\s\S]*$/i,
      /Greetings,?\s*[\s\S]*$/i,
      /---SIGNATURE_START---[\s\S]*?---SIGNATURE_END---/gi,
    ];
    
    signOffPatterns.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '').trim();
    });
    
    // Always append the formatted signature (no duplication check needed since we cleaned the content)
    const content = cleanedContent + formattedSignature;

    if (!content || content.length < 20) {
      return { isDropped: true, subject: '', content: '', reasoning: 'AI content was too short or missing.' };
    }
    
    return {
      isDropped: false,
      subject,
      content,
      reasoning: 'Successfully generated using your configured prompt from frontend settings.'
    };

  } catch (error: any) {
    console.error(`❌ Error calling OpenAI API:`, error.message);
    return { isDropped: true, subject: '', content: '', reasoning: `OpenAI API error: ${error.message}` };
  }
}


/**
 * Generate beautiful Dutch final template for 3rd+ replies in cron job
 */
async function generateDutchFinalTemplateForCron(email: any, userId: string, aiSettings: any): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🇳🇱 Generating beautiful Dutch final template for ${email.leadEmail} (3rd+ reply)`);
    
    const companyName = aiSettings?.companyName || 'QuasarSEO';
    
    // Create beautiful Dutch template message with proper HTML formatting
    const subject = `Re: ${email.subject}`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Afspraak Boeken - ${companyName}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">Hallo ${email.leadName}! 👋</h1>
    </div>
    
    <div style="background: white; padding: 40px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <p style="font-size: 18px; color: #2c3e50; margin-bottom: 25px;">
            <strong>Dank je wel voor je blijvende interesse en vragen!</strong> 🙏
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px; color: #34495e;">
            Ik waardeer het enorm dat je de tijd hebt genomen om meerdere keren contact op te nemen. 
            Om ervoor te zorgen dat je de meest uitgebreide en persoonlijke ondersteuning krijgt, 
            zou ik graag direct met je in contact komen.
        </p>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; font-size: 16px; color: #2c3e50;">
                <strong>${companyName}</strong> is gespecialiseerd in AI-gestuurde leadgeneratie en digitale marketingoplossingen. 
                We hebben talloze bedrijven geholpen hun activiteiten op te schalen en hun omzet te verhogen 
                door middel van onze innovatieve benaderingen. 🚀
            </p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 25px; color: #34495e;">
            Als je specifieke vragen hebt of wilt bespreken hoe we je bedrijf kunnen helpen groeien, 
            plan ik graag een kort consultatiegesprek in waarin we dieper kunnen ingaan op jouw behoeften 
            en mogelijke oplossingen kunnen verkennen.
        </p>
        
        <div style="text-align: center; margin: 35px 0;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <p style="color: white; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    📅 Boek nu je gratis consultatiegesprek!
                </p>
                <a href="https://booking.quasarleads.com/68ae0964c18b63a4c450be71" 
                   style="display: inline-block; background: white; color: #667eea; padding: 15px 30px; 
                          text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px;
                          box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: all 0.3s ease;">
                    🔗 Klik hier om een afspraak in te plannen
                </a>
            </div>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #27ae60;">
                ✨ <strong>Waarom kiezen voor ${companyName}?</strong><br>
                • Bewezen resultaten • AI-gedreven aanpak • Persoonlijke begeleiding • Gratis eerste consult
            </p>
        </div>
        
        <p style="font-size: 16px; color: #34495e; text-align: center; margin-top: 30px;">
            Ik kijk ernaar uit om binnenkort met je te spreken! 😊
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #667eea; font-weight: 600;">
                Met vriendelijke groet,<br>
                <span style="color: #2c3e50;">Team ${companyName}</span>
            </p>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding: 15px;">
        <p style="font-size: 12px; color: #7f8c8d; margin: 0;">
            Deze e-mail is automatisch gegenereerd. Voor directe vragen, boek een gesprek via de link hierboven.
        </p>
    </div>
</body>
</html>`;
    
    // Create plain text version
    const textContent = `Hallo ${email.leadName}!

Dank je wel voor je blijvende interesse en vragen!

Ik waardeer het enorm dat je de tijd hebt genomen om meerdere keren contact op te nemen. Om ervoor te zorgen dat je de meest uitgebreide en persoonlijke ondersteuning krijgt, zou ik graag direct met je in contact komen.

${companyName} is gespecialiseerd in AI-gestuurde leadgeneratie en digitale marketingoplossingen. We hebben talloze bedrijven geholpen hun activiteiten op te schalen en hun omzet te verhogen door middel van onze innovatieve benaderingen.

Als je specifieke vragen hebt of wilt bespreken hoe we je bedrijf kunnen helpen groeien, plan ik graag een kort consultatiegesprek in waarin we dieper kunnen ingaan op jouw behoeften en mogelijke oplossingen kunnen verkennen.

📅 Boek nu je gratis consultatiegesprek:
https://booking.quasarleads.com/68ae0964c18b63a4c450be71

Waarom kiezen voor ${companyName}?
• Bewezen resultaten
• AI-gedreven aanpak  
• Persoonlijke begeleiding
• Gratis eerste consult

Ik kijk ernaar uit om binnenkort met je te spreken!

Met vriendelijke groet,
Team ${companyName}

---
Deze e-mail is automatisch gegenereerd. Voor directe vragen, boek een gesprek via de link hierboven.`;
    
    // Save the Dutch final template response
    const newAIResponse = new AIResponse({
      incomingEmailId: email._id,
      generatedSubject: subject,
      generatedContent: htmlContent,
      status: 'sending',
      responseType: 'final_template',
      reasoning: `Beautiful Dutch final template for 3rd+ reply (conversation count: ${email.conversationCount || 3})`,
      userId: userId,
    });
    
    await newAIResponse.save();
    
    // Send the email using user's SMTP credentials
    const emailPayload = {
      to: email.leadEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
    };
    
    const emailResult = await emailService.sendEmailForUser(userId, emailPayload);
    
    if (emailResult.success) {
      // Update AI response with sent status
      await AIResponse.findByIdAndUpdate(newAIResponse._id, {
        status: 'sent',
        sentAt: new Date(),
        sentMessageId: emailResult.messageId
      });
      
      // Update incoming email with responded status
      await IncomingEmail.findByIdAndUpdate(email._id, {
        status: 'responded',
        respondedAt: new Date()
      });
      
      console.log(`✅ Beautiful Dutch final template sent to: ${email.leadEmail}`);
      return { success: true };
    } else {
      // Update AI response with failed status
      await AIResponse.findByIdAndUpdate(newAIResponse._id, {
        status: 'failed',
        sentAt: new Date(),
        sentMessageId: emailResult.error || 'Email sending failed'
      });
      
      console.error(`❌ Failed to send Dutch final template to: ${email.leadEmail}. Error: ${emailResult.error}`);
      return { success: false, error: emailResult.error };
    }

  } catch (error: any) {
    console.error(`❌ Error generating Dutch final template:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends an email reply and logs the response in the database.
 */
async function sendAndLogReply(email: any, reply: { subject: string, content: string }, reasoning: string, userId?: string, aiSettings?: any): Promise<boolean> {
  try {
    // Create the new AI response record
    const newAIResponse = new AIResponse({
      incomingEmailId: (email as any)._id,
    generatedSubject: reply.subject,
    generatedContent: reply.content,
    status: 'sending',
      responseType: 'ai_generated',
    reasoning: reasoning,
      userId: userId
  });
    
    await newAIResponse.save();
    console.log(`💾 AI response saved to database for email: ${email.subject}`);

    // Send the email using the email service, preserving HTML if present
    const containsHtml = /<[^>]+>/.test(reply.content);
    const htmlBody = containsHtml
      ? reply.content
      : `<div style=\"font-family: Arial, sans-serif; white-space: pre-line;\">${reply.content}</div>`;
    const textBody = reply.content.replace(/<[^>]*>/g, '');

    const emailPayload = {
      to: email.leadEmail,
      subject: reply.subject,
      text: textBody,
      html: htmlBody
      // fromName and fromEmail will be handled by sendEmailForUser from user's SMTP credentials
    } as any;

    if (!userId) {
      console.error('❌ Missing userId for SMTP sending. Skipping send to avoid env fallback.');
      return false;
    }
    const emailResult = await emailService.sendEmailForUser(userId, emailPayload);
    
    if (emailResult.success) {
      // Update AI response with sent status
      await AIResponse.findByIdAndUpdate(newAIResponse._id, {
        status: 'sent',
        sentAt: new Date(),
        sentMessageId: emailResult.messageId
      });
      
      // Update incoming email with responded status
      await IncomingEmail.findByIdAndUpdate((email as any)._id, {
        status: 'responded',
        respondedAt: new Date()
      });
      
      console.log(`✅ AI response sent successfully to: ${email.leadEmail}`);
    return true;
    } else {
      // Update AI response with failed status
      await AIResponse.findByIdAndUpdate(newAIResponse._id, {
        status: 'failed',
        sentAt: new Date(),
        sentMessageId: emailResult.error || 'Email sending failed'
      });
      
      console.error(`❌ Failed to send AI response to: ${email.leadEmail}. Error: ${emailResult.error}`);
      return false;
    }
      
    } catch (error: any) {
    console.error(`❌ Error in sendAndLogReply:`, error.message);
    return false;
  }
}

/**
 * Multi-User Vercel Cron Job: Processes unread emails for ALL users with AI settings enabled.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('🤖 Multi-User Email Response Processing Started');
  await dbConnect();
  
  try {
    // Get all users with complete SMTP credentials
    const users = await User.find({
      'credentials.SMTP_HOST': { $exists: true, $ne: '' },
      'credentials.SMTP_PORT': { $exists: true, $ne: '' },
      'credentials.SMTP_USER': { $exists: true, $ne: '' },
      'credentials.SMTP_PASSWORD': { $exists: true, $ne: '' }
    }).lean();
    
    if (users.length === 0) {
    return NextResponse.json({
      success: false,
        error: 'No users found with complete SMTP credentials'
      }, { status: 404 });
    }

    console.log(`👥 Processing email responses for ${users.length} users with SMTP credentials...`);

    let totalProcessed = 0;
    let totalSent = 0;
    let totalErrors = 0;
    const userResults: any[] = [];

    // Process each user separately
    for (const user of users) {
      const result = await processUserEmailResponses(user as any);
      userResults.push(result);
      totalProcessed += result.processed;
      totalSent += result.sent;
      totalErrors += result.errors;
    }

    console.log(`\n📊 Multi-User Processing Summary:`);
    console.log(`   Users Processed: ${users.length}`);
    console.log(`   Total Emails Processed: ${totalProcessed}`);
    console.log(`   Total Replies Sent: ${totalSent}`);
    console.log(`   Total Errors: ${totalErrors}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Multi-user email processing completed',
      summary: {
        usersProcessed: users.length,
        totalEmailsProcessed: totalProcessed,
        totalRepliesSent: totalSent,
        totalErrors: totalErrors
      },
      userResults: userResults
    });

  } catch (error: any) {
    console.error('❌ Fatal error in multi-user email processing:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process emails'
    }, { status: 500 });
  }
}

/**
 * Process email responses for a single user
 */
async function processUserEmailResponses(user: any): Promise<{ userId: string; email: string; processed: number; sent: number; errors: number; message?: string }> {
  const userIdString = user._id.toString();
  const userEmail = user.email;

  try {
    console.log(`\n📧 Processing emails for user: ${userEmail} (${userIdString})`);
    
    // Get unread emails for this specific user
    const unreadEmails = await IncomingEmail.find({ 
      status: 'unread',
      userId: userIdString 
    }).lean();
    
    console.log(`📧 Found ${unreadEmails.length} unread emails for ${userEmail}`);
    
    if (unreadEmails.length === 0) {
      return {
        userId: userIdString,
        email: userEmail,
        processed: 0,
        sent: 0,
        errors: 0,
        message: 'No unread emails'
      };
    }

    // Get AI settings for this user
    let aiSettings = await AISettings.findOne({ userId: userIdString }).lean();
    
    // If no settings exist for this user, create default ones
    if (!aiSettings) {
      console.log(`⚠️ No AI settings found for ${userEmail}, creating default settings...`);
      // Don't create default settings - user must configure AI settings in frontend first
      console.log(`❌ No AI settings found for ${userEmail}. User must configure AI settings in the frontend first.`);
      return {
        userId: userIdString,
        email: userEmail,
        processed: 0,
        sent: 0,
        errors: 1,
        message: 'No AI settings configured. Please configure AI settings in the frontend first.'
      };
      // No need to save or fetch - we're returning early
    }

    if (!aiSettings) {
      return {
        userId: userIdString,
        email: userEmail,
        processed: 0,
        sent: 0,
        errors: 1,
        message: 'Failed to create AI settings'
      };
    }

    console.log(`🤖 AI settings for ${userEmail}: ${(aiSettings as any).isEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📋 AI Settings Debug for ${userEmail}:`);
    console.log(`   - Response Prompt: ${(aiSettings as any).responsePrompt ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`   - Company Name: ${(aiSettings as any).companyName || 'NOT SET'}`);
    console.log(`   - Sender Name: ${(aiSettings as any).senderName || 'NOT SET'}`);
    console.log(`   - Signature: ${(aiSettings as any).signature ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`   - Max Response Length: ${(aiSettings as any).maxResponseLength || 'DEFAULT'}`);
    
    if (!(aiSettings as any).isEnabled) {
      console.log(`⏯️ AI responses disabled for ${userEmail}, skipping...`);
      return {
        userId: userIdString,
        email: userEmail,
        processed: 0,
        sent: 0,
        errors: 0,
        message: 'AI responses disabled'
      };
    }

    const creds = user?.credentials || {};
    const emailServiceApiKey = creds.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    console.log(`🔑 Credentials Debug for ${userEmail}:`);
    console.log(`   - SMTP Host: ${creds.SMTP_HOST ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`   - SMTP User: ${creds.SMTP_USER ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`   - OpenAI API Key: ${creds.OPENAI_API_KEY ? 'USER KEY' : (process.env.OPENAI_API_KEY ? 'ENV KEY' : 'MISSING')}`);
    
    if (!emailServiceApiKey) {
      console.log(`⚠️ No OpenAI API key found for ${userEmail}, skipping...`);
      return {
        userId: userIdString,
        email: userEmail,
        processed: 0,
        sent: 0,
        errors: 1,
        message: 'No OpenAI API key'
      };
    }

    let processedEmails = 0;
    let sentReplies = 0;
    let errors = 0;

    // Process each unread email for this user
    for (const email of unreadEmails) {
      try {
        console.log(`📧 Processing email from: ${email.leadEmail} for user: ${userEmail}`);
        
        // Check if this is 3rd+ reply and skip processing
        const isThirdReply = (email as any).isThirdReply || (email as any).conversationCount >= 3;
        
        if (isThirdReply) {
          console.log(`🇳🇱 Sending Dutch final template for ${email.leadEmail} (3rd+ reply)`);
          
          // Generate Dutch final template response
          const finalTemplate = await generateDutchFinalTemplateForCron(email, userIdString, aiSettings);
          
          if (finalTemplate.success) {
            sentReplies++;
            console.log(`✅ Dutch final template sent successfully to: ${email.leadEmail}`);
          } else {
            errors++;
            console.log(`❌ Failed to send Dutch final template to: ${email.leadEmail}`);
          }
          
          processedEmails++;
          continue;
        }
        
        // Generate normal AI response for 1st and 2nd replies
        console.log(`🤖 Generating AI response for email from ${email.leadEmail}... (reply #${(email as any).conversationCount || 1})`);
        const aiResponse = await generateAIResponse(email, aiSettings, emailServiceApiKey);
        console.log(`📝 AI Response Result: ${aiResponse.isDropped ? 'DROPPED' : 'GENERATED'} - ${aiResponse.reasoning}`);
        if (!aiResponse.isDropped) {
          console.log(`   - Subject: ${aiResponse.subject}`);
          console.log(`   - Content Length: ${aiResponse.content?.length || 0} characters`);
        }
        
        if (aiResponse.isDropped) {
          console.log(`⏭️ Email dropped for ${userEmail}: ${aiResponse.reasoning}`);
          
          // Persist a failed AIResponse so it's visible in DB/debug
          try {
            await new AIResponse({
              incomingEmailId: (email as any)._id,
              generatedSubject: `Re: ${email.subject}`,
              generatedContent: '',
              status: 'failed',
              responseType: 'ai_generated',
              reasoning: aiResponse.reasoning,
              userId: userIdString,
              lastError: aiResponse.reasoning
            }).save();
          } catch {}

          // Update email status to processed (even if dropped)
          await IncomingEmail.findByIdAndUpdate((email as any)._id, {
            status: 'processed',
            processedAt: new Date()
          });
          
          processedEmails++;
          continue;
        }

        // Send the email using user's SMTP credentials and log the response
        const success = await sendAndLogReply(email, aiResponse, aiResponse.reasoning, userIdString, aiSettings);
        
      if (success) {
          sentReplies++;
          console.log(`✅ Reply sent successfully to: ${email.leadEmail} from user: ${userEmail}`);
      } else {
          errors++;
          console.log(`❌ Failed to send reply to: ${email.leadEmail} for user: ${userEmail}`);
        }
        
        processedEmails++;
        
    } catch (error: any) {
        console.error(`❌ Error processing email from ${email.leadEmail} for user ${userEmail}:`, error.message);
        errors++;
        processedEmails++;
      }
    }

    return {
      userId: userIdString,
      email: userEmail,
      processed: processedEmails,
      sent: sentReplies,
      errors: errors
    };

  } catch (error: any) {
    console.error(`❌ Error processing emails for user ${userEmail}:`, error.message);
    return {
      userId: userIdString,
      email: userEmail,
      processed: 0,
      sent: 0,
      errors: 1,
      message: error.message
    };
  }
}

// POST - Manual trigger for testing
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔧 Manual trigger: Processing email responses...');
  return GET(request);
}