import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';
import Lead from '@/models/leadSchema';
import Booking from '@/models/bookingSchema';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin via Authorization: Bearer <userId>
    const authHeader = request.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const requester: any = await User.findById(userId).lean();
    if (!requester || !requester.admin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Load users (exclude password)
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).lean();

    // Build per-user stats
    const userStats = [] as Array<{
      _id: string;
      username: string;
      email: string;
      verified: boolean;
      admin: boolean;
      createdAt: Date;
      leadsCount: number;
      bookingsCount: number;
    }>;

    for (const u of users) {
      const uId = String(u._id);
      const leadsCount = await Lead.countDocuments({
        $or: [{ assignedTo: uId }, { leadsCreatedBy: uId }],
      });
      const bookingsCount = await Booking.countDocuments({
        $or: [{ userId: uId }, { assignedTo: uId }],
      });

      userStats.push({
        _id: uId,
        username: u.username,
        email: u.email,
        verified: Boolean(u.verified),
        admin: Boolean(u.admin),
        createdAt: u.createdAt,
        leadsCount,
        bookingsCount,
      });
    }

    const totalUsers = userStats.length;
    const activeUsers = userStats.filter((u) => u.verified).length;
    const totalLeads = userStats.reduce((sum, u) => sum + u.leadsCount, 0);
    const totalBookings = userStats.reduce((sum, u) => sum + u.bookingsCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: { totalUsers, activeUsers, totalLeads, totalBookings },
        users: userStats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin all-leads overview:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load overview' },
      { status: 500 }
    );
  }
}


