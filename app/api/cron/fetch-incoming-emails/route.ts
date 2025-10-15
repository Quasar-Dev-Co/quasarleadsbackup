import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { IncomingEmail } from '@/models/emailResponseSchema';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import User from '@/models/userSchema';
import mongoose from 'mongoose';

/**
 * Vercel Cron Job: Fetches incoming emails via IMAP for ALL users with IMAP credentials.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('📬 Multi-User Cron Job: Starting incoming email fetch for all users...');
  await dbConnect();

  // Get all users with IMAP credentials
  const users = await User.find({
    'credentials.IMAP_HOST': { $exists: true, $ne: '' },
    'credentials.IMAP_PORT': { $exists: true, $ne: '' },
    'credentials.IMAP_USER': { $exists: true, $ne: '' },
    'credentials.IMAP_PASSWORD': { $exists: true, $ne: '' }
  }).lean();

  if (users.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No users found with complete IMAP credentials',
      usersProcessed: 0
    });
  }

  console.log(`📧 Found ${users.length} users with IMAP credentials`);
  
  let totalProcessed = 0;
  let totalNewEmails = 0;
  const userResults: any[] = [];

  // Process each user separately
  for (const user of users) {
    console.log(`\n🔄 Processing emails for user: ${(user as any).email} (${(user as any)._id})`);
    
    const result = await processUserEmails(user as any);
    userResults.push(result);
    totalProcessed += result.processed;
    totalNewEmails += result.newEmails;
  }

  return NextResponse.json({
    success: true,
    message: `Multi-user email fetch completed`,
    summary: {
      usersProcessed: users.length,
      totalEmailsProcessed: totalProcessed,
      totalNewEmails: totalNewEmails
    },
    userResults: userResults
  });
}

/**
 * Process emails for a single user
 */
