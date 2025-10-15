export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/bookingSchema';
import { bookingEmailService } from '@/lib/bookingEmailService';
import { ZoomService } from '@/lib/zoomService';
import User from '@/models/userSchema';
import { GoogleCalendarService } from '@/lib/googleCalendarService';

/**
 * GET handler for retrieving a specific booking by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await context.params;
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: booking
    });
    
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch booking'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a booking (status, meeting link, etc.)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await context.params;
    const body = await request.json();
    
    const {
      status,
      meetingLink,
      assignedTo,
      internalNotes,
      actualMeetingDate,
      actualMeetingTime,
      followUpDate
    } = body;
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Before applying updates, enforce Zoom and Google credential requirement when confirming
    if (status === 'confirmed') {
      const platform = booking.meetingPlatform;
      if (platform === 'zoom') {
        const ownerUserId = (booking as any).userId || (booking as any).assignedTo;
        let userCreds: any = null;
        if (ownerUserId) {
          try {
            const owner: any = await User.findById(ownerUserId).lean();
            userCreds = owner?.credentials || null;
          } catch {}
        }
        if (!userCreds?.ZOOM_ACCOUNT_ID || !userCreds?.ZOOM_CLIENT_ID || !userCreds?.ZOOM_CLIENT_SECRET) {
          return NextResponse.json(
            {
              success: false,
              error: 'Zoom credentials are not present in user profile. Please add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET before confirming.'
            },
            { status: 400 }
          );
        }
      }
      // Require Google Calendar creds as well before allowing confirm
      const ownerUserIdForG = (booking as any).userId || (booking as any).assignedTo;
      let ownerGCreds: any = null;
      if (ownerUserIdForG) {
        try {
          const owner: any = await User.findById(ownerUserIdForG).lean();
          ownerGCreds = owner?.credentials || null;
        } catch {}
      }
      if (!ownerGCreds?.GOOGLE_SERVICE_ACCOUNT_EMAIL || !ownerGCreds?.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || !ownerGCreds?.GOOGLE_CALENDAR_ID) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google Calendar credentials are missing. Please add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_CALENDAR_ID in Account Settings > Credentials before confirming.'
          },
          { status: 400 }
        );
      }
    }

    // Update fields if provided
    const updates: any = {};
    
    if (status) {
      // Validate status
      const validStatuses = ['pending', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      
      updates.status = status;
      
      // Set timestamp based on status
      if (status === 'confirmed' && booking.status !== 'confirmed') {
        updates.confirmedAt = new Date();
      } else if (status === 'completed' && booking.status !== 'completed') {
        updates.completedAt = new Date();
      } else if (status === 'cancelled' && booking.status !== 'cancelled') {
        updates.cancelledAt = new Date();
      }
    }
    
    if (meetingLink) {
      updates.meetingLink = meetingLink;
    }
    
    if (assignedTo) {
      updates.assignedTo = assignedTo;
    }
    
    if (internalNotes) {
      updates.internalNotes = internalNotes;
    }
    
    if (actualMeetingDate) {
      updates.actualMeetingDate = new Date(actualMeetingDate);
    }
    
    if (actualMeetingTime) {
      updates.actualMeetingTime = actualMeetingTime;
    }
    
    if (followUpDate) {
      updates.followUpDate = new Date(followUpDate);
    }
    
    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    console.log(`✅ Booking updated: ${id} - Status: ${status || 'unchanged'}`);
    
    // If booking is being confirmed, create Zoom meeting, create Google Calendar event and send confirmation email
    if (status === 'confirmed' && booking.status !== 'confirmed') {
      try {
        let zoomMeeting = null;
        let finalMeetingLink = meetingLink;
        
        // Create Zoom meeting if the platform is Zoom, using user-specific credentials
        if (updatedBooking.meetingPlatform === 'zoom') {
          const meetingTopic = `QuasarLeads Strategy Call - ${updatedBooking.companyName}`;
          const startDateTime = new Date(updatedBooking.actualMeetingDate || updatedBooking.preferredDate);
          const startTime = updatedBooking.actualMeetingTime || updatedBooking.preferredTime;
          
          // Combine date and time for Zoom meeting
          const [hours, minutes] = startTime.split(':');
          startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          try {
            console.log(`🔄 Creating Zoom meeting for ${updatedBooking.companyName}...`);
            console.log(`📅 Meeting time: ${startDateTime.toISOString()}`);
            // Load owner credentials
            const ownerUserId = (updatedBooking as any).userId || (updatedBooking as any).assignedTo;
            let userCreds: any = null;
            if (ownerUserId) {
              try {
                const owner: any = await User.findById(ownerUserId).lean();
                userCreds = (owner && typeof owner === 'object') ? (owner as any).credentials : null;
              } catch {}
            }

            // Require user-level Zoom credentials
            if (!userCreds?.ZOOM_ACCOUNT_ID || !userCreds?.ZOOM_CLIENT_ID || !userCreds?.ZOOM_CLIENT_SECRET) {
              throw new Error('Missing Zoom credentials in user profile. Please add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET');
            }

            const zoomService = new ZoomService({
              accountId: String(userCreds.ZOOM_ACCOUNT_ID),
              clientId: String(userCreds.ZOOM_CLIENT_ID),
              clientSecret: String(userCreds.ZOOM_CLIENT_SECRET),
            });

            zoomMeeting = await zoomService.createMeeting(
              meetingTopic,
              startDateTime.toISOString(),
              60, // 60 minutes duration
              updatedBooking.timezone,
              updatedBooking.companyEmail
            );
            
            // Update booking with the Zoom meeting details
            const zoomUpdates = {
              meetingLink: zoomMeeting.join_url,
              meetingId: zoomMeeting.id,
              meetingPassword: zoomMeeting.password,
              meetingHost: zoomMeeting.host_email,
              meetingPlatformData: {
                platform: 'zoom',
                id: zoomMeeting.id,
                join_url: zoomMeeting.join_url,
                password: zoomMeeting.password,
                host_email: zoomMeeting.host_email,
                created_at: new Date()
              }
            };
            
            await Booking.findByIdAndUpdate(id, zoomUpdates);
            finalMeetingLink = zoomMeeting.join_url;
            
            console.log(`✅ Zoom meeting created successfully`);
            console.log(`🔗 Join URL: ${zoomMeeting.join_url}`);
            console.log(`🔑 Meeting ID: ${zoomMeeting.id}`);
            
          } catch (zoomError: any) {
            console.error(`❌ Failed to create Zoom meeting:`);
            console.error(`- Error: ${zoomError.message}`);
            console.error(`- Details:`, zoomError.response?.data || 'No additional details');
            
            // Still proceed with manual meeting link if provided
            if (meetingLink) {
              console.log(`⚠️ Using provided manual meeting link instead`);
              finalMeetingLink = meetingLink;
            } else {
              throw new Error(`Failed to create Zoom meeting and no manual meeting link provided`);
            }
          }
        }
        
        // Create Google Calendar event (require per-user Google credentials)
        try {
          const ownerUserId = (updatedBooking as any).userId || (updatedBooking as any).assignedTo;
          let userCreds: any = null;
          if (ownerUserId) {
            try {
              const owner: any = await User.findById(ownerUserId).lean();
              userCreds = (owner && typeof owner === 'object') ? (owner as any).credentials : null;
            } catch {}
          }

          if (!userCreds?.GOOGLE_SERVICE_ACCOUNT_EMAIL || !userCreds?.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || !userCreds?.GOOGLE_CALENDAR_ID) {
            throw new Error('Missing Google Calendar credentials in user profile');
          }

          const startDate = new Date(updatedBooking.actualMeetingDate || updatedBooking.preferredDate);
          const [h, m] = (updatedBooking.actualMeetingTime || updatedBooking.preferredTime).split(':');
          startDate.setHours(parseInt(h), parseInt(m), 0, 0);
          const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

          const perUserGoogle = new GoogleCalendarService({
            clientEmail: String(userCreds.GOOGLE_SERVICE_ACCOUNT_EMAIL),
            privateKey: String(userCreds.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
            calendarId: String(userCreds.GOOGLE_CALENDAR_ID)
          });

          const event = await perUserGoogle.createEvent({
            summary: `Meeting: ${updatedBooking.companyName}`,
            description: `Platform: ${updatedBooking.meetingPlatform}\nAttendees: ${updatedBooking.memberCount}\nLink: ${finalMeetingLink || ''}`,
            startDateTimeISO: startDate.toISOString(),
            endDateTimeISO: endDate.toISOString(),
            timeZone: updatedBooking.timezone,
            // Attendees optional; set GOOGLE_CALENDAR_INVITE_ATTENDEES=true to include
            attendees: [{ email: updatedBooking.companyEmail, displayName: updatedBooking.clientName }],
          });

          await Booking.findByIdAndUpdate(id, {
            calendarEventId: event.id,
            calendarEventLink: event.htmlLink || '',
          });
        } catch (gcErr: any) {
          console.error('❌ Failed to create Google Calendar event:', gcErr?.message || gcErr);
        }

        // Send professional confirmation email using the booking owner's SMTP
        const ownerUserId = (updatedBooking as any).userId || (updatedBooking as any).assignedTo;
        const confirmationSent = await bookingEmailService.sendMeetingConfirmation({
          companyName: updatedBooking.companyName,
          companyEmail: updatedBooking.companyEmail,
          companyPhone: updatedBooking.companyPhone,
          clientName: updatedBooking.clientName,
          position: updatedBooking.position,
          memberCount: updatedBooking.memberCount,
          meetingPlatform: updatedBooking.meetingPlatform,
          preferredDate: updatedBooking.preferredDate.toISOString(),
          preferredTime: updatedBooking.preferredTime,
          timezone: updatedBooking.timezone,
          additionalNotes: updatedBooking.additionalNotes,
          meetingLink: finalMeetingLink || '',
          actualMeetingDate: (updatedBooking.actualMeetingDate || updatedBooking.preferredDate).toISOString(),
          actualMeetingTime: updatedBooking.actualMeetingTime || updatedBooking.preferredTime,
          zoomMeeting: zoomMeeting || undefined
        }, ownerUserId);
        
        if (confirmationSent) {
          console.log(`✅ Professional confirmation email sent to ${updatedBooking.companyEmail}`);
        } else {
          console.warn(`⚠️ Failed to send confirmation email to ${updatedBooking.companyEmail}`);
        }
        
      } catch (confirmationError: any) {
        console.error(`❌ Error in booking confirmation process: ${confirmationError.message}`);
        // Don't fail the booking update if confirmation email fails
      }
    }
    
    // Refresh the booking data to include any updates from Zoom meeting creation
    const finalBooking = await Booking.findById(id);
    
    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: finalBooking
    });
    
  } catch (error: any) {
    console.error('❌ Error updating booking:', error);
    
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
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update booking'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a booking
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await context.params;
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    await Booking.findByIdAndDelete(id);
    
    console.log(`🗑️ Booking deleted: ${id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error deleting booking:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete booking'
      },
      { status: 500 }
    );
  }
} 