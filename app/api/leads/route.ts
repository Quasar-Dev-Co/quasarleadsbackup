import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

/**
 * GET handler for retrieving leads with filtering
 */
export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const highValue = url.searchParams.get('highValue');
  const limit = url.searchParams.get('limit');
  const userId = url.searchParams.get('userId'); // Get user ID from query params
  
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required to view leads' },
      { status: 401 }
    );
  }
  
  let query: any = {
    $or: [
      { assignedTo: userId }, // Leads assigned to this user
      { leadsCreatedBy: userId } // Leads created by this user
    ]
  };
  
  if (status) query.status = { $in: status.split(',') };
  if (highValue === 'true') {
    query.$and = [
      {
        $or: [
          { isHighValue: true },
          { 
            googleAds: true,
            $or: [
              { organicRanking: { $gt: 10 } },
              { organicRanking: { $exists: false } }
            ]
          }
        ]
      }
    ];
  }
  
  // Build the query - FILTER BY USER ID
  let leadQuery = Lead.find(query).sort({ createdAt: -1 });
  
  // Only apply limit if specified, otherwise return all leads
  if (limit && !isNaN(parseInt(limit))) {
    leadQuery = leadQuery.limit(parseInt(limit));
  }
  
  const leads = await leadQuery.exec();
  
  return NextResponse.json({ 
    success: true,
    leads,
    total: leads.length,
    hasMore: false // Since we're returning all leads
  });
}

/**
 * POST handler for creating new leads
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const {
      name,
      company,
      companyOwner,
      location,
      website,
      email,
      phone,
      linkedinProfile,
      status = 'active',
      notes,
      tags = [],
      source = 'manual',
      industry,
      googleAds = false,
      organicRanking,
      isHighValue = false,
      dealValue,
      probability
    } = body;

    // Validate required fields
    if (!name || !company || !email) {
      return NextResponse.json(
        { success: false, error: 'Name, company, and email are required' },
        { status: 400 }
      );
    }

    // Check if lead with same email already exists
    const existingLead = await Lead.findOne({ email });
    if (existingLead) {
      return NextResponse.json(
        { success: false, error: 'A lead with this email already exists' },
        { status: 400 }
      );
    }

    // Get current user ID from request headers or session
    const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Create new lead document
    const leadData = {
      name,
      company,
      companyOwner: companyOwner || '',
      location,
      website: website || '',
      email,
      phone: phone || '',
      linkedinProfile: linkedinProfile || '',
      status,
      notes: notes || '',
      tags,
      source,
      industry: industry || '',
      googleAds,
      organicRanking: organicRanking || null,
      isHighValue,
      dealValue: dealValue || 0,
      probability: probability || 25,
      assignedTo: userId, // Assign to current user
      leadsCreatedBy: userId, // User ID who created this lead
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newLead = new Lead(leadData);
    const savedLead = await newLead.save();

    return NextResponse.json({
      success: true,
      lead: savedLead,
      message: 'Lead created successfully and assigned to current user'
    });

  } catch (error: any) {
    console.error('Error creating lead:', error);

    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern?.email) {
      return NextResponse.json(
        { success: false, error: 'A lead with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create lead'
      },
      { status: 500 }
    );
  }
}