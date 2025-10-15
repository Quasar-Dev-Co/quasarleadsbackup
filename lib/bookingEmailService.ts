import { emailService } from './emailService';
import { ZoomMeeting } from './zoomService';
import CompanySettings from '@/models/companySettingsSchema';

interface BookingData {
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  clientName: string;
  position: string;
  memberCount: string;
  meetingPlatform: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  additionalNotes?: string;
}

interface ConfirmationData extends BookingData {
  meetingLink: string;
  actualMeetingDate: string;
  actualMeetingTime: string;
  zoomMeeting?: ZoomMeeting;
}

export class BookingEmailService {
  /**
   * Load company settings for a user; fallback to global default
   */
  private async getCompanySettings(userId?: string): Promise<any> {
    try {
      if (userId) {
        const userSettings = await CompanySettings.findOne({ userId }).lean();
        if (userSettings) return userSettings;
      }
      const defaultSettings = await CompanySettings.findOne({ type: 'default' }).lean();
      return defaultSettings || {};
    } catch (e) {
      return {};
    }
  }
  /**
   * Send initial booking acknowledgment email (24-hour response promise)
   */
  async sendBookingAcknowledgment(booking: BookingData, userId?: string): Promise<boolean> {
    try {
      const settings = await this.getCompanySettings(userId);
      const brandName = settings?.companyName || 'QuasarLeads';
      const brandService = settings?.service || 'AI-powered lead generation';
      const senderName = settings?.senderName || 'QuasarLeads Team';
      const senderEmail = settings?.senderEmail || 'info@quasarseo.nl';
      const websiteUrl = settings?.websiteUrl || 'https://quasarleads.com';

      const subject = `Meeting Request Received - We'll Respond Within 24 Hours`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${brandName}</h2>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">${brandService}</p>
            </div>

            <!-- Main Content -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #1e293b; margin-bottom: 20px;">Dear ${booking.clientName},</h3>
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                Thank you for requesting a meeting with our team. We have successfully received your booking request and are reviewing the details.
              </p>

              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #1e293b; margin: 0 0 15px 0;">Meeting Request Details:</h4>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Company:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${booking.companyName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Contact Person:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${booking.clientName} (${booking.position})</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Preferred Date:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${this.formatDate(booking.preferredDate)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Preferred Time:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${booking.preferredTime} (${booking.timezone})</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Team Size:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${booking.memberCount} member${booking.memberCount === '1' ? '' : 's'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Platform:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${this.capitalizeFirst(booking.meetingPlatform)}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #166534; font-weight: 600;">
                  📅 <strong>Next Steps:</strong> Our team will review your request and respond within the next 24 hours with:
                </p>
                <ul style="margin: 10px 0 0 20px; color: #166534;">
                  <li>Meeting confirmation and final scheduling details</li>
                  <li>Personalized meeting link and access information</li>
                  <li>Agenda preview and preparation materials</li>
                </ul>
              </div>

              <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                In the meantime, feel free to explore our services or reach out if you have any questions about your upcoming meeting.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${websiteUrl}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Visit Our Platform
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
                Best regards,<br>
                <strong>${senderName}</strong>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                📧 ${senderEmail} | 🌐 ${websiteUrl}<br>
                ${brandService}
              </p>
            </div>
          </div>
        </div>
      `;

      const textContent = `
Dear ${booking.clientName},

Thank you for requesting a meeting with our QuasarLeads team. We have successfully received your booking request.

MEETING REQUEST DETAILS:
Company: ${booking.companyName}
Contact Person: ${booking.clientName} (${booking.position})
Preferred Date: ${this.formatDate(booking.preferredDate)}
Preferred Time: ${booking.preferredTime} (${booking.timezone})
Team Size: ${booking.memberCount} member${booking.memberCount === '1' ? '' : 's'}
Platform: ${this.capitalizeFirst(booking.meetingPlatform)}

NEXT STEPS:
Our team will review your request and respond within the next 24 hours with:
- Meeting confirmation and final scheduling details
- Personalized meeting link and access information
- Agenda preview and preparation materials

In the meantime, feel free to explore our services at https://text-gpt-test.vercel.app or reach out if you have any questions.

Best regards,
The QuasarLeads Team
info@quasarseo.nl
Professional AI-Powered Lead Generation Services
      `;

      const payload = {
        to: booking.companyEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
      };
      const result = userId
        ? await emailService.sendEmailForUser(userId, payload)
        : await emailService.sendEmail(payload);

      if (result.success) {
        console.log(`✅ Booking acknowledgment sent to ${booking.companyEmail}`);
        return true;
      } else {
        console.error(`❌ Failed to send booking acknowledgment: ${result.error}`);
        return false;
      }

    } catch (error: any) {
      console.error('❌ Error sending booking acknowledgment:', error.message);
      return false;
    }
  }

  /**
   * Send meeting confirmation email with Zoom link and details
   */
  async sendMeetingConfirmation(confirmation: ConfirmationData, userId?: string): Promise<boolean> {
    try {
      const settings = await this.getCompanySettings(userId);
      const brandName = settings?.companyName || 'Quasar SEO';
      const brandService = settings?.service || 'Professionele Leadgeneratie Services';
      const senderName = settings?.senderName || `${brandName} Team`;
      const senderEmail = settings?.senderEmail || 'info@quasarseo.nl';
      const websiteUrl = settings?.websiteUrl || 'https://quasarleads.com';

      const subject = `Meeting Confirmed: ${confirmation.companyName} - ${this.formatDate(confirmation.actualMeetingDate)}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${brandName}</h2>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">${brandService}</p>
            </div>

            <!-- Confirmation Banner -->
            <div style="background-color: #dcfce7; border: 2px solid #22c55e; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
              <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 20px;">🎉 Vergadering Bevestigd!</h3>
              <p style="color: #166534; margin: 0; font-size: 16px;">Je vergadering is ingepland en klaar om te gaan.</p>
            </div>

            <!-- Main Content -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #1e293b; margin-bottom: 20px;">Beste ${confirmation.clientName},</h3>
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                Goed nieuws! We hebben je vergaderverzoek bevestigd en kijken ernaar uit om te bespreken hoe QuasarLeads jouw zakelijke groei kan versnellen.
              </p>

              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #1e293b; margin: 0 0 15px 0;">📅 Vergaderdetails:</h4>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Datum & Tijd:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${this.formatDate(confirmation.actualMeetingDate)} om ${confirmation.actualMeetingTime}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Duur:</td>
                    <td style="padding: 8px 0; color: #1e293b;">60 minuten</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Tijdzone:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${confirmation.timezone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #475569;">Deelnemers:</td>
                    <td style="padding: 8px 0; color: #1e293b;">${confirmation.memberCount} van ${confirmation.companyName}</td>
                  </tr>
                </table>
              </div>

              ${confirmation.zoomMeeting ? `
              <div style="background-color: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #1e40af; margin: 0 0 15px 0;">🔗 Zoom Vergadering Toegang:</h4>
                <div style="margin-bottom: 15px;">
                  <strong style="color: #1e40af;">Deelnamelink:</strong><br>
                  <a href="${confirmation.zoomMeeting.join_url}" style="color: #2563eb; word-break: break-all;">
                    ${confirmation.zoomMeeting.join_url}
                  </a>
                </div>
                <div style="margin-bottom: 10px;">
                  <strong style="color: #1e40af;">Vergader-ID:</strong> ${confirmation.zoomMeeting.id}
                </div>
                ${confirmation.zoomMeeting.password ? `
                <div style="margin-bottom: 10px;">
                  <strong style="color: #1e40af;">Wachtwoord:</strong> ${confirmation.zoomMeeting.password}
                </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 15px;">
                  <a href="${confirmation.zoomMeeting.join_url}" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    Deelnemen aan Zoom Vergadering
                  </a>
                </div>
              </div>
              ` : ''}

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #92400e; margin: 0 0 10px 0;">📋 Vergaderagenda:</h4>
                <ul style="margin: 0; color: #92400e;">
                  <li>Introductie en bedrijfsoverzicht (10 min)</li>
                  <li>Bespreking van huidige leadgeneratie-uitdagingen (15 min)</li>
                  <li>Presentatie van QuasarLeads AI-oplossingen (20 min)</li>
                  <li>Aangepaste strategie-aanbevelingen (10 min)</li>
                  <li>Q&A en volgende stappen (5 min)</li>
                </ul>
              </div>

              <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                <strong>Kom alstublieft voorbereid met:</strong>
              </p>
              <ul style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                <li>Huidige methoden voor leadgeneratie en uitdagingen</li>
                <li>Doelgroep en ideale klantprofiel</li>
                <li>Maandelijkse doelen voor leadgeneratie en budgetbereik</li>
                <li>Eventuele specifieke vragen over onze AI-aangedreven services</li>
              </ul>

              <p style="color: #475569; line-height: 1.6;">
                We kijken uit naar ons gesprek en het helpen van ${confirmation.companyName} om opmerkelijke groei te bereiken!
              </p>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
                Met vriendelijke groet,<br>
                <strong>${senderName}</strong>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                📧 ${senderEmail} | 🌐 ${websiteUrl}<br>
                ${brandService}
              </p>
            </div>
          </div>
        </div>
      `;

      const textContent = `
Dear ${confirmation.clientName},

MEETING CONFIRMED! 🎉

We've confirmed your meeting request and are excited to discuss how ${brandName} can help accelerate your business growth.

MEETING DETAILS:
Date & Time: ${this.formatDate(confirmation.actualMeetingDate)} at ${confirmation.actualMeetingTime}
Duration: 60 minutes
Timezone: ${confirmation.timezone}
Attendees: ${confirmation.memberCount} from ${confirmation.companyName}

${confirmation.zoomMeeting ? `
ZOOM MEETING ACCESS:
Join Link: ${confirmation.zoomMeeting.join_url}
Meeting ID: ${confirmation.zoomMeeting.id}
${confirmation.zoomMeeting.password ? `Password: ${confirmation.zoomMeeting.password}` : ''}
` : ''}

MEETING AGENDA:
- Introduction and business overview (10 min)
- Current lead generation challenges discussion (15 min)
- QuasarLeads AI-powered solutions presentation (20 min)
- Custom strategy recommendations (10 min)
- Q&A and next steps (5 min)

PLEASE COME PREPARED WITH:
- Current lead generation methods and challenges
- Target audience and ideal customer profile
- Monthly lead generation goals and budget range
- Any specific questions about our AI-powered services

Looking forward to our conversation and helping ${confirmation.companyName} achieve remarkable growth!

Best regards,
${senderName}
${senderEmail}
      `;

      const payload = {
        to: confirmation.companyEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
      };
      const result = userId
        ? await emailService.sendEmailForUser(userId, payload)
        : await emailService.sendEmail(payload);

      if (result.success) {
        console.log(`✅ Meeting confirmation sent to ${confirmation.companyEmail}`);
        return true;
      } else {
        console.error(`❌ Failed to send meeting confirmation: ${result.error}`);
        return false;
      }

    } catch (error: any) {
      console.error('❌ Error sending meeting confirmation:', error.message);
      return false;
    }
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const bookingEmailService = new BookingEmailService(); 