import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { IncomingEmail, AIResponse } from '@/models/emailResponseSchema';
import Lead from '@/models/leadSchema';
import mongoose from 'mongoose';

/**
 * POST: Saves a new incoming email to the database.
 * This is called by the IMAP fetching service.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const body = await request.json();
    const {
      userId,
      leadEmail,
      subject,
      content,
      htmlContent,
      fromAddress,
      toAddress,
      messageId,
      inReplyTo,
      references,
      isReply,
      isRecent,
      threadId,
    } = body;
    
    if (!leadEmail || !subject || !content) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: leadEmail, subject, content'
      }, { status: 400 });
    }
    
    // Find associated lead or create a new one
    let lead = await Lead.findOne({ email: { $regex: new RegExp(`^${leadEmail}$`, 'i') } });
    let leadName: string;

    if (lead) {
      leadName = lead.name || leadEmail.split('@')[0].replace(/[.\-_]/g, ' ');
    } else {
      console.log(`⚠️ No lead found for email: ${leadEmail}. Creating a new one.`);
      leadName = leadEmail.split('@')[0].replace(/[.\-_]/g, ' ');
      lead = new Lead({
        name: leadName,
        email: leadEmail,
        company: leadEmail.split('@')[1] || 'Unknown',
        location: 'Email Reply', // Default location for leads created from email replies
        status: 'active',
        source: 'email-reply',
        assignedTo: userId || undefined, // Use provided userId or leave undefined
        leadsCreatedBy: userId || undefined, // Use provided userId or leave undefined
      });
      await lead.save();
      console.log(`✅ Created new lead for: ${leadEmail}`);
    }
    
    // Check if this is a reply to one of our 7 email sequence emails
    let isReplyToSequence = false;
    let originalEmailStage = null;
    
    if (lead && lead.emailHistory && lead.emailHistory.length > 0) {
      // Check if this email is a reply to any of our sequence emails
      const emailStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
      
      // Look for recent emails sent to this lead (within last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentEmails = lead.emailHistory.filter((email: any) => 
        email.status === 'sent' && 
        email.sentAt && 
        new Date(email.sentAt) > thirtyDaysAgo &&
        emailStages.includes(email.stage)
      );
      
      if (recentEmails.length > 0) {
        // This is likely a reply to our sequence
        isReplyToSequence = true;
        originalEmailStage = recentEmails[recentEmails.length - 1].stage; // Get the most recent stage
        console.log(`🎯 Detected reply to email sequence! Original stage: ${originalEmailStage}`);
      }
    }
    
    // Track conversation count for response limits
    let conversationCount = 0;
    let conversationId = `conv-${leadEmail.toLowerCase()}-${Date.now()}`;
    let isThirdReply = false;
    
    // Find previous emails from this lead to count conversation
    const previousEmails = await IncomingEmail.find({
      leadEmail: { $regex: new RegExp(`^${leadEmail}$`, 'i') },
      userId: userId || undefined
    }).sort({ receivedAt: -1 }).limit(10); // Check last 10 emails
    
    if (previousEmails.length > 0) {
      // Use existing conversation ID if available
      conversationId = previousEmails[0].conversationId || conversationId;
      conversationCount = previousEmails.length + 1; // Current email count
      
      // Check if this is 3rd or more reply
      if (conversationCount >= 3) {
        isThirdReply = true;
        console.log(`🔄 This is the ${conversationCount}th reply from ${leadEmail} - will send final template`);
      } else {
        console.log(`🔄 This is the ${conversationCount}th reply from ${leadEmail} - will send AI response`);
      }
    } else {
      conversationCount = 1;
      console.log(`🆕 First email from ${leadEmail} - will send AI response`);
    }
    
    // Create the new incoming email record with enhanced structure
    const incomingEmail = new IncomingEmail({
      userId: userId ? userId : undefined,
      leadId: lead._id,
      leadName: leadName,
      leadEmail: leadEmail,
      subject: subject,
      content: content,
      htmlContent: htmlContent || '',
      status: 'unread', // Start as unread, ready for processing
      isReply: isReply || isReplyToSequence, // Mark as reply if it's to our sequence
      isRecent: isRecent !== undefined ? isRecent : true,
      threadId: threadId || `thread-${Date.now()}-${Math.random()}`,
      conversationCount: conversationCount,
      conversationId: conversationId,
      isThirdReply: isThirdReply,
      metadata: {
        messageId: messageId || '',
        inReplyTo: inReplyTo || '',
        fromAddress: fromAddress || leadEmail,
        toAddress: toAddress || '',
        references: references || '',
        originalEmailStage: originalEmailStage, // Store which stage this is replying to
        isReplyToSequence: isReplyToSequence
      }
    });
    
    await incomingEmail.save();
    
    console.log(`📧 New incoming email saved from ${leadEmail}`);
    console.log(`   - Reply to sequence: ${isReplyToSequence ? 'YES' : 'NO'}`);
    console.log(`   - Original stage: ${originalEmailStage || 'N/A'}`);
    console.log(`   - Conversation count: ${conversationCount}`);
    console.log(`   - 3rd+ reply: ${isThirdReply ? 'YES' : 'NO'}`);
    console.log(`   - Status: ${incomingEmail.status} (waiting for cron job to process)`);
    
    // DO NOT AUTO-SEND - Let the cron job handle generating and saving draft responses
    // Cron job will:
    // 1. Fetch this email (status: unread)
    // 2. Generate AI response
    // 3. Save as DRAFT (not auto-send)
    // 4. User reviews and clicks send in UI
    
    return NextResponse.json({
      success: true,
      emailId: incomingEmail._id.toString(),
      message: 'Incoming email saved. Cron job will generate draft response for user review.',
      isReplyToSequence: isReplyToSequence,
      originalStage: originalEmailStage,
      conversationCount: conversationCount,
      isThirdReply: isThirdReply,
      status: incomingEmail.status
    });
    
  } catch (error: any) {
    console.error('❌ Error processing incoming email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process incoming email'
    }, { status: 500 });
  }
}

/**
 * Generate beautiful Dutch final template for 3rd+ replies
 */
