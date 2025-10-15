import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Availability from '@/models/availabilitySchema';
import Booking from '@/models/bookingSchema';
import { 
  getDayName, 
  getAvailableSlots, 
  convertToNLTime, 
  parseTimezoneOffset,
  NL_TIMEZONE 
} from '@/lib/timezoneUtils';

/**
 * GET handler for fetching available time slots for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const clientTimezone = searchParams.get('timezone') || 'UTC+00:00';
    const userId = searchParams.get('userId') || searchParams.get('adminId') || '';
    
    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }
    
    const requestedDate = new Date(dateStr);
    
    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestedDate < today) {
      return NextResponse.json(
        { success: false, error: 'Cannot book slots in the past' },
        { status: 400 }
      );
    }
    
    // Get admin availability
    let availability = await Availability.findOne({ 
      userId: userId, 
      isActive: true 
    });
    // Fallback to any active availability (e.g., default 'admin')
    if (!availability) {
      availability = await Availability.findOne({ isActive: true });
    }
    
    if (!availability) {
      return NextResponse.json(
        { success: false, error: 'Admin availability not found' },
        { status: 404 }
      );
    }
    
    // Get day availability
    const dayName = getDayName(requestedDate);
    const dayAvailability = availability.workingDays.find(
      (day: any) => day.day === dayName
    );
    
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return NextResponse.json({
        success: true,
        data: {
          date: dateStr,
          dayName: dayName,
          isAvailable: false,
          slots: [],
          message: 'No availability for this day'
        }
      });
    }
    
    // Get existing bookings for this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // IMPORTANT: Prevent global conflicts. We block slots if ANY booking exists at that time,
    // regardless of which user owns it, since admin attends all meetings.
    const existingBookings = await Booking.find({
      preferredDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    });
    
    // Convert existing bookings to NL time
    const bookedSlots = existingBookings.map(booking => {
      const bookingDateTime = new Date(booking.preferredDate);
      const [hour, minute] = booking.preferredTime.split(':').map(Number);
      bookingDateTime.setHours(hour, minute, 0, 0);
      return bookingDateTime;
    });
    
    // Convert client timezone to proper format for timezone conversion
    let timezoneForConversion = clientTimezone;
    if (clientTimezone.startsWith('UTC')) {
      const offset = parseTimezoneOffset(clientTimezone);
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.abs(Math.floor(offset / 60));
      const minutes = Math.abs(offset % 60);
      timezoneForConversion = `Etc/GMT${sign}${hours}`;
    }
    
    // Generate available slots
    const availableSlots = getAvailableSlots(
      requestedDate,
      dayAvailability,
      availability.slotDuration,
      availability.bufferTime,
      bookedSlots,
      timezoneForConversion
    );
    
    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        dayName: dayName,
        isAvailable: true,
        slots: availableSlots,
        slotDuration: availability.slotDuration,
        bufferTime: availability.bufferTime,
        adminTimezone: availability.timezone,
        clientTimezone: clientTimezone,
        totalSlots: availableSlots.length,
        bookedSlots: existingBookings.length
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for checking if a specific time slot is available
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { date, time, timezone, userId, adminId } = body;
    const ownerId = userId || adminId || '';
    
    if (!date || !time || !timezone) {
      return NextResponse.json(
        { success: false, error: 'Date, time, and timezone are required' },
        { status: 400 }
      );
    }
    
    const requestedDate = new Date(date);
    const [hour, minute] = time.split(':').map(Number);
    requestedDate.setHours(hour, minute, 0, 0);
    
    // Normalize client timezone if needed (support "UTC+HH:MM (Label)" strings)
    let timezoneForConversion = timezone;
    if (typeof timezoneForConversion === 'string' && timezoneForConversion.startsWith('UTC')) {
      const offset = parseTimezoneOffset(timezoneForConversion);
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.abs(Math.floor(offset / 60));
      timezoneForConversion = `Etc/GMT${sign}${hours}`;
    }

    // Convert client time to NL time
    const nlDateTime = convertToNLTime(requestedDate, timezoneForConversion);
    
    // Get owner availability
    const availability = await Availability.findOne({ 
      userId: ownerId, 
      isActive: true 
    });
    
    if (!availability) {
      return NextResponse.json(
        { success: false, error: 'Admin availability not found' },
        { status: 404 }
      );
    }
    
    // Check if day is available
    const dayName = getDayName(nlDateTime);
    const dayAvailability = availability.workingDays.find(
      (day: any) => day.day === dayName
    );
    
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Admin not available on this day'
      });
    }
    
    // Check if time is within working hours
    const requestedTime = `${nlDateTime.getHours().toString().padStart(2, '0')}:${nlDateTime.getMinutes().toString().padStart(2, '0')}`;
    let withinWorkingHours = false;
    
    for (const timeSlot of dayAvailability.timeSlots) {
      if (requestedTime >= timeSlot.start && requestedTime <= timeSlot.end) {
        withinWorkingHours = true;
        break;
      }
    }
    
    if (!withinWorkingHours) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Time is outside working hours'
      });
    }
    
    // Check for conflicting bookings
    const startOfDay = new Date(nlDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(nlDateTime);
    endOfDay.setHours(23, 59, 59, 999);
    
    const conflictingBooking = await Booking.findOne({
      preferredDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      preferredTime: requestedTime,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (conflictingBooking) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Time slot is already booked'
      });
    }
    
    return NextResponse.json({
      success: true,
      available: true,
      nlTime: `${nlDateTime.toDateString()} ${requestedTime}`,
      message: 'Time slot is available'
    });
    
  } catch (error: any) {
    console.error('Error checking slot availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check slot availability' },
      { status: 500 }
    );
  }
} 