import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';

// Shape of stored credentials (all optional strings)
type Credentials = Partial<{
  SERPAPI_KEY: string;
  OPENAI_API_KEY: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  IMAP_HOST: string;
  IMAP_PORT: string;
  IMAP_USER: string;
  IMAP_PASSWORD: string;
  ZOOM_EMAIL: string;
  ZOOM_PASSWORD: string;
  ZOOM_ACCOUNT_ID: string;
  ZOOM_CLIENT_ID: string;
  ZOOM_CLIENT_SECRET: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  GOOGLE_CALENDAR_ID: string;
}>;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const authHeader = request.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';

    let user;
    if (userId) {
      user = await User.findById(userId, { password: 0 });
    }
    
    // Only fall back to admin user if no specific user is authenticated
    if (!user && !userId) {
      user = await User.findOne({ admin: true }, { password: 0 });
    }
    
    if (!user) {
      return NextResponse.json({ success: true, credentials: {} });
    }

    return NextResponse.json({ success: true, credentials: (user as any).credentials || {} });
  } catch (error: any) {
    console.error('Error loading credentials:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load credentials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = (await request.json()) as { credentials?: Credentials } | Credentials;

    const credentials: Credentials = 'credentials' in body ? (body as any).credentials : (body as any);

    if (!credentials || typeof credentials !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials payload' },
        { status: 400 }
      );
    }

    const allowedKeys: (keyof Credentials)[] = [
      'SERPAPI_KEY',
      'OPENAI_API_KEY',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'IMAP_HOST',
      'IMAP_PORT',
      'IMAP_USER',
      'IMAP_PASSWORD',
      'ZOOM_EMAIL',
      'ZOOM_PASSWORD',
      'ZOOM_ACCOUNT_ID',
      'ZOOM_CLIENT_ID',
      'ZOOM_CLIENT_SECRET',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
      'GOOGLE_CALENDAR_ID',
    ];

    const sanitized: Credentials = {};
    for (const key of allowedKeys) {
      if (key in credentials && typeof (credentials as any)[key] !== 'undefined') {
        (sanitized as any)[key] = String((credentials as any)[key] ?? '');
      }
    }

    // Identify current user from Authorization header: Bearer <userId>
    const authHeader = request.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';

    let user;
    if (userId) {
      user = await User.findById(userId);
    }
    
    // Only fall back to admin user if no specific user is authenticated
    if (!user && !userId) {
      user = await User.findOne({ admin: true });
    }
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found to attach credentials' },
        { status: 404 }
      );
    }

    user.credentials = {
      ...(user.credentials || {}),
      ...sanitized,
    } as any;
    await user.save();

    return NextResponse.json({ success: true, message: 'Credentials saved' });
  } catch (error: any) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save credentials' },
      { status: 500 }
    );
  }
}


