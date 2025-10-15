import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue from '@/models/jobQueueSchema';
import Lead from '@/models/leadSchema';
import { emailService } from '@/lib/emailService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📧 EMAIL SEQUENCE PROCESSOR STARTING');
    console.log('=====================================');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    await dbConnect();
    
    const now = new Date();
    
    // Find all active email sequence jobs with due emails
    const dueJobs = await JobQueue.find({
      type: 'email-sequence',
      status: { $in: ['pending', 'running'] },
      nextEmailDue: { $lte: now }
    }).populate('leadId');
    
    console.log(`🎯 Found ${dueJobs.length} email sequence jobs with due emails`);
    
    if (dueJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No email sequences due at this time",
        processedAt: new Date().toISOString(),
        results: {
          totalJobs: 0,
          emailsSent: 0,
          errors: 0,
          completed: 0
        }
      });
    }
    
    let emailsSent = 0;
    let errors = 0;
    let completed = 0;
    const results = [];
    
    // Process each job
    for (const job of dueJobs) {
      try {
        console.log(`\n🔧 Processing job ${job.jobId} for lead: ${job.leadId}`);
        
        // Get the lead
        const lead = await Lead.findById(job.leadId);
        if (!lead) {
          console.log(`❌ Lead not found for job ${job.jobId}`);
          job.status = 'failed';
          job.errorMessage = 'Lead not found';
          await job.save();
          errors++;
          continue;
        }
        
        // Find the next email to send
        const nextEmail = job.emailSchedule.find((email: any) => 
          email.status === 'pending' && 
          new Date(email.scheduledAt) <= now
        );
        
        if (!nextEmail) {
          console.log(`   ⏭️ No emails due for ${lead.name} yet`);
          continue;
        }
        
        console.log(`   📤 Sending email ${nextEmail.step}/7 (${nextEmail.stage}) for ${lead.name}`);
        
        // Send the email
        const emailResult = await emailService.sendStageEmail({
          name: lead.name,
          email: lead.email,
          company: lead.company || 'Your Company',
          stage: nextEmail.stage
        }, job.userId);

        // If template missing for any stage, abort sequence with clear error to surface in UI logs
        if (!emailResult.success && /No email template found|templates/i.test(emailResult.error || '')) {
          throw new Error('Missing required email templates for 7-step sequence');
        }
        
        if (emailResult.success) {
          console.log(`   ✅ Email sent! Message ID: ${emailResult.messageId}`);
          
          // Update email in schedule
          const emailIndex = job.emailSchedule.findIndex((e: any) => e.step === nextEmail.step);
          job.emailSchedule[emailIndex].status = 'sent';
          job.emailSchedule[emailIndex].sentAt = new Date();
          job.emailSchedule[emailIndex].messageId = emailResult.messageId;
          
          // Update lead's email history
          await Lead.findByIdAndUpdate(lead._id, {
            $push: { 
              emailHistory: {
                stage: nextEmail.stage,
                sentAt: new Date(),
                messageId: emailResult.messageId,
                status: 'sent',
                manual: false
              }
            },
            $set: {
              stage: nextEmail.stage,
              emailSequenceStep: nextEmail.step,
              emailSequenceStage: nextEmail.stage,
              lastEmailedAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          // Update job progress
          const sentEmails = job.emailSchedule.filter((e: any) => e.status === 'sent').length;
          job.progress = Math.round((sentEmails / 7) * 100);
          job.currentStep = nextEmail.step;
          job.progressMessage = `Sent email ${sentEmails}/7: ${nextEmail.stage}`;
          
          // Find next email due
          const nextPendingEmail = job.emailSchedule.find((e: any) => e.status === 'pending');
          if (nextPendingEmail) {
            job.nextEmailDue = new Date(nextPendingEmail.scheduledAt);
            job.status = 'running';
            console.log(`   ⏰ Next email (${nextPendingEmail.stage}) due at ${job.nextEmailDue.toISOString()}`);
          } else {
            // All emails sent - complete the sequence
            job.status = 'completed';
            job.progress = 100;
            job.completedAt = new Date();
            job.progressMessage = 'Email sequence completed - all 7 emails sent';
            job.nextEmailDue = null;
            
            // Update lead status
            await Lead.findByIdAndUpdate(lead._id, {
              $set: {
                emailSequenceActive: false,
                emailStoppedReason: 'Sequence completed (7 emails sent)',
                nextScheduledEmail: null,
                updatedAt: new Date()
              }
            });
            
            console.log(`   🎉 Email sequence completed for ${lead.name}!`);
            completed++;
          }
          
          await job.save();
          emailsSent++;
          
          results.push({
            jobId: job.jobId,
            leadName: lead.name,
            email: lead.email,
            step: nextEmail.step,
            stage: nextEmail.stage,
            status: 'sent',
            messageId: emailResult.messageId,
            nextEmailDue: job.nextEmailDue ? job.nextEmailDue.toISOString() : 'completed'
          });
          
        } else {
          console.log(`   ❌ Email failed: ${emailResult.error}`);
          
          // Mark email as failed in schedule
          const emailIndex = job.emailSchedule.findIndex((e: any) => e.step === nextEmail.step);
          job.emailSchedule[emailIndex].status = 'failed';
          job.emailSchedule[emailIndex].error = emailResult.error;
          
          // Retry in 10 minutes
          job.nextEmailDue = new Date(Date.now() + 10 * 60 * 1000);
          job.retryCount = (job.retryCount || 0) + 1;
          
          if (job.retryCount >= job.maxRetries) {
            job.status = 'failed';
            job.errorMessage = `Max retries exceeded: ${emailResult.error}`;
            job.completedAt = new Date();
            
            await Lead.findByIdAndUpdate(lead._id, {
              $set: {
                emailSequenceActive: false,
                emailStoppedReason: `Email sequence failed: ${emailResult.error}`,
                nextScheduledEmail: null,
                updatedAt: new Date()
              }
            });
          }
          
          await job.save();
          errors++;
          
          results.push({
            jobId: job.jobId,
            leadName: lead.name,
            email: lead.email,
            step: nextEmail.step,
            stage: nextEmail.stage,
            status: 'failed',
            error: emailResult.error,
            retryAt: job.nextEmailDue ? job.nextEmailDue.toISOString() : null
          });
        }
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (jobError: any) {
        console.error(`💥 Error processing job ${job.jobId}:`, jobError);
        
        job.status = 'failed';
        job.errorMessage = jobError.message;
        job.completedAt = new Date();
        await job.save();
        
        errors++;
        results.push({
          jobId: job.jobId,
          status: 'error',
          error: jobError.message
        });
      }
    }
    
    console.log(`\n🎉 EMAIL SEQUENCE PROCESSING COMPLETE:`);
    console.log(`   📧 Emails sent: ${emailsSent}`);
    console.log(`   ✅ Sequences completed: ${completed}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total jobs processed: ${dueJobs.length}`);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${dueJobs.length} email sequence jobs: ${emailsSent} emails sent, ${completed} sequences completed`,
      processedAt: new Date().toISOString(),
      results: {
        totalJobs: dueJobs.length,
        emailsSent,
        errors,
        completed,
        details: results
      }
    });
    
  } catch (error: any) {
    console.error('💥 Email sequence processor error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Email sequence processor failed',
      processedAt: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request); // Allow both GET and POST for manual testing
} 