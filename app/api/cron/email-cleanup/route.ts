import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import User from '@/models/userSchema';

const BATCH_SIZE = 30;

interface CleanupJob {
  id: string;
  totalEmails: number;
  totalBatches: number;
  processedBatches: number;
  validEmails: string[];
  invalidEmails: string[];
  startTime: Date;
  status: 'running' | 'completed' | 'failed';
}

// In-memory job storage (in production, use database)
let activeCleanupJob: CleanupJob | null = null;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🧹 Email Cleanup Cronjob started at:', new Date().toISOString());

  try {
    await dbConnect();

    // ✅ GET USERID FROM QUERY PARAMS - Each user's cron processes their own leads
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      console.log('⚠️ No userId provided - skipping email cleanup');
      return NextResponse.json({
        success: false,
        error: 'userId is required for email cleanup',
        message: 'Email cleanup requires userId to fetch user OpenAI key'
      }, { status: 400 });
    }

    // ✅ FETCH USER'S OPENAI KEY FROM DATABASE
    const user = await User.findById(userId).lean();
    const userApiKey = (user as any)?.credentials?.OPENAI_API_KEY;
    
    if (!userApiKey) {
      console.log(`❌ No OPENAI_API_KEY found for user ${userId}`);
      return NextResponse.json({
        success: false,
        error: 'Missing OPENAI_API_KEY in user credentials',
        message: 'Please add your OpenAI API key in account settings'
      }, { status: 400 });
    }
    
    console.log(`✅ Using OpenAI key from database for user ${userId}`);

    // Check if there's an active cleanup job
    if (!activeCleanupJob) {
      console.log('📋 No active cleanup job found. Checking for pending cleanup...');
      
      // Check if there are emails that need cleanup FOR THIS USER
      const totalEmails = await Lead.countDocuments({ 
        email: { $exists: true, $ne: '' },
        assignedTo: userId
      });
      
      if (totalEmails === 0) {
        return NextResponse.json({
          success: true,
          message: 'No emails to cleanup for this user',
          processed: 0
        });
      }

      // Start new cleanup job
      if (totalEmails > BATCH_SIZE) {
        activeCleanupJob = {
          id: `cleanup_${Date.now()}`,
          totalEmails,
          totalBatches: Math.ceil(totalEmails / BATCH_SIZE),
          processedBatches: 0,
          validEmails: [],
          invalidEmails: [],
          startTime: new Date(),
          status: 'running'
        };

        console.log(`🔄 Started new cleanup job: ${totalEmails} emails in ${activeCleanupJob.totalBatches} batches`);
        console.log(`⏰ Cronjob will process every minute (1 minute intervals)`);
      }
    }

    // Process current batch
    if (activeCleanupJob && activeCleanupJob.status === 'running') {
      const result = await processNextBatch(activeCleanupJob, userApiKey, userId);
      
      if (result.completed) {
        activeCleanupJob.status = 'completed';
        console.log(`✅ Cleanup job completed: ${activeCleanupJob.invalidEmails.length} invalid emails removed`);
      }
      
      const processingTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        jobId: activeCleanupJob.id,
        batchNumber: activeCleanupJob.processedBatches,
        totalBatches: activeCleanupJob.totalBatches,
        totalEmails: activeCleanupJob.totalEmails,
        validEmails: activeCleanupJob.validEmails.length,
        invalidEmails: activeCleanupJob.invalidEmails.length,
        completed: result.completed,
        processingTime
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No active cleanup job',
      processed: 0
    });

  } catch (error) {
    console.error('❌ Email cleanup cronjob error:', error);
    
    if (activeCleanupJob) {
      activeCleanupJob.status = 'failed';
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0
      },
      { status: 500 }
    );
  }
}

async function processNextBatch(job: CleanupJob, userApiKey: string, userId: string) {
  console.log(`🔄 Processing batch ${job.processedBatches + 1}/${job.totalBatches}...`);
  
  // Get all leads with emails FOR THIS USER
  const allLeads = await Lead.find({ 
    email: { $exists: true, $ne: '' },
    assignedTo: userId
  });
  const allEmails = allLeads.map(lead => lead.email).filter(email => email);
  
  // Get current batch
  const startIndex = job.processedBatches * BATCH_SIZE;
  const endIndex = Math.min(startIndex + BATCH_SIZE, allEmails.length);
  const batchEmails = allEmails.slice(startIndex, endIndex);
  
  console.log(`📧 Batch ${job.processedBatches + 1}: Processing ${batchEmails.length} emails`);
  
  // Process batch with OpenAI validation using USER'S API KEY
  const { valid, invalid } = await validateEmailsWithOpenAI(batchEmails, userApiKey);
  
  // Update job progress
  job.validEmails.push(...valid);
  job.invalidEmails.push(...invalid);
  job.processedBatches++;
  
  // Delete invalid emails FOR THIS USER
  if (invalid.length > 0) {
    const deleteResult = await Lead.deleteMany({ 
      email: { $in: invalid },
      assignedTo: userId
    });
    console.log(`🗑️ Batch ${job.processedBatches}: Deleted ${deleteResult.deletedCount} invalid emails`);
  }
  
  const completed = job.processedBatches >= job.totalBatches;
  
  if (completed) {
    console.log(`✅ Cleanup job completed:`);
    console.log(`   📧 Total emails processed: ${job.totalEmails}`);
    console.log(`   ✅ Valid emails: ${job.validEmails.length}`);
    console.log(`   ❌ Invalid emails removed: ${job.invalidEmails.length}`);
  }
  
  return { completed };
}

async function validateEmailsWithOpenAI(emails: string[], userApiKey: string): Promise<{ valid: string[], invalid: string[] }> {
  // ✅ USE USER'S DATABASE API KEY - NO ENV FALLBACK
  if (!userApiKey) {
    console.error('❌ No OpenAI API key provided from user database');
    return { valid: emails, invalid: [] }; // Safe fallback
  }
  
  console.log(`🔑 Using user's OpenAI key from database (length: ${userApiKey.length})`);

  const prompt = `
You are an email validation expert. Analyze the following emails and determine if they are valid business emails or invalid/spam emails.

VALID EMAIL CRITERIA:
- Real business email addresses (e.g., john@company.com, sales@business.com)
- Proper email format with @ and domain
- Professional looking domains
- No obvious spam indicators

INVALID EMAIL CRITERIA:
- Obviously fake emails (e.g., test@test.com, your@email.com)
- File extensions as emails (e.g., file.jpg, document.pdf)
- Generic placeholder emails (e.g., email@example.com, user@domain.com)
- Spam-like patterns
- Invalid email format

Emails to validate:
${emails.map((email, index) => `${index + 1}. ${email}`).join('\n')}

Respond with ONLY a JSON object in this exact format:
{
  "validEmails": ["list", "of", "valid", "emails"],
  "invalidEmails": ["list", "of", "invalid", "emails"]
}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    const validationResult = JSON.parse(content);
    
    console.log(`✅ OpenAI validation completed: ${validationResult.validEmails?.length || 0} valid, ${validationResult.invalidEmails?.length || 0} invalid`);
    
    return {
      valid: validationResult.validEmails || [],
      invalid: validationResult.invalidEmails || []
    };
  } catch (error) {
    console.error('❌ OpenAI validation error:', error);
    // Safe fallback - keep all emails as valid
    return { valid: emails, invalid: [] };
  }
} 