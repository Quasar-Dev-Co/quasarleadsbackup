import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue, { IJobQueue } from '@/models/jobQueueSchema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job ID is required'
      }, { status: 400 });
    }
    
    // Find job by ID
    const job = await JobQueue.findOne({ jobId }).lean() as IJobQueue | null;
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 });
    }
    
    // Calculate time remaining if job is running
    let timeRemaining = null;
    if (job.status === 'running' && job.startedAt) {
      const elapsedMinutes = Math.floor((Date.now() - job.startedAt.getTime()) / (1000 * 60));
      const estimatedRemaining = job.estimatedDuration - elapsedMinutes;
      timeRemaining = Math.max(0, estimatedRemaining);
    }
    
    // Get queue position if job is pending
    let queuePosition = null;
    if (job.status === 'pending') {
      queuePosition = await JobQueue.countDocuments({
        status: 'pending',
        $or: [
          { priority: { $gt: job.priority } },
          { priority: job.priority, createdAt: { $lt: job.createdAt } }
        ]
      }) + 1;
    }
    
    return NextResponse.json({
      success: true,
      job: {
        jobId: job.jobId,
        type: job.type,
        status: job.status,
        priority: job.priority,
        services: job.services,
        locations: job.locations,
        leadQuantity: job.leadQuantity,
        currentService: job.currentService,
        currentLocation: job.currentLocation,
        currentStep: job.currentStep,
        totalSteps: job.totalSteps,
        progress: job.progress,
        progressMessage: job.progressMessage,
        collectedLeads: job.collectedLeads,
        totalLeadsCollected: job.totalLeadsCollected,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        estimatedDuration: job.estimatedDuration,
        timeRemaining,
        queuePosition,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        includeGoogleAdsAnalysis: job.includeGoogleAdsAnalysis || false,
        analyzeLeads: job.analyzeLeads || false
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching job status:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch job status'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job ID is required'
      }, { status: 400 });
    }
    
    // Find and update job status to cancelled
    const job = await JobQueue.findOne({ jobId });
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 });
    }
    
    job.status = 'cancelled';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    await job.save();
    
    return NextResponse.json({
      success: true,
      message: `Job ${jobId} cancelled successfully`
    });
    
  } catch (error: any) {
    console.error('Error cancelling job:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel job'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job ID is required'
      }, { status: 400 });
    }
    
    const body = await request.json();
    const { currentStep, progress, progressMessage, totalLeadsCollected } = body;
    
    // Find and update job
    const job = await JobQueue.findOne({ jobId });
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 });
    }
    
    // Update job fields
    if (currentStep !== undefined) {
      job.currentStep = currentStep;
    }
    if (progress !== undefined) {
      job.progress = progress;
    }
    if (progressMessage !== undefined) {
      job.progressMessage = progressMessage;
    }
    if (totalLeadsCollected !== undefined) {
      job.totalLeadsCollected = totalLeadsCollected;
    }
    
    job.updatedAt = new Date();
    await job.save();
    
    return NextResponse.json({
      success: true,
      message: `Job ${jobId} updated successfully`,
      job: {
        jobId: job.jobId,
        currentStep: job.currentStep,
        progress: job.progress,
        progressMessage: job.progressMessage,
        totalLeadsCollected: job.totalLeadsCollected
      }
    });
    
  } catch (error: any) {
    console.error('Error updating job:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update job'
    }, { status: 500 });
  }
} 