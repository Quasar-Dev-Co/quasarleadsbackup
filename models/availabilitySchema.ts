import mongoose, { Document, Schema } from 'mongoose';

interface TimeSlot {
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

interface DayAvailability {
  day: string; // 'monday', 'tuesday', etc.
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface Availability extends Document {
  userId: string;
  workingDays: DayAvailability[];
  timezone: string; // Always "Europe/Amsterdam" for NL
  slotDuration: number; // Duration in minutes (e.g., 30, 60)
  bufferTime: number; // Buffer time between meetings in minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timeSlotSchema = new Schema<TimeSlot>({
  start: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:MM format'
    }
  },
  end: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:MM format'
    }
  }
});

const dayAvailabilitySchema = new Schema<DayAvailability>({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  timeSlots: {
    type: [timeSlotSchema],
    default: []
  }
});

const availabilitySchema = new Schema<Availability>({
  userId: {
    type: String,
    required: true
  },
  workingDays: {
    type: [dayAvailabilitySchema],
    required: true,
    default: [
      { day: 'monday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      { day: 'tuesday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      { day: 'wednesday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      { day: 'thursday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      { day: 'friday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      { day: 'saturday', isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      { day: 'sunday', isAvailable: false, timeSlots: [] }
    ]
  },
  timezone: {
    type: String,
    required: true,
    default: 'Europe/Amsterdam'
  },
  slotDuration: {
    type: Number,
    required: true,
    default: 30, // 30 minutes
    min: 15,
    max: 120
  },
  bufferTime: {
    type: Number,
    required: true,
    default: 15, // 15 minutes buffer
    min: 0,
    max: 60
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one active availability setting per user
availabilitySchema.index({ userId: 1, isActive: 1 }, { unique: true });

export default mongoose.models.Availability || mongoose.model<Availability>('Availability', availabilitySchema); 