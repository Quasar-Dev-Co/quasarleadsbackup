import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CompanySettings from '@/models/companySettingsSchema';

// MongoDB connection and collection
let db: any = null;
let settingsCollection: any = null;

async function initDb() {
  if (!db) {
    const connection = await dbConnect();
    db = connection.connection.db;
    settingsCollection = db.collection('companySettings');
  }
  return { db, settingsCollection };
}

/**
 * GET - Load company settings (user-specific or default)
 */
export async function GET(request: NextRequest) {
  try {
    await initDb();
    
    // Get userId from query or header
    const queryUserId = request.nextUrl.searchParams.get('userId');
    const headerUserId = request.headers.get('x-user-id');
    const userId = queryUserId || headerUserId || null;
    
    let settings: any = null;
    
    // Try to get user-specific settings first
    if (userId) {
      settings = await CompanySettings.findOne({ userId }).lean();
      console.log(`🔍 User-specific company settings lookup for userId: ${userId} - ${settings ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Fallback to default settings if no user-specific settings found
    let defaultSettings: any = null;
    if (!settings) {
      defaultSettings = await CompanySettings.findOne({ type: 'default' }).lean();
      console.log(`🔍 Global company settings lookup - ${defaultSettings ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    if (!settings && !defaultSettings) {
      // Create default settings if none exist
      const defaultEmailTimings = [
        { stage: 'called_once', delay: 0, unit: 'minutes', description: 'Send immediately' },
        { stage: 'called_twice', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_three_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_four_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_five_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_six_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_seven_times', delay: 7, unit: 'days', description: 'Send after 7 days' }
      ];
      
      const newDefaultSettings = {
        type: 'default',
        companyName: 'QuasarLeads',
        service: 'AI-powered lead generation',
        industry: 'Technology',
        senderName: 'QuasarLeads Team',
        senderEmail: process.env.GMAIL_USER || '',
        websiteUrl: 'https://quasarleads.com',
        logoUrl: '',
        defaultOutreachRecipient: 'lead',
        defaultSenderIdentity: 'company',
        emailTimings: defaultEmailTimings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Ensure a default fallback exists using the model
      const created = await CompanySettings.create(newDefaultSettings);
      defaultSettings = created.toObject();
    }

    // If userId provided but no user-specific settings exist, seed a new doc from defaults
    if (userId && !settings) {
      const seed = defaultSettings || await CompanySettings.findOne({ type: 'default' }).lean();
      const seededUserSettings = await CompanySettings.findOneAndUpdate(
        { userId },
        {
          $setOnInsert: {
            userId,
            companyName: seed?.companyName || 'QuasarLeads',
            service: seed?.service || 'AI-powered lead generation',
            industry: seed?.industry || '',
            senderName: seed?.senderName || 'QuasarLeads Team',
            senderEmail: seed?.senderEmail || (process.env.GMAIL_USER || ''),
            websiteUrl: seed?.websiteUrl || 'https://quasarleads.com',
            logoUrl: seed?.logoUrl || '',
            defaultOutreachRecipient: seed?.defaultOutreachRecipient || 'lead',
            defaultSenderIdentity: seed?.defaultSenderIdentity || 'company',
            emailTimings: seed?.emailTimings || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      settings = seededUserSettings;
    }

    // Choose the response settings: user-specific if present, otherwise default
    const responseSettings = settings || defaultSettings;

    // Remove MongoDB-specific fields  
    const { _id, type, userId: settingsUserId, createdAt, updatedAt, ...cleanSettings } = responseSettings;

    return NextResponse.json({
      success: true,
      settings: cleanSettings,
      isUserSpecific: !!settingsUserId // Let frontend know if this is user-specific
    });

  } catch (error: any) {
    console.error('Error loading company settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load company settings'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Save company settings (user-specific)
 */
export async function POST(request: NextRequest) {
  try {
    await initDb();
    
    const body = await request.json();
    const { 
      userId,  // NEW: Get userId from request body
      companyName, 
      service, 
      industry, 
      senderName, 
      senderEmail, 
      websiteUrl, 
      logoUrl,
      emailTimings,
      defaultOutreachRecipient,
      defaultSenderIdentity
    } = body;
    
    // Allow userId from header if not supplied in body
    const effectiveUserId = userId || request.headers.get('x-user-id') || null;

    // Validate required fields
    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required for user-specific settings' },
        { status: 400 }
      );
    }
    
    if (!companyName || !service) {
      return NextResponse.json(
        { success: false, error: 'Company name and service are required' },
        { status: 400 }
      );
    }

    const settingsData = {
      userId: effectiveUserId, // Save with user ID instead of type: 'default'
      companyName,
      service,
      industry: industry || '',
      senderName: senderName || companyName,
      senderEmail: senderEmail || process.env.GMAIL_USER || '',
      websiteUrl: websiteUrl || '',
      logoUrl: logoUrl || '',
      defaultOutreachRecipient: ['lead','company'].includes(defaultOutreachRecipient) ? defaultOutreachRecipient : 'lead',
      defaultSenderIdentity: ['company','author'].includes(defaultSenderIdentity) ? defaultSenderIdentity : 'company',
      emailTimings: emailTimings || [
        { stage: 'called_once', delay: 0, unit: 'minutes', description: 'Send immediately' },
        { stage: 'called_twice', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_three_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_four_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_five_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_six_times', delay: 7, unit: 'days', description: 'Send after 7 days' },
        { stage: 'called_seven_times', delay: 7, unit: 'days', description: 'Send after 7 days' }
      ],
      updatedAt: new Date().toISOString()
    };

    // Update or create user-specific settings
    await CompanySettings.updateOne(
      { userId: effectiveUserId },
      { 
        $set: settingsData,
        $setOnInsert: { createdAt: new Date().toISOString() }
      },
      { upsert: true }
    );

    // Update environment variables if email settings changed
    if (senderEmail && senderEmail !== process.env.GMAIL_USER) {
      console.log(`Note: Sender email updated to ${senderEmail}. Update environment variables if needed.`);
    }

    return NextResponse.json({
      success: true,
      message: `User-specific company settings saved successfully for userId: ${userId}`,
      settings: settingsData,
      isUserSpecific: true
    });

  } catch (error: any) {
    console.error('Error saving company settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to save company settings'
      },
      { status: 500 }
    );
  }
} 