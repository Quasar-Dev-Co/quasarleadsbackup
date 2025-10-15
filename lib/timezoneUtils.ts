// Timezone conversion utilities for booking system
// Admin works in NL timezone (Europe/Amsterdam)
// Clients book in their own timezone

export const NL_TIMEZONE = 'Europe/Amsterdam';

/**
 * Convert time from one timezone to another
 */
export function convertTimeZone(
  date: Date,
  fromTimezone: string,
  toTimezone: string
): Date {
  // Create a date in the source timezone
  const sourceDate = new Date(date.toLocaleString("en-US", { timeZone: fromTimezone }));
  const targetDate = new Date(date.toLocaleString("en-US", { timeZone: toTimezone }));
  
  // Calculate the difference
  const diff = targetDate.getTime() - sourceDate.getTime();
  
  // Apply the difference to the original date
  return new Date(date.getTime() + diff);
}

/**
 * Convert time from client timezone to NL timezone
 */
export function convertToNLTime(date: Date, clientTimezone: string): Date {
  return convertTimeZone(date, clientTimezone, NL_TIMEZONE);
}

/**
 * Convert time from NL timezone to client timezone
 */
export function convertFromNLTime(date: Date, clientTimezone: string): Date {
  return convertTimeZone(date, NL_TIMEZONE, clientTimezone);
}

/**
 * Get time slots for a specific day in NL timezone
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number,
  bufferTime: number = 0
): string[] {
  const slots: string[] = [];
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  let currentMinutes = startMinutes;
  
  while (currentMinutes + slotDuration <= endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;
    
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    
    currentMinutes += slotDuration + bufferTime;
  }
  
  return slots;
}

/**
 * Check if a time slot is available (not booked)
 */
export function isTimeSlotAvailable(
  requestedDateTime: Date,
  slotDuration: number,
  bookedSlots: Date[]
): boolean {
  const requestedStart = requestedDateTime.getTime();
  const requestedEnd = requestedStart + (slotDuration * 60 * 1000);
  
  for (const bookedSlot of bookedSlots) {
    const bookedStart = bookedSlot.getTime();
    const bookedEnd = bookedStart + (slotDuration * 60 * 1000);
    
    // Check for overlap
    if (
      (requestedStart >= bookedStart && requestedStart < bookedEnd) ||
      (requestedEnd > bookedStart && requestedEnd <= bookedEnd) ||
      (requestedStart <= bookedStart && requestedEnd >= bookedEnd)
    ) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get available time slots for a specific date in client timezone
 */
export function getAvailableSlots(
  date: Date,
  dayAvailability: any,
  slotDuration: number,
  bufferTime: number,
  bookedSlots: Date[],
  clientTimezone: string
): string[] {
  if (!dayAvailability || !dayAvailability.isAvailable) {
    return [];
  }
  
  const availableSlots: string[] = [];
  
  for (const timeSlot of dayAvailability.timeSlots) {
    const slots = generateTimeSlots(
      timeSlot.start,
      timeSlot.end,
      slotDuration,
      bufferTime
    );
    
    for (const slot of slots) {
      // Create date in NL timezone
      const nlDateTime = new Date(date);
      const [hour, minute] = slot.split(':').map(Number);
      nlDateTime.setHours(hour, minute, 0, 0);
      
      // Check if slot is available
      if (isTimeSlotAvailable(nlDateTime, slotDuration, bookedSlots)) {
        // Convert to client timezone for display
        const clientDateTime = convertFromNLTime(nlDateTime, clientTimezone);
        const clientTimeString = clientDateTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        availableSlots.push(`${clientTimeString} (${slot} NL time)`);
      }
    }
  }
  
  return availableSlots;
}

/**
 * Parse timezone offset from timezone string
 */
export function parseTimezoneOffset(timezone: string): number {
  const match = timezone.match(/UTC([+-]\d{2}):(\d{2})/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display
 */
export function formatTimeForDisplay(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
} 