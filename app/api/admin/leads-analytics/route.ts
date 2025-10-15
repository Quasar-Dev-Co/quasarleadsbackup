import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import User from '@/models/userSchema';
import Booking from '@/models/bookingSchema';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.replace('Bearer ', '');
    console.log('🔍 Auth userId:', userId);
    
    // Get current user from database
    const user = await User.findById(userId);
    console.log('🔍 User from DB:', user);
    
    if (!user || !user.admin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    await dbConnect();
    console.log('🔍 Database connected');

    // Get all users first
    const allUsers = await User.find({}, 'username email');
    console.log('🔍 All users:', allUsers);

    // Get all leads
    const allLeads = await Lead.find({}, 'name assignedTo leadsCreatedBy status createdAt');
    console.log('🔍 All leads:', allLeads);

    // Get all bookings from the Bookings collection
    const allBookings = await Booking.find({}, 'companyName clientName assignedTo userId status preferredDate');
    console.log('🔍 All bookings:', allBookings);

    // Simple approach: count leads for each user
    const leadsByUser = [];
    for (const user of allUsers) {
      const userLeads = allLeads.filter(lead => 
        lead.assignedTo === user._id.toString() || 
        lead.leadsCreatedBy === user._id.toString()
      );
      
      if (userLeads.length > 0) {
        leadsByUser.push({
          name: user.username,
          value: userLeads.length,
          email: user.email
        });
      }
    }
    console.log('🔍 Leads by user (simple):', leadsByUser);

    // Count bookings for each user from the Bookings collection
    const bookingsByUser = [];
    for (const user of allUsers) {
      const userBookings = allBookings.filter(booking => 
        booking.assignedTo === user._id.toString() || 
        booking.userId === user._id.toString()
      );
      
      if (userBookings.length > 0) {
        bookingsByUser.push({
          name: user.username,
          value: userBookings.length,
          email: user.email
        });
      }
    }
    console.log('🔍 Bookings by user (from Bookings collection):', bookingsByUser);

    // Get monthly data - simple approach
    const currentYear = new Date().getFullYear();
    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0);
      
      const monthLeads = allLeads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        return leadDate >= monthStart && leadDate <= monthEnd;
      });
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyData.push({
        month: monthNames[month],
        leads: monthLeads.length
      });
    }
    console.log('🔍 Monthly data (simple):', monthlyData);

    // If we have real data, return it
    if (leadsByUser.length > 0 || bookingsByUser.length > 0) {
      console.log('🔍 Returning REAL data!');
      return NextResponse.json({
        success: true,
        data: {
          monthlyLeads: monthlyData,
          leadsByUser: leadsByUser,
          bookingsByUser: bookingsByUser
        }
      });
    }

    // Fallback to sample data only if absolutely no data found
    console.log('🔍 No real data found, providing sample data');
    const sampleLeadsData = [
      { name: 'Sample User 1', value: 5, email: 'user1@example.com' },
      { name: 'Sample User 2', value: 3, email: 'user2@example.com' },
      { name: 'Sample User 3', value: 2, email: 'user3@example.com' }
    ];
    const sampleBookingsData = [
      { name: 'Sample User 1', value: 2, email: 'user1@example.com' },
      { name: 'Sample User 2', value: 1, email: 'user2@example.com' }
    ];
    const sampleMonthlyData = [
      { month: 'Jan', leads: 2 }, { month: 'Feb', leads: 3 }, { month: 'Mar', leads: 1 },
      { month: 'Apr', leads: 4 }, { month: 'May', leads: 2 }, { month: 'Jun', leads: 5 },
      { month: 'Jul', leads: 3 }, { month: 'Aug', leads: 6 }, { month: 'Sep', leads: 4 },
      { month: 'Oct', leads: 2 }, { month: 'Nov', leads: 3 }, { month: 'Dec', leads: 1 }
    ];

    return NextResponse.json({
      success: true,
      data: {
        monthlyLeads: sampleMonthlyData,
        leadsByUser: sampleLeadsData,
        bookingsByUser: sampleBookingsData
      },
      note: 'Sample data shown - check console for debugging info'
    });

  } catch (error) {
    console.error('❌ Error fetching leads analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
