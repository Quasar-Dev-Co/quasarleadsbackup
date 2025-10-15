import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

/**
 * DEBUG: Test IMAP connection and email fetching for a specific user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('🔍 DEBUG: Testing IMAP connection...');
  await dbConnect();

  try {
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
        error: 'No users found with IMAP credentials',
        users: []
      });
    }

    console.log(`🔍 Found ${users.length} users with IMAP credentials`);
    
    const debugResults = [];

    for (const user of users) {
      const userEmail = (user as any).email;
      const userId = (user as any)._id.toString();
      const creds = (user as any).credentials || {};

      console.log(`\n🔍 Testing IMAP for user: ${userEmail}`);
      console.log(`   IMAP_HOST: ${creds.IMAP_HOST}`);
      console.log(`   IMAP_PORT: ${creds.IMAP_PORT}`);
      console.log(`   IMAP_USER: ${creds.IMAP_USER}`);
      console.log(`   IMAP_PASSWORD: ${creds.IMAP_PASSWORD ? '***SET***' : '***MISSING***'}`);

      try {
        const imapConfig = {
          host: String(creds.IMAP_HOST),
          port: parseInt(String(creds.IMAP_PORT), 10) || 993,
          secure: true,
          auth: {
            user: String(creds.IMAP_USER),
            pass: String(creds.IMAP_PASSWORD)
          },
          logger: false as const,
          keepAlive: false,
          connectionTimeout: 10000
        };

        console.log(`🔗 Attempting connection to ${imapConfig.host}:${imapConfig.port}`);
        
        const client = new ImapFlow(imapConfig);
        await client.connect();
        console.log(`✅ Connected successfully to ${imapConfig.host}`);

        // Get mailbox info
        const lock = await client.getMailboxLock('INBOX');
        let emailCount = 0;
        let recentEmails = [];

        try {
          console.log(`📥 Scanning INBOX...`);
          
          // Search for REPLY emails in the last 30 minutes (same as cron job)
          const now = new Date();
          const thirtyMinutesAgo = new Date();
          thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
          
          console.log(`📅 Searching for FRESH REPLIES from ${thirtyMinutesAgo.toISOString()} to ${now.toISOString()}`);
          
          const searchQuery = {
            since: thirtyMinutesAgo
          };
          
          const messageUids = await client.search(searchQuery, { uid: true });
          emailCount = messageUids.length;
          
          console.log(`📧 Found ${emailCount} emails in date range`);
          
          // Sample first 3 emails for debugging
          const sampleUids = messageUids.slice(0, 3);
          
          for (const uid of sampleUids) {
            try {
              const download = await client.download(String(uid), 'full');
              const parsed = await simpleParser(download.content);
              
              const fromEmail = (() => {
                const from = parsed.from;
                if (!from) return 'unknown';
                if (Array.isArray(from)) {
                  return (from[0] as any)?.address || 'unknown';
                }
                return (from as any).address || from.text || 'unknown';
              })();
              
              const isReply = !!(
                parsed.subject?.toLowerCase().startsWith('re:') ||
                parsed.inReplyTo ||
                parsed.references
              );
              
              recentEmails.push({
                uid: uid,
                from: fromEmail,
                subject: parsed.subject || 'No Subject',
                date: parsed.date,
                isReply: isReply,
                hasInReplyTo: !!parsed.inReplyTo,
                hasReferences: !!parsed.references
              });
              
              console.log(`   📧 UID ${uid}: ${fromEmail} - "${parsed.subject}" (Reply: ${isReply})`);
              
            } catch (emailError: any) {
              console.error(`   ❌ Error processing email UID ${uid}:`, emailError.message);
            }
          }
          
        } finally {
          lock.release();
        }

        await client.logout();
        console.log(`✅ Disconnected from ${imapConfig.host}`);

        debugResults.push({
          userId: userId,
          email: userEmail,
          success: true,
          host: imapConfig.host,
          port: imapConfig.port,
          totalEmails: emailCount,
          sampleEmails: recentEmails,
          message: `Successfully connected and found ${emailCount} emails`
        });

      } catch (error: any) {
        console.error(`❌ IMAP Error for ${userEmail}:`, error.message);
        debugResults.push({
          userId: userId,
          email: userEmail,
          success: false,
          error: error.message,
          credentials: {
            host: creds.IMAP_HOST,
            port: creds.IMAP_PORT,
            user: creds.IMAP_USER,
            passwordSet: !!creds.IMAP_PASSWORD
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'IMAP debug completed',
      totalUsers: users.length,
      results: debugResults
    });

  } catch (error: any) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Manual trigger
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request);
}