async function generateDutchFinalTemplate(incomingEmail: any, lead: any): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🇳🇱 Generating beautiful Dutch final template for ${lead.email} (3rd+ reply)`);
    
    // Load AI settings from database to get company info
    const connection = await dbConnect();
    const db = connection.connection.db;
    const settingsCollection = db.collection('aisettings');
    const aiSettings = await settingsCollection.findOne({ settingsId: 'default' });
    
    const companyName = aiSettings?.companyName || 'QuasarSEO';
    
    // Create beautiful Dutch template message with proper HTML formatting
    const subject = `Re: ${incomingEmail.subject}`;
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
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">Hallo ${incomingEmail.leadName}! 👋</h1>
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
    const textContent = `Hallo ${incomingEmail.leadName}!

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
      incomingEmailId: incomingEmail._id,
      generatedSubject: subject,
      generatedContent: htmlContent,
      status: 'sent', // Auto-send Dutch template
      responseType: 'final_template',
      reasoning: `Beautiful Dutch final template for 3rd+ reply (conversation count: ${incomingEmail.conversationCount})`,
      userId: (incomingEmail as any)?.userId || undefined,
    });
    
    await newAIResponse.save();
    
    // Send the email automatically using per-user SMTP only
    const emailService = require('@/lib/emailService').emailService;
    const userId = (incomingEmail as any)?.userId?.toString();
    if (!userId) {
      console.error('❌ Missing userId for SMTP sending. Skipping auto-send to avoid env fallback.');
      return { success: false, error: 'Missing userId for SMTP sending' };
    }

    const emailPayload = {
      to: incomingEmail.leadEmail,
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
      
      console.log(`✅ Beautiful Dutch final template sent to ${incomingEmail.leadEmail}`);
      return { success: true };
    } else {
      console.error(`❌ Failed to send Dutch final template: ${emailResult.error}`);
      return { success: false, error: `Failed to send email: ${emailResult.error}` };
    }

  } catch (error: any) {
    console.error(`❌ Error generating Dutch final template:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate AI response for replies to email sequence
 */
async function generateAIResponseForSequenceReply(incomingEmail: any, lead: any, originalStage: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🤖 Generating AI response for sequence reply from ${lead.email} (original stage: ${originalStage})`);
    
    // Load AI settings from database
    const connection = await dbConnect();
    const db = connection.connection.db;
    const settingsCollection = db.collection('aisettings');
    const aiSettings = await settingsCollection.findOne({ settingsId: 'default' });
    
    if (!aiSettings) {
      return { success: false, error: 'AI settings not found' };
    }
    
    // Create a specialized prompt for sequence replies
    const sequenceReplyPrompt = `**CRITICAL DIRECTIVES: Failure to follow these rules will result in an error. This is not a suggestion.**

1. **SIGNATURE:** The response MUST end with **EXACTLY** this signature:
   Warmly,
   Team QuasarSEO

2. **NO PLACEHOLDERS:** You MUST NOT use placeholders like \`[Your Name]\` or \`[insert their concern]\` in your final output.

3. **CONTEXT:** This is a reply to one of our 7-email sequence. The original email was from stage: ${originalStage}

4. **TONE:** The tone must be warm, human, and helpful. ABSOLUTELY NO sales pressure.

**Your Persona:** You are a calm, engaged entrepreneur who truly listens. Your goal is to establish a connection and gently guide them to schedule a casual Zoom meeting.

**Response Structure (Follow this EXACTLY):**

**1. Acknowledge with Genuine Attention:**
Show empathy and understanding based on the client's email.

**2. Ask an Open-Ended Follow-up Question:**
Invite dialogue with a soft, open question.

**3. Gently Suggest a Zoom Call (If appropriate):**
Offer a low-pressure call and provide the booking link.
*Rule:* When user asked for meeting then, You have to suggest a call, ONLY send or mention this link: https://testqlagain.vercel.app/clientbooking dont asked for any date and time, just send the link and tell got to the link and book the meeting.

**4. End with a Friendly, Open Tone:**
Let them know they can reply at their convenience.

**PERFECT RESPONSE EXAMPLE:**
Hi [Client's Name],

Thanks so much for reaching out. I completely understand what you're looking for and how important it is to find the right path forward. It sounds like you're really thinking about [their specific concern, which you will identify] right now, and I'd love to help however I can.

What has been the most important factor for you in this decision? I'd love to hear more about what's on your mind.

If it feels right, maybe we can take a few minutes to look at this together. I'd be happy to jump on a quick Zoom call to brainstorm ideas and see what could work best for you. Here's a link to book a time that works for you: https://testqlagain.vercel.app/clientbooking

No rush at all — feel free to reach out when it's convenient for you. I'm looking forward to hearing from you soon.

Warmly,
Team QuasarSEO

**FINAL CHECK: Before responding, verify you have followed all CRITICAL DIRECTIVES.**`;

    // Call OpenAI API
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    const userPrompt = `Here is the email reply you need to respond to:

FROM: ${incomingEmail.leadName} (${incomingEmail.leadEmail})
SUBJECT: ${incomingEmail.subject}
CONTENT:
---
${incomingEmail.content}
---

This is a reply to our email sequence (original stage: ${originalStage}). Respond according to the configured instructions.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sequenceReplyPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: aiSettings.maxResponseLength || 400,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API Error: ${response.status} ${response.statusText}`, errorText);
      return { success: false, error: `OpenAI API returned status ${response.status}` };
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content?.trim();

    if (!aiContent) {
      return { success: false, error: 'OpenAI response was empty' };
    }

    // Generate subject as "Re: [original subject]"
    const subject = `Re: ${incomingEmail.subject}`;
    const content = aiContent;

    if (!content || content.length < 20) {
      return { success: false, error: 'AI content was too short or missing' };
    }
    
    // Save the AI response
    const newAIResponse = new AIResponse({
      incomingEmailId: incomingEmail._id,
      generatedSubject: subject,
      generatedContent: content,
      status: 'sent', // Auto-send for sequence replies
      responseType: 'sequence_reply',
      reasoning: `Auto-generated response for reply to email sequence (stage: ${originalStage})`,
      userId: (incomingEmail as any)?.userId || undefined,
    });
    
    await newAIResponse.save();
    
    // Send the email automatically using per-user SMTP only
    const emailService = require('@/lib/emailService').emailService;
    const userId = (incomingEmail as any)?.userId?.toString();
    if (!userId) {
      console.error('❌ Missing userId for SMTP sending. Skipping auto-send to avoid env fallback.');
      return { success: false, error: 'Missing userId for SMTP sending' };
    }

    const emailPayload = {
      to: incomingEmail.leadEmail,
      subject: subject,
      text: content,
      html: `<div style=\"font-family: Arial, sans-serif;\">${content.replace(/\n/g, '<br>')}</div>`,
    };
    const emailResult = await emailService.sendEmailForUser(userId, emailPayload);
    
    if (emailResult.success) {
      // Update AI response with sent status
      await AIResponse.findByIdAndUpdate(newAIResponse._id, {
        status: 'sent',
        sentAt: new Date(),
        sentMessageId: emailResult.messageId
      });
      
      console.log(`✅ Auto-sent AI response to ${incomingEmail.leadEmail}`);
      return { success: true };
    } else {
      console.error(`❌ Failed to send auto-generated response: ${emailResult.error}`);
      return { success: false, error: `Failed to send email: ${emailResult.error}` };
    }

  } catch (error: any) {
    console.error(`❌ Error generating AI response for sequence reply:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * GET: Fetches a paginated list of incoming emails.
 * (Keeping this for potential UI use, but simplifying the returned data)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const authHeader = request.headers.get('authorization') || '';
    const bearerUserId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    
    const query: any = {};
    // Filter by userId if provided
    if (bearerUserId && mongoose.Types.ObjectId.isValid(bearerUserId)) {
      query.userId = bearerUserId;
    }
    const emails = await IncomingEmail.find(query)
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const totalCount = await IncomingEmail.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      emails: emails.map(email => ({
        id: (email as any)._id.toString(),
        leadId: email.leadId?.toString() || '',
        leadName: email.leadName,
        leadEmail: email.leadEmail,
        leadCompany: email.leadEmail.split('@')[1] || 'Unknown',
        subject: email.subject,
        content: email.content,
        htmlContent: email.htmlContent || '',
        status: email.status,
        receivedAt: email.receivedAt,
        respondedAt: email.respondedAt,
        isReply: email.isReply || false,
        isRecent: email.isRecent !== undefined ? email.isRecent : true,
        threadId: email.threadId || '',
        sentiment: email.sentiment || 'neutral',
        originalEmailId: email.originalEmailId?.toString() || '',
        metadata: email.metadata || {}
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching incoming emails:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch incoming emails'
    }, { status: 500 });
  }
}

// PUT - Update email status
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { emailId, status, sentiment } = body;
    
    if (!emailId) {
      return NextResponse.json({
        success: false,
        error: 'Email ID is required'
      }, { status: 400 });
    }
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (sentiment) updateData.sentiment = sentiment;
    if (status === 'read') updateData.processedAt = new Date();
    
    const updatedEmail = await IncomingEmail.findByIdAndUpdate(
      emailId,
      updateData,
      { new: true }
    ).lean();
    
    if (!updatedEmail) {
      return NextResponse.json({
        success: false,
        error: 'Email not found'
      }, { status: 404 });
    }
    
    console.log(`📧 Email ${emailId} updated: ${status ? `status=${status}` : ''} ${sentiment ? `sentiment=${sentiment}` : ''}`);
    
    return NextResponse.json({
      success: true,
      email: updatedEmail,
      message: 'Email updated successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error updating email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update email'
    }, { status: 500 });
  }
}

// Simple sentiment analysis function
function analyzeSentiment(content: string): string {
  const text = content.toLowerCase();
  
  // Positive indicators
  const positiveKeywords = [
    'interested', 'yes', 'sounds good', 'perfect', 'great', 'excellent',
    'love', 'amazing', 'awesome', 'fantastic', 'wonderful', 'please',
    'would like', 'want to', 'schedule', 'meeting', 'call', 'discuss',
    'when can', 'available', 'book', 'appointment', 'demo'
  ];
  
  // Negative indicators
  const negativeKeywords = [
    'not interested', 'no thanks', 'remove', 'unsubscribe', 'stop',
    'spam', 'scam', 'fake', 'terrible', 'awful', 'hate', 'angry',
    'frustrated', 'disappointed', 'waste', 'useless', 'never'
  ];
  
  // Interest indicators
  const interestedKeywords = [
    'more information', 'tell me more', 'pricing', 'cost', 'price',
    'how much', 'budget', 'quote', 'proposal', 'details', 'learn more',
    'features', 'benefits', 'trial', 'free', 'demo'
  ];
  
  // Not interested indicators
  const notInterestedKeywords = [
    'not interested', 'no thanks', 'already have', 'not right now',
    'maybe later', 'not a fit', 'wrong timing', 'too expensive',
    'budget constraints', 'not in budget'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  let interestedScore = 0;
  let notInterestedScore = 0;
  
  // Count keyword matches
  positiveKeywords.forEach(keyword => {
    if (text.includes(keyword)) positiveScore++;
  });
  
  negativeKeywords.forEach(keyword => {
    if (text.includes(keyword)) negativeScore++;
  });
  
  interestedKeywords.forEach(keyword => {
    if (text.includes(keyword)) interestedScore++;
  });
  
  notInterestedKeywords.forEach(keyword => {
    if (text.includes(keyword)) notInterestedScore++;
  });
  
  // Determine sentiment based on scores
  if (interestedScore > 0 && positiveScore > negativeScore) {
    return 'interested';
  } else if (notInterestedScore > 0 || negativeScore > positiveScore) {
    return 'not_interested';
  } else if (positiveScore > negativeScore) {
    return 'positive';
  } else if (negativeScore > positiveScore) {
    return 'negative';
  } else {
    return 'neutral';
  }
} 