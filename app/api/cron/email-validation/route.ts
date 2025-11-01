import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Lead } from '@/models/leadSchema';

// Simple email validation function
async function validateEmail(email: string): Promise<{
  isValid: boolean;
  isDeliverable: boolean;
  isFreeEmail: boolean;
  isDisposable: boolean;
  syntax: boolean;
  reason?: string;
}> {
  try {
    // Basic syntax check
    const syntaxRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const syntax = syntaxRegex.test(email);

    if (!syntax) {
      return {
        isValid: false,
        isDeliverable: false,
        isFreeEmail: false,
        isDisposable: false,
        syntax: false,
        reason: 'Invalid email syntax'
      };
    }

    const [localPart, domain] = email.split('@');

    // Check for disposable email providers
    const disposableDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'yopmail.com', 'throwaway.email', 'maildrop.cc', 'temp-mail.org'
    ];
    const isDisposable = disposableDomains.some(d => domain.toLowerCase().includes(d));

    // Check for free email providers
    const freeEmailProviders = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
      'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com'
    ];
    const isFreeEmail = freeEmailProviders.some(d => domain.toLowerCase() === d);

    // Check for obvious invalid patterns
    const invalidPatterns = [
      /noreply/i,
      /no-reply/i,
      /donotreply/i,
      /test@/i,
      /example@/i,
      /@example\./i,
      /admin@localhost/i
    ];
    const hasInvalidPattern = invalidPatterns.some(pattern => pattern.test(email));

    if (hasInvalidPattern) {
      return {
        isValid: false,
        isDeliverable: false,
        isFreeEmail,
        isDisposable,
        syntax: true,
        reason: 'Email contains invalid pattern (noreply, test, example)'
      };
    }

    if (isDisposable) {
      return {
        isValid: false,
        isDeliverable: false,
        isFreeEmail,
        isDisposable: true,
        syntax: true,
        reason: 'Disposable email address'
      };
    }

    // If it passes all checks, consider it valid
    return {
      isValid: true,
      isDeliverable: true,
      isFreeEmail,
      isDisposable: false,
      syntax: true
    };

  } catch (error: any) {
    console.error(`Error validating email ${email}:`, error);
    return {
      isValid: false,
      isDeliverable: false,
      isFreeEmail: false,
      isDisposable: false,
      syntax: false,
      reason: 'Validation error: ' + error.message
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔍 Email validation cron job started at:', new Date().toISOString());

  try {
    await dbConnect();

    const BATCH_SIZE = 20; // CRITICAL: Exactly 20 leads per batch

    // Find leads that need validation - NEVER validate the same email twice
    const leadsToValidate = await Lead.find({
      emailValidationStatus: 'notScanned',
      status: 'active', // ONLY NEW LEADS
      emailValidationCheckedAt: { $exists: false } // CRITICAL: Never been validated before
    })
    .sort({ createdAt: 1 }) // Oldest first
    .limit(BATCH_SIZE);

    const remainingLeads = await Lead.countDocuments({
      emailValidationStatus: 'notScanned',
      status: 'active',
      emailValidationCheckedAt: { $exists: false }
    });

    console.log(`📋 Processing batch of ${leadsToValidate.length} leads (${remainingLeads - leadsToValidate.length} remaining)`);

    if (leadsToValidate.length === 0) {
      console.log('✅ All new leads have been validated!');
      return NextResponse.json({
        success: true,
        message: 'No new leads to validate - all done!',
        processed: 0,
        remaining: 0
      });
    }

    let validCount = 0;
    let invalidCount = 0;
    let processedCount = 0;

    // Process each lead
    for (const lead of leadsToValidate) {
      try {
        processedCount++;
        console.log(`🔍 Validating ${processedCount}/${leadsToValidate.length}: ${lead.email}`);

        // Mark as checking
        await Lead.findByIdAndUpdate(lead._id, {
          emailValidationStatus: 'checking'
        });

        // Validate the email
        const validation = await validateEmail(lead.email);

        // Update lead with validation results
        const updateData = {
          emailValidationStatus: validation.isValid ? 'valid' : 'invalid',
          emailValidationCheckedAt: new Date(),
          emailValidationDetails: {
            isDeliverable: validation.isDeliverable,
            isFreeEmail: validation.isFreeEmail,
            isDisposable: validation.isDisposable,
            syntax: validation.syntax,
            smtpValid: validation.isDeliverable,
            reason: validation.reason || ''
          }
        };

        await Lead.findByIdAndUpdate(lead._id, updateData);

        if (validation.isValid) {
          validCount++;
          console.log(`✅ Valid: ${lead.email}`);
        } else {
          invalidCount++;
          console.log(`❌ Invalid: ${lead.email} - ${validation.reason}`);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`💥 Error processing lead ${lead.email}:`, error);
        // Mark as notScanned so it can be retried
        await Lead.findByIdAndUpdate(lead._id, {
          emailValidationStatus: 'notScanned'
        });
      }
    }

    const duration = Date.now() - startTime;
    
    // Count remaining leads after this batch
    const remainingAfterBatch = await Lead.countDocuments({
      emailValidationStatus: 'notScanned',
      status: 'active',
      emailValidationCheckedAt: { $exists: false }
    });
    
    const summary = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      batchSize: processedCount,
      valid: validCount,
      invalid: invalidCount,
      remaining: remainingAfterBatch,
      nextBatchSize: Math.min(remainingAfterBatch, 20)
    };

    console.log('\n✅ Email validation cron job completed:');
    console.log(`   📊 Batch processed: ${processedCount} leads`);
    console.log(`   ✅ Valid: ${validCount}`);
    console.log(`   ❌ Invalid: ${invalidCount}`);
    console.log(`   ⏳ Remaining: ${remainingAfterBatch} leads`);
    console.log(`   📦 Next batch: ${summary.nextBatchSize} leads`);

    return NextResponse.json({
      success: true,
      message: `Batch validated: ${processedCount} emails (${validCount} valid, ${invalidCount} invalid). ${remainingAfterBatch} remaining.`,
      results: summary
    });

  } catch (error: any) {
    console.error('💥 Email validation cron job error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Email validation failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
