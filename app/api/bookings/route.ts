import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/bookingSchema';
import { bookingEmailService } from '@/lib/bookingEmailService';
import User from '@/models/userSchema';

/**
 * POST handler for creating new booking requests
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const {
      companyName,
      companyEmail,
      companyPhone,
      clientName,
      position,
      memberCount,
      meetingPlatform,
      preferredDate,
      preferredTime,
      timezone,
      additionalNotes,
      userId
    } = body;
    // Validate userId corresponds to an existing user (owner of booking link)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking link: userId is required' },
        { status: 400 }
      );
    }
    const linkOwner = await User.findById(userId).lean();
    if (!linkOwner) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking link: user not found' },
        { status: 404 }
      );
    }

    
    // Validate required fields with explicit reporting
    const missingFields: string[] = [];
    if (!companyName) missingFields.push('companyName');
    if (!companyEmail) missingFields.push('companyEmail');
    if (!clientName) missingFields.push('clientName');
    if (!position) missingFields.push('position');
    if (!memberCount) missingFields.push('memberCount');
    if (!meetingPlatform) missingFields.push('meetingPlatform');
    if (!preferredDate) missingFields.push('preferredDate');
    if (!preferredTime) missingFields.push('preferredTime');
    if (!timezone) missingFields.push('timezone');
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}`, missingFields },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate date is not in the past
    const bookingDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
      return NextResponse.json(
        { success: false, error: 'Booking date cannot be in the past' },
        { status: 400 }
      );
    }
    
    // Validate member count
    const validMemberCounts = ['1', '2', '3', '4', '5', '6+'];
    if (!validMemberCounts.includes(memberCount)) {
      return NextResponse.json(
        { success: false, error: 'Invalid member count', expected: validMemberCounts },
        { status: 400 }
      );
    }
    
    // Validate meeting platform
    const validPlatforms = ['zoom', 'meet', 'skype', 'teams'];
    if (!validPlatforms.includes(meetingPlatform)) {
      return NextResponse.json(
        { success: false, error: 'Invalid meeting platform', expected: validPlatforms },
        { status: 400 }
      );
    }
    
    // Get client IP and user agent for tracking
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Check for duplicate booking (same email and date)
    const existingBooking = await Booking.findOne({
      companyEmail: companyEmail.toLowerCase(),
      preferredDate: bookingDate,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingBooking) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A booking already exists for this email and date. Please choose a different date or contact us directly.' 
        },
        { status: 409 }
      );
    }
    
    // Check for time slot conflicts
    const conflictingTimeBooking = await Booking.findOne({
      preferredDate: bookingDate,
      preferredTime: preferredTime,
      status: { $in: ['pending', 'confirmed'] },
      $or: [ { assignedTo: userId }, { userId } ]
    });
    
    if (conflictingTimeBooking) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This time slot is already booked. Please select a different time.' 
        },
        { status: 409 }
      );
    }
    
    // Create new booking
    const bookingData = {
      companyName: companyName.trim(),
      companyEmail: companyEmail.toLowerCase().trim(),
      companyPhone: companyPhone?.trim() || undefined,
      clientName: clientName.trim(),
      position: position.trim(),
      memberCount,
      meetingPlatform,
      preferredDate: bookingDate,
      preferredTime,
      timezone,
      additionalNotes: additionalNotes?.trim() || undefined,
      userId: userId,
      assignedTo: userId,
      status: 'pending',
      source: 'clientbooking_link',
      ipAddress: clientIP,
      userAgent
    };
    
    const newBooking = new Booking(bookingData);
    const savedBooking = await newBooking.save();
    
    // Log successful booking creation
    console.log(`✅ New booking created: ${savedBooking._id} for ${companyName} on ${preferredDate}`);
    
    // Send professional acknowledgment email (24-hour response promise)
    try {
      const emailSent = await bookingEmailService.sendBookingAcknowledgment({
        companyName: savedBooking.companyName,
        companyEmail: savedBooking.companyEmail,
        companyPhone: savedBooking.companyPhone,
        clientName: savedBooking.clientName,
        position: savedBooking.position,
        memberCount: savedBooking.memberCount,
        meetingPlatform: savedBooking.meetingPlatform,
        preferredDate: savedBooking.preferredDate.toISOString(),
        preferredTime: savedBooking.preferredTime,
        timezone: savedBooking.timezone,
        additionalNotes: savedBooking.additionalNotes
      }, userId);
      
      if (emailSent) {
        console.log(`✅ Professional acknowledgment email sent to ${savedBooking.companyEmail}`);
      } else {
        console.warn(`⚠️ Failed to send acknowledgment email to ${savedBooking.companyEmail}`);
      }
    } catch (emailError: any) {
      console.error(`❌ Error sending acknowledgment email: ${emailError.message}`);
      // Don't fail the booking creation if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking request submitted successfully',
      booking: {
        id: savedBooking._id,
        companyName: savedBooking.companyName,
        clientName: savedBooking.clientName,
        preferredDate: savedBooking.preferredDate,
        preferredTime: savedBooking.preferredTime,
        status: savedBooking.status,
        createdAt: savedBooking.createdAt
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Error creating booking:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validationErrors 
        },
        { status: 400 }
      );
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A booking with this information already exists' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create booking. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for retrieving bookings (for admin/internal use)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build query
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (email) {
      query.companyEmail = { $regex: email, $options: 'i' };
    }
    
    if (userId) {
      // Include bookings created via client link (userId) and ones assigned internally (assignedTo)
      query.$or = [{ userId }, { assignedTo: userId }];
    }
    
    if (startDate || endDate) {
      query.preferredDate = {};
      if (startDate) {
        query.preferredDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.preferredDate.$lte = new Date(endDate);
      }
    }
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Execute query
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count
    const totalCount = await Booking.countDocuments(query);
    
    // Get status counts (SCOPED TO SAME QUERY)
    const matchStage = Object.keys(query).length > 0 ? [{ $match: query }] : [];
    const statusCounts = await Booking.aggregate([
      ...matchStage,
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const statusSummary = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      rescheduled: 0,
      no_show: 0
    };
    
    statusCounts.forEach(({ _id, count }) => {
      if (_id in statusSummary) {
        statusSummary[_id as keyof typeof statusSummary] = count;
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        summary: statusSummary
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings'
      },
      { status: 500 }
    );
  }
} 