async function processUserEmails(user: any): Promise<{ userId: string; email: string; processed: number; newEmails: number; error?: string }> {
  const userId = user._id.toString();
  const userEmail = user.email;
  
  try {
    const creds = user.credentials || {};

    const imapConfig = {
      host: String(creds.IMAP_HOST),
      port: parseInt(String(creds.IMAP_PORT), 10) || 993,
      secure: true,
      auth: {
        user: String(creds.IMAP_USER),
        pass: String(creds.IMAP_PASSWORD)
      },
      logger: false as const,
      keepAlive: true
    };

    const label = `${imapConfig.host}:${imapConfig.port}`;
    let client: ImapFlow | null = null;
    let processedCount = 0;
    let newEmailsCount = 0;

    console.log(`🔗 Connecting to ${label} for user: ${userEmail}...`);
    console.log(`   Host: ${imapConfig.host}:${imapConfig.port}`);
    console.log(`   User: ${imapConfig.auth.user}`);
    
    client = new ImapFlow(imapConfig);
    
    try {
      await client.connect();
      console.log(`✅ Successfully connected to ${label} for user: ${userEmail}`);
    } catch (connectError: any) {
      console.error(`❌ Connection failed for ${userEmail}:`, connectError.message);
      throw new Error(`IMAP connection failed: ${connectError.message}`);
    }
    
    // Open INBOX with read-write access
    let lock;
    try {
      lock = await client.getMailboxLock('INBOX');
      console.log(`📫 Successfully opened INBOX for ${userEmail}`);
    } catch (lockError: any) {
      console.error(`❌ Failed to open INBOX for ${userEmail}:`, lockError.message);
      throw new Error(`Failed to open INBOX: ${lockError.message}`);
    }
    
    try {
      console.log(`📥 Scanning INBOX for user: ${userEmail}...`);
      
      // Calculate date range - last 10 minutes only for FRESH REPLIES
      const now = new Date();
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
      console.log(`📅 Time window: ${tenMinutesAgo.toISOString()} → ${now.toISOString()}`);

      // Most reliable approach across IMAP servers: fetch last N messages and filter locally
      const totalMessages = typeof client.mailbox === 'object' && client.mailbox && 'exists' in client.mailbox 
        ? Number((client.mailbox as any).exists || 0) 
        : 0;
      const lastN = 200; // fetch small recent window
      const startSeq = Math.max(1, totalMessages - lastN + 1);
      const seqRange = `${startSeq}:*`;
      console.log(`🔍 Fetching UID range ${seqRange} (mailbox has ${totalMessages} messages)`);

      for await (const msg of client.fetch(seqRange, { uid: true, source: true, envelope: true, flags: true })) {
        processedCount++;

        // Parse full raw source
        const parsed = await simpleParser((msg as any).source);

        // Extract from email with better handling (prefer envelope)
        const fromEmail = (() => {
          const envFrom = (msg as any)?.envelope?.from?.[0];
          if (envFrom?.address) return envFrom.address as string;
          const from = parsed.from as any;
          if (!from) return 'unknown';
          if (Array.isArray(from)) {
            return (from[0] as any)?.address || 'unknown';
          }
          return (from as any).address || from.text || 'unknown';
        })();
        
        console.log(`📧 Processing email UID ${(msg as any).uid}: ${fromEmail} - "${parsed.subject}"`);
        
        // Skip if from email is our own sending domain (avoid processing our own sent emails)
        const ownDomains = ['quasarseo.nl', 'testqlagain.vercel.app'];
        const fromDomain = fromEmail.split('@')[1]?.toLowerCase();
        if (fromDomain && ownDomains.includes(fromDomain)) {
          console.log(`⏭️ Skipping our own email from: ${fromEmail}`);
          continue;
        }
        
        // Check if this is a reply (strict check for ACTUAL replies)
        const hasRefs = Boolean(parsed.inReplyTo || parsed.references);
        const subjRe = (parsed.subject || '').toLowerCase().startsWith('re:');
        const isReply = hasRefs || subjRe;
        
        // Only process REPLIES - skip new emails that aren't replies
        if (!isReply) {
          console.log(`⏭️ Skipping NON-REPLY email: "${parsed.subject}"`);
          continue;
        }
        
        // Check if it's fresh (within last 10 minutes)
        const rawDate: any = (msg as any)?.envelope?.date || parsed.date;
        if (!rawDate) {
          console.log(`⏭️ Skipping email with no date: "${parsed.subject}"`);
          continue;
        }
        const emailDate = new Date(rawDate);
        const isRecent = emailDate >= tenMinutesAgo && emailDate <= now;

        console.log(`📧 REPLY EMAIL FOUND: "${parsed.subject}" - Date: ${emailDate.toISOString()} - Recent: ${isRecent}`);
        
        // Skip emails outside the 10-minute window
        if (!isRecent) {
          console.log(`⏭️ Skipping OLD email: "${parsed.subject}" (${emailDate.toISOString()})`);
          continue;
        }
        
        // Check if email already exists
        const existingEmail = await IncomingEmail.findOne({ 
          'metadata.messageId': parsed.messageId 
        }).lean();
        
        if (existingEmail) {
          console.log(`⏭️ Email already processed: ${parsed.subject}`);
          continue;
        }

        const actualFromEmail = fromEmail;

        // Validate required fields before preparing payload
        if (!actualFromEmail || actualFromEmail === 'unknown') {
          continue;
        }

        const emailSubject = parsed.subject || 'No Subject';
        const emailContent = parsed.text || parsed.html || '';
        
        if (!emailContent.trim()) {
          continue;
        }

        // Generate a thread ID for email grouping
        const threadId = parsed.inReplyTo || parsed.messageId || `thread-${Date.now()}-${Math.random()}`;
        
        // Extract to address with proper handling (prefer envelope)
        const toAddress = (() => {
          const envTo = (msg as any)?.envelope?.to?.[0];
          if (envTo?.address) return envTo.address as string;
          const to = parsed.to as any;
          if (!to) return '';
          if (Array.isArray(to)) {
            return (to[0] as any)?.address || '';
          }
          return (to as any).address || to.text || '';
        })();

        // Prepare email payload (only include fields expected by the API)
        const emailPayload = {
          userId: userId, // Pass the user's specific ID
          leadEmail: actualFromEmail,
          subject: emailSubject,
          content: emailContent,
          htmlContent: parsed.html || '',
          fromAddress: actualFromEmail,
          toAddress: toAddress,
          messageId: parsed.messageId || '',
          inReplyTo: parsed.inReplyTo || '',
          references: parsed.references || '',
          isReply: isReply,
          isRecent: isRecent,
          threadId: threadId
        };

        // Save incoming email via API
        const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email-responses/incoming`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload)
        });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            newEmailsCount++;
            console.log(`✅ Email saved for ${userEmail}: ${emailSubject} from ${actualFromEmail}`);
          } else {
            console.error(`❌ Failed to save email: ${saveResult.error}`);
          }
        } else {
          const errorText = await saveResponse.text();
          console.error(`❌ API error saving email: ${saveResponse.status} - ${errorText}`);
        }
      }
      
    } finally {
      if (lock) {
        lock.release();
        console.log(`🔓 Released INBOX lock for ${userEmail}`);
      }
    }

    if (client && client.usable) {
      await client.logout();
      console.log(`🔌 Disconnected from ${label} for user: ${userEmail}`);
    }
    
    return {
      userId: userId,
      email: userEmail,
      processed: processedCount,
      newEmails: newEmailsCount
    };
    
  } catch (err: any) {
    console.error(`❌ Failed to fetch emails for user ${userEmail}:`, err.message);
    
    return {
      userId: userId,
      email: userEmail,
      processed: 0,
      newEmails: 0,
      error: err.message
    };
  }
}

// POST - Manual trigger for testing
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔧 Manual trigger: Fetching incoming emails...');
  return GET(request);
}