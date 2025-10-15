import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LanguageCode = 'en' | 'nl';

export type BookingTranslations = Record<string, string>;

interface BookingLanguageState {
  translations: {
    en: BookingTranslations;
    nl: BookingTranslations;
  };
}

const initialState: BookingLanguageState = {
  translations: {
    en: {
      // Page header
      bookingManagement: 'Booking Management',
      bookingManagementDescription: 'Manage client bookings, schedule meetings, and track appointment status',
      refresh: 'Refresh',
      
      // Statistics Cards
      totalBookings: 'Total Bookings',
      allTime: 'All time',
      pending: 'Pending',
      awaitingConfirmation: 'Awaiting confirmation',
      confirmed: 'Confirmed',
      readyToMeet: 'Ready to meet',
      completed: 'Completed',
      finishedMeetings: 'Finished meetings',
      
      // Tabs
      overview: 'Overview',
      upcoming: 'Upcoming',
      today: 'Today',
      allBookings: 'All Bookings',
      availability: 'Availability',
      
      // Overview Section
      next5Meetings: 'Next 5 Meetings',
      noUpcomingMeetings: 'No upcoming meetings',
      todaysSchedule: "Today's Schedule",
      noMeetingsScheduledForToday: 'No meetings scheduled for today',
      recentBookings: 'Recent Bookings',
      
      // Booking Details
      companyName: 'Company Name',
      clientName: 'Client Name',
      position: 'Position',
      companyEmail: 'Company Email',
      companyPhone: 'Company Phone',
      memberCount: 'Member Count',
      attendees: 'attendees',
      meetingPlatform: 'Meeting Platform',
      preferredDate: 'Preferred Date',
      preferredTime: 'Preferred Time',
      timezone: 'Timezone',
      additionalNotes: 'Additional Notes',
      status: 'Status',
      meetingLink: 'Meeting Link',
      assignedTo: 'Assigned To',
      source: 'Source',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      confirmedAt: 'Confirmed At',
      completedAt: 'Completed At',
      cancelledAt: 'Cancelled At',
      
      // Booking Status
      rescheduled: 'Rescheduled',
      cancelled: 'Cancelled',
      noShow: 'No Show',
      
      // Meeting Platforms
      zoom: 'Zoom',
      meet: 'Google Meet',
      skype: 'Skype',
      teams: 'Microsoft Teams',
      
      // Actions
      confirm: 'Confirm',
      confirming: 'Confirming...',
      view: 'View',
      delete: 'Delete',
      join: 'Join',
      joinMeeting: 'Join Meeting',
      markComplete: 'Mark Complete',
      updating: 'Updating...',
      
      // Booking Details Dialog
      bookingDetails: 'Booking Details',
      bookingInformation: 'Booking Information',
      contactInformation: 'Contact Information',
      meetingDetails: 'Meeting Details',
      notes: 'Notes',
      close: 'Close',
      
      // Filters and Search
      searchBookings: 'Search bookings...',
      filterByStatus: 'Filter by status',
      all: 'All',
      
      // Time and Date
      at: 'at',
      on: 'on',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      nextWeek: 'Next Week',
      thisMonth: 'This Month',
      nextMonth: 'Next Month',
      
      // Success Messages
      bookingConfirmed: 'Booking confirmed successfully',
      bookingCompleted: 'Booking completed successfully',
      bookingDeleted: 'Booking deleted successfully',
      bookingUpdated: 'Booking updated successfully',
      
      // Error Messages
      failedToFetchBookings: 'Failed to fetch bookings',
      failedToUpdateBooking: 'Failed to update booking',
      failedToDeleteBooking: 'Failed to delete booking',
      failedToConfirmBooking: 'Failed to confirm booking',
      failedToCompleteBooking: 'Failed to complete booking',
      
      // Confirmation Messages
      confirmDeleteBooking: 'Are you sure you want to delete this booking? This action cannot be undone.',
      
      // Loading States
      loadingBookings: 'Loading bookings...',
      updatingBooking: 'Updating booking...',
      deletingBooking: 'Deleting booking...',
      
      // Empty States
      noBookingsFound: 'No bookings found',
      noBookingsForToday: 'No bookings for today',
      noUpcomingBookings: 'No upcoming bookings',
      noRecentBookings: 'No recent bookings',
      
      // Statistics
      totalMeetings: 'Total Meetings',
      pendingMeetings: 'Pending Meetings',
      confirmedMeetings: 'Confirmed Meetings',
      completedMeetings: 'Completed Meetings',
      cancelledMeetings: 'Cancelled Meetings',
      rescheduledMeetings: 'Rescheduled Meetings',
      noShowMeetings: 'No Show Meetings',
      
      // Time Formats
      justNow: 'Just now',
      minutesAgo: '{minutes} minutes ago',
      hoursAgo: '{hours} hours ago',
      daysAgo: '{days} days ago',
      
      // Status Descriptions
      statusPending: 'Awaiting confirmation',
      statusConfirmed: 'Meeting confirmed',
      statusCompleted: 'Meeting completed',
      statusCancelled: 'Meeting cancelled',
      statusRescheduled: 'Meeting rescheduled',
      statusNoShow: 'Client did not show up',
      
      // Platform Descriptions
      platformZoom: 'Video conferencing via Zoom',
      platformMeet: 'Video conferencing via Google Meet',
      platformSkype: 'Video conferencing via Skype',
      platformTeams: 'Video conferencing via Microsoft Teams',
      
      // Additional
      // No additional keys needed
    },
    nl: {
      // Page header
      bookingManagement: 'Boeking Beheer',
      bookingManagementDescription: 'Beheer klantboekingen, plan vergaderingen en volg afsprakenstatus',
      refresh: 'Vernieuwen',
      
      // Statistics Cards
      totalBookings: 'Totaal Boekingen',
      allTime: 'Alle tijd',
      pending: 'In Afwachting',
      awaitingConfirmation: 'Wachtend op bevestiging',
      confirmed: 'Bevestigd',
      readyToMeet: 'Klaar om te vergaderen',
      completed: 'Voltooid',
      finishedMeetings: 'Afgeronde vergaderingen',
      
      // Tabs
      overview: 'Overzicht',
      upcoming: 'Aankomend',
      today: 'Vandaag',
      allBookings: 'Alle Boekingen',
      availability: 'Beschikbaarheid',
      
      // Overview Section
      next5Meetings: 'Volgende 5 Vergaderingen',
      noUpcomingMeetings: 'Geen aankomende vergaderingen',
      todaysSchedule: 'Schema van Vandaag',
      noMeetingsScheduledForToday: 'Geen vergaderingen gepland voor vandaag',
      recentBookings: 'Recente Boekingen',
      
      // Booking Details
      companyName: 'Bedrijfsnaam',
      clientName: 'Klantnaam',
      position: 'Functie',
      companyEmail: 'Bedrijfs E-mail',
      companyPhone: 'Bedrijfs Telefoon',
      memberCount: 'Aantal Leden',
      attendees: 'deelnemers',
      meetingPlatform: 'Vergaderplatform',
      preferredDate: 'Gewenste Datum',
      preferredTime: 'Gewenste Tijd',
      timezone: 'Tijdzone',
      additionalNotes: 'Extra Opmerkingen',
      status: 'Status',
      meetingLink: 'Vergaderlink',
      assignedTo: 'Toegewezen Aan',
      source: 'Bron',
      createdAt: 'Aangemaakt Op',
      updatedAt: 'Bijgewerkt Op',
      confirmedAt: 'Bevestigd Op',
      completedAt: 'Voltooid Op',
      cancelledAt: 'Geannuleerd Op',
      
      // Booking Status
      rescheduled: 'Herpland',
      cancelled: 'Geannuleerd',
      noShow: 'Niet Verschenen',
      
      // Meeting Platforms
      zoom: 'Zoom',
      meet: 'Google Meet',
      skype: 'Skype',
      teams: 'Microsoft Teams',
      
      // Actions
      confirm: 'Bevestigen',
      confirming: 'Bevestigen...',
      view: 'Bekijken',
      delete: 'Verwijderen',
      join: 'Deelnemen',
      joinMeeting: 'Deelnemen aan Vergadering',
      markComplete: 'Markeren als Voltooid',
      updating: 'Bijwerken...',
      
      // Booking Details Dialog
      bookingDetails: 'Boeking Details',
      bookingInformation: 'Boeking Informatie',
      contactInformation: 'Contact Informatie',
      meetingDetails: 'Vergader Details',
      notes: 'Opmerkingen',
      close: 'Sluiten',
      
      // Filters and Search
      searchBookings: 'Zoek boekingen...',
      filterByStatus: 'Filter op status',
      all: 'Alle',
      
      // Time and Date
      at: 'om',
      on: 'op',
      tomorrow: 'Morgen',
      thisWeek: 'Deze Week',
      nextWeek: 'Volgende Week',
      thisMonth: 'Deze Maand',
      nextMonth: 'Volgende Maand',
      
      // Success Messages
      bookingConfirmed: 'Boeking succesvol bevestigd',
      bookingCompleted: 'Boeking succesvol voltooid',
      bookingDeleted: 'Boeking succesvol verwijderd',
      bookingUpdated: 'Boeking succesvol bijgewerkt',
      
      // Error Messages
      failedToFetchBookings: 'Kan boekingen niet laden',
      failedToUpdateBooking: 'Kan boeking niet bijwerken',
      failedToDeleteBooking: 'Kan boeking niet verwijderen',
      failedToConfirmBooking: 'Kan boeking niet bevestigen',
      failedToCompleteBooking: 'Kan boeking niet voltooien',
      
      // Confirmation Messages
      confirmDeleteBooking: 'Weet u zeker dat u deze boeking wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.',
      
      // Loading States
      loadingBookings: 'Boekingen laden...',
      updatingBooking: 'Boeking bijwerken...',
      deletingBooking: 'Boeking verwijderen...',
      
      // Empty States
      noBookingsFound: 'Geen boekingen gevonden',
      noBookingsForToday: 'Geen boekingen voor vandaag',
      noUpcomingBookings: 'Geen aankomende boekingen',
      noRecentBookings: 'Geen recente boekingen',
      
      // Statistics
      totalMeetings: 'Totaal Vergaderingen',
      pendingMeetings: 'In Afwachting Vergaderingen',
      confirmedMeetings: 'Bevestigde Vergaderingen',
      completedMeetings: 'Voltooide Vergaderingen',
      cancelledMeetings: 'Geannuleerde Vergaderingen',
      rescheduledMeetings: 'Herplande Vergaderingen',
      noShowMeetings: 'Niet Verschenen Vergaderingen',
      
      // Time Formats
      justNow: 'Zojuist',
      minutesAgo: '{minutes} minuten geleden',
      hoursAgo: '{hours} uur geleden',
      daysAgo: '{days} dagen geleden',
      
      // Status Descriptions
      statusPending: 'Wachtend op bevestiging',
      statusConfirmed: 'Vergadering bevestigd',
      statusCompleted: 'Vergadering voltooid',
      statusCancelled: 'Vergadering geannuleerd',
      statusRescheduled: 'Vergadering herpland',
      statusNoShow: 'Klant is niet verschenen',
      
      // Platform Descriptions
      platformZoom: 'Videovergadering via Zoom',
      platformMeet: 'Videovergadering via Google Meet',
      platformSkype: 'Videovergadering via Skype',
      platformTeams: 'Videovergadering via Microsoft Teams',
      
      // Additional
      // No additional keys needed
    }
  }
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    // Add any specific reducers if needed in the future
  }
});

export default bookingSlice.reducer; 