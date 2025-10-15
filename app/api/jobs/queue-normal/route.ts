import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue from '@/models/jobQueueSchema';
import User from '@/models/userSchema';
import { v4 as uuidv4 } from 'uuid';

interface QueueJobRequest {
  services: string | string[];
  locations: string | string[];
  leadQuantity: string | number;
  type?: 'lead-collection';
  priority?: number;
  userId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const body: QueueJobRequest = await request.json();
    const { 
      services, 
      locations, 
      leadQuantity, 
      type = 'lead-collection', 
      priority = 1,
      userId
    } = body;
    
    // Get user ID from request if not provided in body
    const finalUserId = userId || request.nextUrl.searchParams.get('userId');
    
    if (!finalUserId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 401 });
    }

    // Ensure required credentials are present for this user
    const user = await User.findById(finalUserId).lean() as any;
    const serpKey = user?.credentials?.SERPAPI_KEY as string | undefined;
    if (!serpKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing credentials: SERPAPI_KEY',
        missingCredentials: ['SERPAPI_KEY']
      }, { status: 400 });
    }
    
    // Validate required fields
    if (!services || !locations || !leadQuantity) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: services, locations, leadQuantity'
      }, { status: 400 });
    }
    
    // Parse services and locations
    const servicesList: string[] = Array.isArray(services) 
      ? services 
      : services.split(',').map((s: string) => s.trim()).filter(Boolean);
    
    const locationsList: string[] = Array.isArray(locations) 
      ? locations 
      : locations.split(',').map((l: string) => l.trim()).filter(Boolean);
    
    if (servicesList.length === 0 || locationsList.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one service and one location are required'
      }, { status: 400 });
    }
    
    // Calculate total steps and estimated duration for NORMAL leads (faster)
    const totalSteps = servicesList.length * locationsList.length;
    const estimatedDurationPerStep = 5; // 5 minutes per service-location combination (faster for normal leads)
    const estimatedDuration = totalSteps * estimatedDurationPerStep;
    
    // Create job ID
    const jobId = uuidv4();
    
    // Create job in queue for NORMAL leads collection
    const job = new JobQueue({
      jobId,
      type,
      status: 'pending',
      priority,
      services: servicesList,
      locations: locationsList,
      leadQuantity: parseInt(leadQuantity.toString()),
      totalSteps,
      estimatedDuration,
      progressMessage: `Queued: ${totalSteps} simple lead collection tasks (${totalSteps} SERP coin${totalSteps > 1 ? 's' : ''})`,
      includeGoogleAdsAnalysis: false, // NO Google Ads analysis for normal leads
      analyzeLeads: false, // NO enhanced analysis for normal leads
      userId: finalUserId, // User ID who created this job
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await job.save();
    
    // Get queue position
    const queuePosition = await JobQueue.countDocuments({
      status: 'pending',
      $or: [
        { priority: { $gt: priority } },
        { priority: priority, createdAt: { $lt: job.createdAt } }
      ]
    });
    
    // Create processing order preview
    const processingOrder = servicesList.map((service, serviceIndex) => 
      locationsList.map((location, locationIndex) => {
        const stepNumber = serviceIndex * locationsList.length + locationIndex + 1;
        return `Step ${stepNumber}: ${service} + ${location}`;
      })
    ).flat();
    
    return NextResponse.json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        totalSteps: job.totalSteps,
        estimatedDuration: job.estimatedDuration,
        queuePosition: queuePosition + 1,
        services: job.services,
        locations: job.locations,
        leadQuantity: job.leadQuantity,
        progressMessage: job.progressMessage,
        createdAt: job.createdAt,
        type: 'normal-leads',
        userId: job.userId // Include the user ID in the response
      },
      message: `Simple lead collection job queued successfully! 
      
📋 Job Details:
• Total combinations: ${totalSteps} (${servicesList.length} services × ${locationsList.length} locations)
• Estimated completion: ~${Math.ceil(estimatedDuration / 60)} minutes
• Processing: One combination every 5 minutes via cron job
• SERP coins used: ${totalSteps} (1 per service-location combination)
• Queue position: ${queuePosition + 1}

🔄 Processing Order:
${processingOrder.slice(0, 5).join('\n')}${processingOrder.length > 5 ? '\n... and ' + (processingOrder.length - 5) + ' more steps' : ''}

⏰ The job will start automatically within 5 minutes and process one service-location combination per execution.`
    });
    
  } catch (error: any) {
    console.error('Error queuing normal leads job:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to queue normal leads job'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const userId = url.searchParams.get('userId'); // Get user ID from query params
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required to view jobs'
      }, { status: 401 });
    }
    
    // Build query for normal leads jobs only - FILTER BY USER ID
    const query: any = {
      includeGoogleAdsAnalysis: false, // Filter for normal leads jobs
      analyzeLeads: false,
      userId: userId // Only show jobs created by this user
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get normal leads jobs for this specific user only
    const jobs = await JobQueue.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Get job statistics
    const stats = await JobQueue.aggregate([
      {
        $match: {
          includeGoogleAdsAnalysis: false,
          analyzeLeads: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalLeads: { $sum: '$totalLeadsCollected' }
        }
      }
    ]);
    
    const statsMap = stats.reduce((acc: any, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalLeads: stat.totalLeads
      };
      return acc;
    }, {});
    
    return NextResponse.json({
      success: true,
      jobs,
      stats: statsMap,
      type: 'normal-leads'
    });
    
  } catch (error: any) {
    console.error('Error fetching normal leads jobs:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch normal leads jobs'
    }, { status: 500 });
  }
} 