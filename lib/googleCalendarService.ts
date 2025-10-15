import { google } from 'googleapis';

type CreateEventInput = {
  summary: string;
  description?: string;
  startDateTimeISO: string; // ISO string
  endDateTimeISO: string;   // ISO string
  timeZone: string;
  attendees?: Array<{ email: string; displayName?: string }>; // optional; may be ignored without DWD
};

export class GoogleCalendarService {
  private calendar;
  private calendarId: string;

  constructor(creds?: { clientEmail?: string; privateKey?: string; calendarId?: string }) {
    const clientEmail = (creds?.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
    const privateKeyRaw = (creds?.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();
    const calendarId = (creds?.calendarId || process.env.GOOGLE_CALENDAR_ID || '').trim();

    if (!clientEmail || !privateKeyRaw || !calendarId) {
      throw new Error('Missing Google Calendar credentials. Please provide client email, private key, and calendar ID.');
    }

    // Private key may be stored with escaped newlines; fix them
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    const jwt = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth: jwt });
    this.calendarId = calendarId;
  }

  async createEvent(input: CreateEventInput): Promise<{ id: string; htmlLink?: string }> {
    const event: any = {
      summary: input.summary,
      description: input.description || '',
      start: {
        dateTime: input.startDateTimeISO,
        timeZone: input.timeZone,
      },
      end: {
        dateTime: input.endDateTimeISO,
        timeZone: input.timeZone,
      },
      reminders: {
        useDefault: true,
      },
    };

    // Attendees require domain-wide delegation when used by service accounts.
    // Only include if explicitly allowed via env; otherwise avoid to prevent errors.
    const allowAttendees = String(process.env.GOOGLE_CALENDAR_INVITE_ATTENDEES || '').toLowerCase() === 'true';
    if (allowAttendees && input.attendees && input.attendees.length > 0) {
      event.attendees = input.attendees.map((a) => ({ email: a.email, displayName: a.displayName }));
    }

    const res = await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: event,
      sendUpdates: allowAttendees ? 'all' : 'none',
    });

    const created = res.data || {} as any;
    return { id: created.id as string, htmlLink: created.htmlLink as string | undefined };
  }
}

export const googleCalendarService = new GoogleCalendarService();


