import { NextRequest, NextResponse } from 'next/server';

/**
 * Complete Email Workflow Cron Job
 * 
 * This cron job orchestrates the complete email response workflow:
 * 1. Fetch new incoming emails
 * 2. Process unread emails and generate responses
 * 3. Send responses automatically
 * 
 * This ensures emails are handled in the correct order and timing.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('🔄 Email Workflow: Starting complete email processing workflow...');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || undefined;
  const authHeader = request.headers.get('authorization') || '';
  const bearerUserId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
  const finalUserId = userId || bearerUserId || '';
  const results = {
    fetchEmails: { success: false, message: '', stats: null as any },
    processResponses: { success: false, message: '', stats: null as any },
    totalProcessed: 0,
    totalSent: 0,
    errors: [] as string[]
  };
  
  try {
    // Step 1: Fetch new incoming emails
    console.log('📬 Step 1: Fetching new incoming emails...');
    const fetchResponse = await fetch(`${baseUrl}/api/cron/fetch-incoming-emails${finalUserId ? `?userId=${finalUserId}` : ''}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(finalUserId ? { Authorization: `Bearer ${finalUserId}` } : {}) }
    });
    
    if (fetchResponse.ok) {
      const fetchData = await fetchResponse.json();
      results.fetchEmails = fetchData;
      console.log(`✅ Email fetching completed: ${fetchData.stats?.newEmails || 0} new emails`);
    } else {
      const errorText = await fetchResponse.text();
      results.errors.push(`Email fetching failed: ${errorText}`);
      console.error('❌ Email fetching failed:', errorText);
    }
    
    // Step 2: Process unread emails and generate responses
    console.log('\n🤖 Step 2: Processing unread emails and generating responses...');
    const processResponse = await fetch(`${baseUrl}/api/cron/process-email-responses${finalUserId ? `?userId=${finalUserId}` : ''}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(finalUserId ? { Authorization: `Bearer ${finalUserId}` } : {}) }
    });
    
    if (processResponse.ok) {
      const processData = await processResponse.json();
      results.processResponses = processData;
      results.totalProcessed = processData.stats?.processed || 0;
      results.totalSent = processData.stats?.success || 0;
      console.log(`✅ Email processing completed: ${results.totalProcessed} processed, ${results.totalSent} sent`);
    } else {
      const errorText = await processResponse.text();
      results.errors.push(`Email processing failed: ${errorText}`);
      console.error('❌ Email processing failed:', errorText);
    }
    
    // Step 3: Summary and health check
    console.log('\n📊 Email Workflow Summary:');
    console.log(`   📬 New emails fetched: ${results.fetchEmails.stats?.newEmails || 0}`);
    console.log(`   🔄 Emails processed: ${results.totalProcessed}`);
    console.log(`   📤 Responses sent: ${results.totalSent}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    const isHealthy = results.errors.length === 0;
    const message = isHealthy ? 
      'Email workflow completed successfully' : 
      `Email workflow completed with ${results.errors.length} errors`;
    
    return NextResponse.json({
      success: isHealthy,
      message,
      results,
      health: {
        emailFetching: results.fetchEmails.success,
        emailProcessing: results.processResponses.success,
        overallHealth: isHealthy
      },
      stats: {
        newEmails: results.fetchEmails.stats?.newEmails || 0,
        processed: results.totalProcessed,
        sent: results.totalSent,
        errors: results.errors.length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Email workflow error:', error.message);
    return NextResponse.json({
      success: false,
      message: `Email workflow failed: ${error.message}`,
      results,
      error: error.message
    }, { status: 500 });
  }
}

// Manual trigger for testing
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔧 Manual trigger: Starting email workflow...');
  return GET(request);
} 