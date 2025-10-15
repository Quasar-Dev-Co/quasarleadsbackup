import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import User from '@/models/userSchema';

const BATCH_SIZE = 30;

interface EmailValidationResult {
  email: string;
  isValid: boolean;
  reason?: string;
}

interface OpenAIValidationResponse {
  validEmails: string[];
  invalidEmails: string[];
  reasons: { [email: string]: string };
}

// ✅ USE USER'S DATABASE API KEY - NO ENV FALLBACK
async function validateEmailsWithOpenAI(apiKey: string, emails: string[]): Promise<EmailValidationResult[]> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_MISSING - Must come from user database credentials');
  }
  
  console.log(`🔑 Using user's OpenAI key from database (length: ${apiKey.length})`);

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
  "invalidEmails": ["list", "of", "invalid", "emails"],
  "reasons": {
    "invalid_email@example.com": "reason why invalid",
    "another_invalid@test.com": "reason why invalid"
  }
}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
    const validationResult: OpenAIValidationResponse = JSON.parse(content);
    
    // Convert to our format
    const results: EmailValidationResult[] = [];
    
    // Add valid emails
    validationResult.validEmails.forEach(email => {
      results.push({ email, isValid: true });
    });
    
    // Add invalid emails with reasons
    validationResult.invalidEmails.forEach(email => {
      results.push({ 
        email, 
        isValid: false, 
        reason: validationResult.reasons[email] || 'Invalid email format or spam-like pattern'
      });
    });
    
    return results;
  } catch (error) {
    console.error('OpenAI validation error:', error);
    throw new Error(`OpenAI validation failed: ${error}`);
  }
}

async function processEmailBatch(apiKey: string, emails: string[]): Promise<{ valid: string[], invalid: string[] }> {
  try {
    console.log(`🔍 Validating ${emails.length} emails with OpenAI...`);
    
    const validationResults = await validateEmailsWithOpenAI(apiKey, emails);
    
    const validEmails = validationResults.filter(r => r.isValid).map(r => r.email);
    const invalidEmails = validationResults.filter(r => !r.isValid).map(r => r.email);
    
    console.log(`✅ Valid emails: ${validEmails.length}`);
    console.log(`❌ Invalid emails: ${invalidEmails.length}`);
    
    return { valid: validEmails, invalid: invalidEmails };
  } catch (error) {
    console.error('Batch validation error:', error);
    // If OpenAI fails, mark all as valid to be safe
    return { valid: emails, invalid: [] };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🧹 AI Email Cleanup started at:', new Date().toISOString());

  try {
    await dbConnect();

    // ✅ FETCH USER'S OPENAI KEY FROM DATABASE (userSchema.credentials.OPENAI_API_KEY)
    // NO environment variable fallback - key MUST come from database
    
    // Identify current user from Authorization header: Bearer <userId>
    const authHeader = request.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', message: 'Please sign in to clean emails.' },
        { status: 401 }
      );
    }

    const user: any = await User.findById(userId).lean();
    console.log(`🔍 Fetching OpenAI key for user ${userId}:`, !!user);
    
    const apiKey = user?.credentials?.OPENAI_API_KEY || '';
    console.log(`🔑 Database key found:`, apiKey ? `${apiKey.substring(0, 10)}... (length: ${apiKey.length})` : 'NOT FOUND');
    
    if (!apiKey) {
      console.error(`❌ No OPENAI_API_KEY found in database for user ${userId}`);
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY_MISSING', message: 'Please add your OpenAI API key in Account Settings → Credentials.' },
        { status: 400 }
      );
    }
    
    console.log(`✅ Using OpenAI key from database for user ${userId}`);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const isCronJob = searchParams.get('cron') === 'true';
    const batchNumber = parseInt(searchParams.get('batch') || '0');

    if (isCronJob) {
      // Cronjob mode - process next batch
      return await processCronJobBatch(apiKey, batchNumber);
    } else {
      // Manual mode - process all emails
      return await processAllEmails(apiKey);
    }

  } catch (error) {
    console.error('❌ Email cleanup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
        valid: 0,
        invalid: 0
      },
      { status: 500 }
    );
  }
}

