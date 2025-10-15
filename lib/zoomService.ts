import axios from 'axios';

export interface ZoomMeeting {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  host_id: string;
  host_email: string;
  password?: string;
}

interface CreateMeetingData {
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  password?: string;
  settings: {
    host_video: boolean;
    participant_video: boolean;
    join_before_host: boolean;
    mute_upon_entry: boolean;
    use_pmi: boolean;
    approval_type: number;
    registration_type: number;
    audio: string;
    auto_recording: string;
  };
}

export class ZoomService {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://api.zoom.us/v2';
  private accessToken: string = '';
  private tokenExpiry: number | null = null;

  constructor(creds?: { accountId: string; clientId: string; clientSecret: string }) {
    // Get credentials: prefer explicit creds, fallback to env
    const accountId = creds?.accountId?.trim() || process.env.ZOOM_ACCOUNT_ID?.trim();
    const clientId = creds?.clientId?.trim() || process.env.ZOOM_CLIENT_ID?.trim();
    const clientSecret = creds?.clientSecret?.trim() || process.env.ZOOM_CLIENT_SECRET?.trim();

    // Validate presence of credentials
    if (!accountId || !clientId || !clientSecret) {
      console.error('❌ Missing Zoom credentials:');
      console.error('- ZOOM_ACCOUNT_ID:', accountId ? '✅' : '❌');
      console.error('- ZOOM_CLIENT_ID:', clientId ? '✅' : '❌');
      console.error('- ZOOM_CLIENT_SECRET:', clientSecret ? '✅' : '❌');
      throw new Error('Missing required Zoom credentials. Please check your .env.local file.');
    }

    // Validate credential format
    if (accountId.includes(' ') || clientId.includes(' ') || clientSecret.includes(' ')) {
      throw new Error('Zoom credentials contain spaces. Please ensure there are no spaces in the credentials in your .env.local file.');
    }

    // Basic format validation
    if (accountId.length < 20 || clientId.length < 20 || clientSecret.length < 20) {
      throw new Error('Zoom credentials appear to be invalid. Please check the format and length of your credentials.');
    }

    this.accountId = accountId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    console.log('✅ Zoom credentials loaded and validated:');
    console.log(`Account ID: ${this.accountId.substring(0, 5)}...`);
    console.log(`Client ID: ${this.clientId.substring(0, 5)}...`);
  }

  /**
   * Get OAuth access token for Zoom API using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    try {
      console.log('🔄 Getting Zoom access token...');
      
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.log('✅ Using existing valid token');
        return this.accessToken;
      }

      // Double check credentials
      if (!this.accountId || !this.clientId || !this.clientSecret) {
        throw new Error('Missing required Zoom credentials');
      }

      if (this.accountId.includes(' ') || this.clientId.includes(' ') || this.clientSecret.includes(' ')) {
        throw new Error('Credentials contain spaces - please check your .env.local file');
      }

      console.log('📝 Preparing token request...');
      console.log(`Account ID: ${this.accountId.substring(0, 5)}...`);
      console.log(`Client ID: ${this.clientId.substring(0, 5)}...`);

      // Create form data
      const formData = new URLSearchParams();
      formData.append('grant_type', 'account_credentials');
      formData.append('account_id', this.accountId);

      // Base64 encode credentials
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      console.log('🚀 Sending token request to Zoom...');
      
      // Log request details (without sensitive data)
      console.log('Request details:', {
        url: 'https://zoom.us/oauth/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic [HIDDEN]'
        },
        data: {
          grant_type: 'account_credentials',
          account_id: `${this.accountId.substring(0, 5)}...`
        }
      });

      // Get new access token using OAuth 2.0 spec format
      const response = await axios({
        method: 'POST',
        url: 'https://zoom.us/oauth/token',
        data: formData,
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('📥 Received response from Zoom');
      
      if (!response.data || !response.data.access_token) {
        console.error('❌ Invalid response from Zoom OAuth:', response.data);
        throw new Error('Failed to get access token from Zoom');
      }

      this.accessToken = response.data.access_token;
      // Set token expiry (subtract 5 minutes for safety)
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 300000;

      console.log('✅ New Zoom access token obtained successfully');
      console.log(`Token expires in: ${Math.floor(response.data.expires_in / 60)} minutes`);
      
      return this.accessToken;

    } catch (error: any) {
      console.error('❌ Failed to get Zoom access token:', error.response?.data || error.message);
      
      // Enhanced error logging
      if (error.response?.data) {
        console.error('Error details:', JSON.stringify(error.response.data, null, 2));
        
        // Specific error handling for common issues
        if (error.response.data.error === 'invalid_client') {
          console.error('This usually means the Client ID or Client Secret is incorrect or malformed.');
          console.error('Please check:');
          console.error('1. No spaces in the credentials');
          console.error('2. Credentials are properly copied from Zoom');
          console.error('3. Each credential is on its own line in .env.local');
        }
      }

      console.error('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: {
          ...error.config?.headers,
          Authorization: '[HIDDEN]' // Don't log actual auth token
        }
      });

      throw new Error(`Failed to authenticate with Zoom API: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Create a new Zoom meeting
   */
  async createMeeting(
    topic: string,
    startTime: string,
    duration: number = 60,
    timezone: string = 'UTC',
    clientEmail?: string
  ): Promise<ZoomMeeting> {
    try {
      console.log('🎯 Creating Zoom meeting...');
      console.log(`Topic: ${topic}`);
      console.log(`Start Time: ${startTime}`);
      
      const accessToken = await this.getAccessToken();
      
      // Prepare meeting settings
      const meetingData: CreateMeetingData = {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration,
        timezone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          use_pmi: false,
          approval_type: 2, // No registration required
          registration_type: 1,
          audio: 'both',
          auto_recording: 'none'
        }
      };

      console.log('📤 Sending create meeting request to Zoom...');
      
      // Create meeting
      const response = await axios.post(
        `${this.baseUrl}/users/me/meetings`,
        meetingData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📥 Received meeting creation response');
      
      if (!response.data) {
        throw new Error('No meeting data received from Zoom');
      }

      const meeting = response.data;
      console.log(`✅ Zoom meeting created: ${meeting.id} for ${topic}`);
      console.log(`Join URL: ${meeting.join_url}`);

      return {
        id: meeting.id.toString(),
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        join_url: meeting.join_url,
        host_id: meeting.host_id,
        host_email: meeting.host_email,
        password: meeting.password
      };

    } catch (error: any) {
      console.error('❌ Failed to create Zoom meeting:', error.response?.data || error.message);
      console.error('Full error:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();

      await axios.delete(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log(`✅ Zoom meeting deleted: ${meetingId}`);
      return true;

    } catch (error: any) {
      console.error('❌ Failed to delete Zoom meeting:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Update a Zoom meeting
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<CreateMeetingData>
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();

      await axios.patch(
        `${this.baseUrl}/meetings/${meetingId}`,
        updates,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Zoom meeting updated: ${meetingId}`);
      return true;

    } catch (error: any) {
      console.error('❌ Failed to update Zoom meeting:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string): Promise<ZoomMeeting | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const meeting = response.data;
      
      return {
        id: meeting.id.toString(),
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        join_url: meeting.join_url,
        host_id: meeting.host_id,
        host_email: meeting.host_email,
        password: meeting.password
      };

    } catch (error: any) {
      console.error('❌ Failed to get Zoom meeting:', error.response?.data || error.message);
      return null;
    }
  }
}

export const zoomService = new ZoomService(); 