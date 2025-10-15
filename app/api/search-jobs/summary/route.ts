import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SearchJob from '@/models/searchJobSchema';
import TemporaryLead from '@/models/temporaryLeadSchema';
import Lead from '@/models/leadSchema';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();

    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId') || undefined;
    const authHeader = request.headers.get('authorization') || '';
    const bearerUserId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
    const userId = bearerUserId || queryUserId;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const [
      totalJobs,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      recentJobs,
      tempTotal,
      tempPendingAuth,
      tempProcessed,
      mainLeadsCount
    ] = await Promise.all([
      SearchJob.countDocuments({ userId }),
      SearchJob.countDocuments({ userId, status: 'pending' }),
      SearchJob.countDocuments({ userId, status: 'processing' }),
      SearchJob.countDocuments({ userId, status: 'completed' }),
      SearchJob.countDocuments({ userId, status: 'failed' }),
      SearchJob.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      TemporaryLead.countDocuments({ userId }),
      TemporaryLead.countDocuments({ userId, isAuthCheck: false }),
      TemporaryLead.countDocuments({ userId, isAuthCheck: true }),
      Lead.countDocuments({ leadsCreatedBy: userId })
    ]);

    // Derive a simple stage for UI
    let stage: 'idle' | 'pending' | 'processing' | 'collecting' | 'enriching' | 'completed' | 'failed' = 'idle';
    if (failedJobs > 0 && processingJobs === 0 && pendingJobs === 0) {
      stage = 'failed';
    } else if (pendingJobs > 0 && processingJobs === 0) {
      stage = 'pending';
    } else if (processingJobs > 0) {
      stage = 'processing';
    } else if (totalJobs > 0 && completedJobs === totalJobs && tempTotal > 0 && tempPendingAuth > 0) {
      stage = 'enriching';
    } else if (totalJobs > 0 && completedJobs === totalJobs && tempTotal > 0 && tempPendingAuth === 0) {
      stage = 'completed';
    } else if (totalJobs > 0 && completedJobs < totalJobs) {
      stage = 'processing';
    } else if (tempTotal > 0 && tempPendingAuth > 0) {
      stage = 'collecting';
    } else if (tempTotal > 0 && tempPendingAuth === 0) {
      stage = 'completed';
    }

    // Compute a coarse progress percentage
    let progress = 0;
    if (totalJobs > 0) {
      const searchProgress = (completedJobs / totalJobs) * 60 + (processingJobs > 0 ? 10 : pendingJobs > 0 ? 5 : 0);
      const denom = tempProcessed + tempPendingAuth;
      const enrichProgress = denom > 0 ? (tempProcessed / denom) * 40 : 0;
      progress = Math.min(100, Math.round(searchProgress + enrichProgress));
    } else if (tempTotal > 0) {
      const denom = tempProcessed + tempPendingAuth;
      progress = denom > 0 ? Math.round((tempProcessed / denom) * 100) : 0;
    }

    return NextResponse.json({
      success: true,
      userId,
      stage,
      progress,
      searchJobs: {
        total: totalJobs,
        pending: pendingJobs,
        processing: processingJobs,
        completed: completedJobs,
        failed: failedJobs,
        recent: recentJobs.map(j => ({
          service: j.service,
          location: j.location,
          status: j.status,
          progress: j.progress,
          startedAt: j.startedAt,
          completedAt: j.completedAt
        }))
      },
      temporaryLeads: {
        total: tempTotal,
        pendingAuth: tempPendingAuth,
        processed: tempProcessed
      },
      mainLeads: {
        total: mainLeadsCount
      }
    });
  } catch (error: any) {
    console.error('jobs summary error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
  }
}


