import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Availability from '@/models/availabilitySchema';

/**
 * GET handler for fetching admin availability
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('adminId') || '';
    
    // Get active availability settings
    const availability = await Availability.findOne({ 
      userId: userId, 
      isActive: true 
    });
    
    if (!availability) {
      // Create default availability if none exists
      const defaultAvailability = new Availability({
        userId: userId,
        workingDays: [
          { day: 'monday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          { day: 'tuesday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          { day: 'wednesday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          { day: 'thursday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          { day: 'friday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          { day: 'saturday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          { day: 'sunday', isAvailable: false, timeSlots: [] }
        ],
        timezone: 'Europe/Amsterdam',
        slotDuration: 30,
        bufferTime: 15,
        isActive: true
      });
      
      const savedAvailability = await defaultAvailability.save();
      
      return NextResponse.json({
        success: true,
        data: savedAvailability
      });
    }
    
    return NextResponse.json({
      success: true,
      data: availability
    });
    
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating admin availability
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { userId, workingDays, slotDuration, bufferTime } = body;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }
    
    // Validate working days
    if (!workingDays || !Array.isArray(workingDays) || workingDays.length !== 7) {
      return NextResponse.json(
        { success: false, error: 'Invalid working days data' },
        { status: 400 }
      );
    }
    
    // Validate slot duration
    if (slotDuration && (slotDuration < 15 || slotDuration > 120)) {
      return NextResponse.json(
        { success: false, error: 'Slot duration must be between 15 and 120 minutes' },
        { status: 400 }
      );
    }
    
    // Validate buffer time
    if (bufferTime !== undefined && (bufferTime < 0 || bufferTime > 60)) {
      return NextResponse.json(
        { success: false, error: 'Buffer time must be between 0 and 60 minutes' },
        { status: 400 }
      );
    }
    
    // Find existing availability
    const existingAvailability = await Availability.findOne({ 
      userId: userId, 
      isActive: true 
    });
    
    if (existingAvailability) {
      // Update existing availability
      existingAvailability.workingDays = workingDays;
      if (slotDuration !== undefined) existingAvailability.slotDuration = slotDuration;
      if (bufferTime !== undefined) existingAvailability.bufferTime = bufferTime;
      
      const updatedAvailability = await existingAvailability.save();
      
      return NextResponse.json({
        success: true,
        message: 'Availability updated successfully',
        data: updatedAvailability
      });
    } else {
      // Create new availability
      const newAvailability = new Availability({
        userId: userId,
        workingDays: workingDays,
        timezone: 'Europe/Amsterdam',
        slotDuration: slotDuration || 30,
        bufferTime: bufferTime || 15,
        isActive: true
      });
      
      const savedAvailability = await newAvailability.save();
      
      return NextResponse.json({
        success: true,
        message: 'Availability created successfully',
        data: savedAvailability
      });
    }
    
  } catch (error: any) {
    console.error('Error updating availability:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update availability' },
      { status: 500 }
    );
  }
} 