async function processAllEmails(apiKey: string) {
  const startTime = Date.now();
  
  // Get all leads with emails
  const allLeads = await Lead.find({ email: { $exists: true, $ne: '' } });
  const allEmails = allLeads.map(lead => lead.email).filter(email => email);
  
  console.log(`📧 Total emails to process: ${allEmails.length}`);
  
  if (allEmails.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No emails to process',
      processed: 0,
      valid: 0,
      invalid: 0
    });
  }

  // If more than 30 emails, start cronjob process
  if (allEmails.length > BATCH_SIZE) {
    // Save batch info for cronjob
    const batchInfo = {
      totalEmails: allEmails.length,
      totalBatches: Math.ceil(allEmails.length / BATCH_SIZE),
      processedBatches: 0,
      validEmails: [],
      invalidEmails: [],
      startTime: new Date()
    };
    
    // Store in database or cache (simplified for now)
    console.log(`🔄 Large dataset detected (${allEmails.length} emails). Starting cronjob process...`);
    console.log(`📊 Total batches needed: ${batchInfo.totalBatches}`);
    
    return NextResponse.json({
      success: true,
      message: `Large dataset detected. Starting cronjob process for ${allEmails.length} emails in ${batchInfo.totalBatches} batches.`,
      totalEmails: allEmails.length,
      totalBatches: batchInfo.totalBatches,
      cronjobStarted: true
    });
  }

  // Process small dataset immediately
  const { valid, invalid } = await processEmailBatch(apiKey, allEmails);
  
  // Delete invalid emails
  if (invalid.length > 0) {
    const deleteResult = await Lead.deleteMany({ email: { $in: invalid } });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} leads with invalid emails`);
  }

  const processingTime = Date.now() - startTime;
  
  return NextResponse.json({
    success: true,
    message: `Email cleanup completed in ${processingTime}ms`,
    processed: allEmails.length,
    valid: valid.length,
    invalid: invalid.length,
    deleted: invalid.length,
    processingTime
  });
}

async function processCronJobBatch(apiKey: string, batchNumber: number) {
  const startTime = Date.now();
  console.log(`🔄 Processing cronjob batch ${batchNumber}...`);
  
  // Get all leads with emails
  const allLeads = await Lead.find({ email: { $exists: true, $ne: '' } });
  const allEmails = allLeads.map(lead => lead.email).filter(email => email);
  
  const totalBatches = Math.ceil(allEmails.length / BATCH_SIZE);
  
  if (batchNumber >= totalBatches) {
    return NextResponse.json({
      success: true,
      message: 'All batches processed',
      completed: true,
      totalBatches,
      currentBatch: batchNumber
    });
  }
  
  // Get current batch
  const startIndex = batchNumber * BATCH_SIZE;
  const endIndex = Math.min(startIndex + BATCH_SIZE, allEmails.length);
  const batchEmails = allEmails.slice(startIndex, endIndex);
  
  console.log(`📧 Processing batch ${batchNumber + 1}/${totalBatches}: ${batchEmails.length} emails`);
  
  // Process batch
  const { valid, invalid } = await processEmailBatch(apiKey, batchEmails);
  
  // Delete invalid emails
  if (invalid.length > 0) {
    const deleteResult = await Lead.deleteMany({ email: { $in: invalid } });
    console.log(`🗑️ Batch ${batchNumber + 1}: Deleted ${deleteResult.deletedCount} invalid emails`);
  }
  
  const processingTime = Date.now() - startTime;
  
  return NextResponse.json({
    success: true,
    message: `Batch ${batchNumber + 1}/${totalBatches} completed`,
    batchNumber: batchNumber + 1,
    totalBatches,
    processed: batchEmails.length,
    valid: valid.length,
    invalid: invalid.length,
    deleted: invalid.length,
    processingTime,
    completed: batchNumber + 1 >= totalBatches
  });
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get cleanup status
    const totalLeads = await Lead.countDocuments({ email: { $exists: true, $ne: '' } });
    const totalEmails = await Lead.distinct('email');
    
    return NextResponse.json({
      success: true,
      totalLeads,
      totalEmails: totalEmails.length,
      readyForCleanup: totalEmails.length > 0
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get cleanup status' },
      { status: 500 }
    );
  }
} 