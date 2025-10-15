import mongoose, { Document, Schema } from 'mongoose';

type BookingStatus = 
  "pending" | 
  "confirmed" | 
  "rescheduled" | 
  "completed" | 
  "cancelled" | 
  "no_show";

type MeetingPlatform = "zoom" | "meet" | "skype" | "teams";

interface Booking extends Document {
  // Company Information
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  
  // Contact Person
  clientName: string;
  position: string;
  
  // Meeting Details
  memberCount: string;
  meetingPlatform: MeetingPlatform;
  
  // Schedule
  preferredDate: Date;
  preferredTime: string;
  timezone: string;
  
  // Additional Information
  additionalNotes?: string;
  
  // System Fields
  status: BookingStatus;
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;
  meetingHost?: string;
  meetingPlatformData?: {
    platform: string;
    id: string;
    join_url: string;
    password: string;
    host_email: string;
    created_at: Date;
  };
  // Calendar integration
  calendarEventId?: string;
  calendarEventLink?: string;
  actualMeetingDate?: Date;
  actualMeetingTime?: string;
  assignedTo?: string;
  userId?: string; // User ID who created/sent the booking link
  internalNotes?: string;
  followUpDate?: Date;
  
  // Tracking
  source: string; // Where the booking came from
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

const bookingSchema = new Schema<Booking>({
  // Company Information
  companyName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  companyEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid email address!`
    }
  },
  companyPhone: {
    type: String,
    trim: true
  },
  
  // Contact Person
  clientName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  
  // Meeting Details
  memberCount: {
    type: String,
    required: true,
    enum: ['1', '2', '3', '4', '5', '6+']
  },
  meetingPlatform: {
    type: String,
    required: true,
    enum: ['zoom', 'meet', 'skype', 'teams']
  },
  
  // Schedule
  preferredDate: {
    type: Date,
    required: true,
    index: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    required: true
  },
  
  // Additional Information
  additionalNotes: {
    type: String,
    trim: true
  },
  
  // System Fields
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  },
  meetingLink: {
    type: String,
    trim: true
  },
  meetingId: {
    type: String,
    trim: true
  },
  meetingPassword: {
    type: String,
    trim: true
  },
  meetingHost: {
    type: String,
    trim: true
  },
  meetingPlatformData: {
    platform: {
      type: String,
      trim: true
    },
    id: {
      type: String,
      trim: true
    },
    join_url: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      trim: true
    },
    host_email: {
      type: String,
      trim: true
    },
    created_at: {
      type: Date
    }
  },
  calendarEventId: {
    type: String,
    trim: true
  },
  calendarEventLink: {
    type: String,
    trim: true
  },
  actualMeetingDate: {
    type: Date
  },
  actualMeetingTime: {
    type: String
  },
  assignedTo: {
    type: String,
    trim: true,
    index: true
  },
  userId: {
    type: String,
    trim: true,
    index: true
  },
  internalNotes: {
    type: String,
    trim: true
  },
  followUpDate: {
    type: Date,
    index: true
  },
  
  // Tracking
  source: {
    type: String,
    default: 'website_booking_form',
    trim: true,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  // Timestamps
  confirmedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true,
});

// Compound indexes for common queries
bookingSchema.index({ status: 1, preferredDate: 1 });
bookingSchema.index({ companyEmail: 1, status: 1 });
bookingSchema.index({ assignedTo: 1, status: 1 });
bookingSchema.index({ preferredDate: 1, preferredTime: 1 });
bookingSchema.index({ createdAt: -1 }); // For recent bookings

// Virtual for full contact info
bookingSchema.virtual('contactInfo').get(function() {
  return {
    name: this.clientName,
    email: this.companyEmail,
    phone: this.companyPhone,
    company: this.companyName,
    position: this.position
  };
});

// Virtual for meeting info
bookingSchema.virtual('meetingInfo').get(function() {
  return {
    platform: this.meetingPlatform,
    date: this.preferredDate,
    time: this.preferredTime,
    timezone: this.timezone,
    attendees: this.memberCount,
    link: this.meetingLink
  };
});

// Pre-save middleware to validate date is not in the past
bookingSchema.pre('save', function(next) {
  if (this.isNew && this.preferredDate < new Date()) {
    const error = new Error('Preferred date cannot be in the past');
    return next(error);
  }
  next();
});

// Static method to find upcoming bookings
bookingSchema.statics.findUpcoming = function() {
  return this.find({
    status: { $in: ['pending', 'confirmed'] },
    preferredDate: { $gte: new Date() }
  }).sort({ preferredDate: 1, preferredTime: 1 });
};

// Static method to find today's bookings
bookingSchema.statics.findToday = function() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    status: { $in: ['confirmed'] },
    preferredDate: {
      $gte: today.setHours(0, 0, 0, 0),
      $lt: tomorrow.setHours(0, 0, 0, 0)
    }
  }).sort({ preferredTime: 1 });
};

// Instance method to confirm booking
bookingSchema.methods.confirm = function(meetingLink?: string, assignedTo?: string) {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  if (meetingLink) this.meetingLink = meetingLink;
  if (assignedTo) this.assignedTo = assignedTo;
  return this.save();
};

// Instance method to cancel booking
bookingSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) this.internalNotes = (this.internalNotes ? this.internalNotes + '\n' : '') + `Cancelled: ${reason}`;
  return this.save();
};

const Booking = mongoose.models.Booking || mongoose.model<Booking>('Booking', bookingSchema);

export default Booking; 