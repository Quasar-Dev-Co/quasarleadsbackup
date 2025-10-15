import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

// Helper function to get email timing settings
async function getEmailTimingSettings() {
  try {
    const connection = await dbConnect();
    const db = connection.connection.db;
    const settingsCollection = db.collection('companySettings');
    
    const settings = await settingsCollection.findOne({ type: 'default' });
    
    if (settings?.emailTimings) {
      return settings.emailTimings;
    }
    
    // Return YOUR configured timings as fallback
    return [
      { stage: 'called_once', delay: 0, unit: 'minutes', description: 'Send immediately' },
      { stage: 'called_twice', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_three_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_four_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_five_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_six_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_seven_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' }
    ];
  } catch (error) {
    console.error('Error loading email timing settings:', error);
    // Return YOUR configured timings on error
    return [
      { stage: 'called_once', delay: 0, unit: 'minutes', description: 'Send immediately' },
      { stage: 'called_twice', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_three_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_four_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_five_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_six_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' },
      { stage: 'called_seven_times', delay: 5, unit: 'minutes', description: 'Send after 5 minutes' }
    ];
  }
}

// Helper function to calculate email date based on timing settings
function calculateEmailDate(timingSettings: any[], stage: string): Date {
  const timing = timingSettings.find(t => t.stage === stage);
  
  if (!timing) {
    // Default to immediate send if no timing found
    return new Date();
  }
  
  const emailDate = new Date();
  
  switch (timing.unit) {
    case 'minutes':
      emailDate.setMinutes(emailDate.getMinutes() + timing.delay);
      break;
    case 'hours':
      emailDate.setHours(emailDate.getHours() + timing.delay);
      break;
    case 'days':
      emailDate.setDate(emailDate.getDate() + timing.delay);
      break;
    default:
      // Default to immediate send
      break;
  }
  
  return emailDate;
}

/**
 * GET handler for retrieving leads for CRM system
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Check if this is a request for a specific lead
    const leadId = searchParams.get('leadId');
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return NextResponse.json(
          { success: false, error: 'Lead not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        lead: {
          id: lead._id,
          name: lead.name,
          company: lead.company,
          position: lead.position,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          status: lead.status,
          notes: lead.notes,
          tags: lead.tags || [],
          activities: lead.activities || [],
          created_at: lead.createdAt,
          updated_at: lead.updatedAt,
          emailHistory: lead.emailHistory || [],
          emailAutomationEnabled: lead.emailAutomationEnabled,
          emailSequenceActive: lead.emailSequenceActive,
          emailSequenceStage: lead.emailSequenceStage,
          emailSequenceStep: lead.emailSequenceStep,
          nextScheduledEmail: lead.nextScheduledEmail,
          emailStoppedReason: lead.emailStoppedReason
        }
      });
    }
    
    // Continue with regular leads listing logic
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const sort = searchParams.get('sort') || 'updatedAt';
    const order = searchParams.get('order') || 'desc';
    const userId = searchParams.get('userId'); // Get user ID from query params
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required to view leads' },
        { status: 401 }
      );
    }
    
    // Build query - FILTER BY USER ID
    const query: any = {
      status: { $nin: ['archived'] }, // Exclude archived leads
      $or: [
        { assignedTo: userId }, // Leads assigned to this user
        { leadsCreatedBy: userId } // Leads created by this user
      ]
    };
    
    // Add stage filter (map CRM stages to database statuses)
    if (stage && stage !== 'all') {
      const stageMapping: { [key: string]: string[] } = {
        'new_leads': ['active'],
        'called_once': ['emailed'],
        'called_twice': ['emailed'],
        'called_three_times': ['emailed'],
        'called_four_times': ['emailed'],
        'called_five_times': ['emailed'],
        'called_six_times': ['emailed'],
        'called_seven_times': ['emailed'],
        'meeting': ['booked'],
        'deal': ['closed won']
      };
      
      if (stageMapping[stage]) {
        query.status = { $in: stageMapping[stage] };
      }
    }
    
    // Add search filter (preserve user scoping)
    if (search) {
      // When searching, ensure we keep user filter and apply search across fields
      query.$and = [
        { $or: [
          { assignedTo: userId },
          { leadsCreatedBy: userId }
        ]},
        { $or: [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]}
      ];
      // Remove the previous $or used for user scoping to avoid conflicts
      delete (query as any).$or;
    }
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Execute query
    const mongoLeads = await Lead.find(query)
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Transform MongoDB leads to CRM Lead format
    const crmLeads = mongoLeads.map((lead: any) => {
      // Map database status to CRM stage - FIXED to use email automation data
      let stage = 'new_leads';
      
      // If we have email history, use the last email stage
      const emailHistory = lead.emailHistory || [];
      if (emailHistory.length > 0) {
        const lastEmailStage = emailHistory[emailHistory.length - 1].stage;
        stage = lastEmailStage; // Show the stage of the last email sent
      } else if (lead.status === 'active') {
        stage = 'new_leads';
      } else if (lead.status === 'emailed' || lead.emailAutomationEnabled) {
        // Use followUpCount if available
        const followUpCount = lead.followUpCount || 0;
        if (followUpCount === 1) {
          stage = 'called_once';
        } else if (followUpCount === 2) {
          stage = 'called_twice';
        } else if (followUpCount === 3) {
          stage = 'called_three_times';
        } else if (followUpCount === 4) {
          stage = 'called_four_times';
        } else if (followUpCount === 5) {
          stage = 'called_five_times';
        } else if (followUpCount === 6) {
          stage = 'called_six_times';
        } else if (followUpCount >= 7) {
          stage = 'called_seven_times';
        } else {
          stage = 'called_once'; // Default fallback
        }
      } else if (lead.status === 'replied') {
        stage = 'meeting';
      } else if (lead.status === 'booked') {
        stage = 'meeting';
      } else if (lead.status === 'closed won') {
        stage = 'deal';
      } else if (lead.status === 'closed lost' || lead.status === 'not interested') {
        stage = 'follow_up_later';
      }
      
      // Map database source to CRM source
      const sourceMapping: { [key: string]: string } = {
        'search': 'website',
        'google-maps': 'website',
        'organic-search': 'website',
        'google-ads': 'website',
        'manual': 'other',
        'import': 'other',
        'linkedin': 'linkedin',
        'referral': 'referral',
        'cold_email': 'cold_email',
        'event': 'event'
      };
      
      return {
        id: lead._id.toString(),
        name: lead.name || 'Unknown',
        company: lead.company || 'Unknown Company',
        position: lead.industry || 'Unknown Position', // Use industry as position for now
        email: lead.email,
        phone: lead.phone || '',
        stage: stage,
        source: sourceMapping[lead.source] || 'other',
        lastContact: lead.lastContactedAt ? new Date(lead.lastContactedAt).toISOString().split('T')[0] : undefined,
        notes: lead.notes || '',
        activities: [
          // Create a basic activity from lead data
          {
            id: `activity_${lead._id}`,
            type: lead.lastContactedAt ? 'email' : 'linkedin',
            date: lead.lastContactedAt ? new Date(lead.lastContactedAt).toISOString().split('T')[0] : new Date(lead.createdAt).toISOString().split('T')[0],
            notes: lead.notes || 'Initial contact',
            leadId: lead._id.toString()
          }
        ],
        tags: [
          ...(lead.tags || []),
          ...(lead.googleAds ? ['google-ads'] : []),
          ...(lead.location ? [lead.location] : []),
          ...(lead.source ? [lead.source] : [])
        ],
        created_at: new Date(lead.createdAt).toISOString(),
        updated_at: new Date(lead.updatedAt).toISOString(),
        // Additional CRM-specific fields
        googleAds: lead.googleAds || false,
        organicRanking: lead.organicRanking,
        location: lead.location,
        website: lead.website,
        dealValue: lead.dealValue,
        probability: lead.probability,
        // Include enriched author/company details for Lead Details panel
        authInformation: lead.authInformation || null,
        // Email automation fields
        emailAutomationEnabled: lead.emailAutomationEnabled || false,
        emailSequenceActive: lead.emailSequenceActive || false,
        emailSequenceStage: lead.emailSequenceStage,
        emailSequenceStep: lead.emailSequenceStep,
        nextScheduledEmail: lead.nextScheduledEmail,
        emailStoppedReason: lead.emailStoppedReason,
        emailHistory: lead.emailHistory || []
      };
    });
    
    // Get total count
    const totalCount = await Lead.countDocuments(query);
    
    // Get stage counts for pipeline with proper calling stage distinction (scoped to user)
    const userScope = { $or: [{ assignedTo: userId }, { leadsCreatedBy: userId }] };
    const stageCounts = await Lead.aggregate([
      { $match: { status: { $nin: ['archived'] }, ...userScope } },
      {
        $addFields: {
          emailHistoryLength: { $size: { $ifNull: ['$emailHistory', []] } },
          lastEmailStage: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$emailHistory', []] } }, 0] },
              then: { $arrayElemAt: ['$emailHistory.stage', -1] },
              else: 'new_leads'
            }
          }
        }
      },
      {
        $addFields: {
          crmStage: {
            $switch: {
              branches: [
                // If we have email history, use the last email stage
                { case: { $gt: ['$emailHistoryLength', 0] }, then: '$lastEmailStage' },
                
                // If status is active, it's a new lead
                { case: { $eq: ['$status', 'active'] }, then: 'new_leads' },
                
                // If status is emailed but no email history, use followUpCount
                { 
                  case: { $and: [{ $eq: ['$status', 'emailed'] }, { $eq: ['$followUpCount', 1] }] },
                  then: 'called_once'
                },
                { 
                  case: { $and: [{ $eq: ['$status', 'emailed'] }, { $eq: ['$followUpCount', 2] }] },
                  then: 'called_twice'
                },
                { 
                  case: { $and: [{ $eq: ['$status', 'emailed'] }, { $eq: ['$followUpCount', 3] }] },
                  then: 'called_three_times'
                },
                { 
                  case: { $and: [{ $eq: ['$status', 'emailed'] }, { $eq: ['$followUpCount', 4] }] },
                  then: 'called_four_times'
                },
                { 
                  case: { $and: [{ $eq: ['$status', 'emailed'] }, { $eq: ['$followUpCount', 5] }] },
                  then: 'called_five_times'
                },
                { 
                  case: { $and: [{ $eq: ['$status', 'emailed'] }, { $eq: ['$followUpCount', 6] }] },
                  then: 'called_six_times'
                },
                { 
                  case: { $and: [{ $eq: ['$status', 'emailed'] }, { $gte: ['$followUpCount', 7] }] },
                  then: 'called_seven_times'
                },
                
                // If status is replied or booked, it's a meeting
                { case: { $eq: ['$status', 'replied'] }, then: 'meeting' },
                { case: { $eq: ['$status', 'booked'] }, then: 'meeting' },
                
                // If status is closed won, it's a deal
                { case: { $eq: ['$status', 'closed won'] }, then: 'deal' }
              ],
              default: 'new_leads'
            }
          }
        }
      },
      { $group: { _id: '$crmStage', count: { $sum: 1 } } }
    ]);
    
    // Map to CRM stages
    const crmStageCounts = {
      new_leads: 0,
      called_once: 0,
      called_twice: 0,
      called_three_times: 0,
      called_four_times: 0,
      called_five_times: 0,
      called_six_times: 0,
      called_seven_times: 0,
      meeting: 0,
      deal: 0
    };
    
    stageCounts.forEach((item: any) => {
      if (crmStageCounts.hasOwnProperty(item._id)) {
        crmStageCounts[item._id as keyof typeof crmStageCounts] = item.count;
      }
    });
    
    return NextResponse.json({
      success: true,
      leads: crmLeads,
      totalCount,
      stageCounts: crmStageCounts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
    
  } catch (error: any) {
    console.error('Error loading CRM leads:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load CRM leads'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating lead stages in CRM
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      leadId, 
      stage, 
      notes, 
      activity, 
      name, 
      company, 
      position, 
      email, 
      phone, 
      source, 
      tags, 
      activities, 
      lossReason, 
      lossComment, 
      lossDescription, 
      lastContact, 
      budget, 
      closedDate 
    } = body;
    
    if (!leadId || !stage) {
      return NextResponse.json(
        { success: false, error: 'Lead ID and stage are required' },
        { status: 400 }
      );
    }
    
    // Map CRM stage back to database status
    const stageToStatusMapping: { [key: string]: string } = {
      'new_leads': 'active',
      'called_once': 'emailed',
      'called_twice': 'emailed',
      'called_three_times': 'emailed',
      'called_four_times': 'emailed',
      'called_five_times': 'emailed',
      'called_six_times': 'emailed',
      'called_seven_times': 'emailed',
      'meeting': 'booked',
      'deal': 'closed won'
    };
    
    const newStatus = stageToStatusMapping[stage];
    if (!newStatus) {
      return NextResponse.json(
        { success: false, error: 'Invalid stage provided' },
        { status: 400 }
      );
    }
    
    // Get current lead to check automation settings
    const currentLead = await Lead.findById(leadId);
    if (!currentLead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    // Update the lead
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };
    
    // Update basic fields
    if (name) updateData.name = name;
    if (company) updateData.company = company;
    if (position) updateData.position = position;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (source) updateData.source = source;
    if (notes) updateData.notes = notes;
    if (tags) updateData.tags = tags;
    if (activities) updateData.activities = activities;
    if (lastContact) updateData.lastContactedAt = new Date(lastContact);
    
    // Handle won/lost status with budget
    if (stage === 'deal' && budget) {
      updateData.budget = parseFloat(budget);
      updateData.closedDate = closedDate ? new Date(closedDate) : new Date();
      updateData.closedReason = 'won';
    }
    
    // Handle loss information
    if (lossReason) {
      updateData.lossReason = lossReason;
      updateData.closedDate = closedDate ? new Date(closedDate) : new Date();
      updateData.closedReason = 'lost';
      
      if (lossComment) {
        updateData.lossComment = lossComment;
      }
      
      if (lossDescription) {
        updateData.lossDescription = lossDescription;
      }
      
      if (budget) {
        updateData.budget = parseFloat(budget);
      }
    }
    
    // Update contact time if moving to contacted stages
    if (['emailed', 'replied', 'booked'].includes(newStatus)) {
      updateData.lastContactedAt = new Date();
    }
    
    // Email automation logic
    const emailStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    
    if (emailStages.includes(stage)) {
      // Start email automation if this is the first calling stage
      if (stage === 'called_once' && currentLead.emailAutomationEnabled !== false) {
        // Load timing settings and calculate first email date
        const timingSettings = await getEmailTimingSettings();
        const firstEmailDate = calculateEmailDate(timingSettings, 'called_once');
        
        updateData.emailAutomationEnabled = true;
        updateData.emailSequenceActive = true;
        updateData.emailSequenceStage = stage;
        updateData.emailSequenceStartDate = new Date();
        updateData.emailSequenceStep = 1;
        updateData.nextScheduledEmail = firstEmailDate;
        updateData.emailStoppedReason = null;
        
        console.log(`🚀 Email automation started for ${currentLead.name} - First email scheduled for ${firstEmailDate} (using custom timing)`);
      }
      
      // If manually moving to different calling stages, stop automation to prevent conflicts
      if (currentLead.emailSequenceActive && currentLead.emailSequenceStage !== stage) {
        updateData.emailSequenceActive = false;
        updateData.emailStoppedReason = 'Manual stage change';
        updateData.nextScheduledEmail = null;
        
        console.log(`⏹️ Email automation stopped for ${currentLead.name} due to manual stage change`);
      }
    } else {
      // If moving to non-email stages (meeting, deal), stop email automation
      if (currentLead.emailSequenceActive) {
        updateData.emailSequenceActive = false;
        updateData.emailStoppedReason = `Moved to ${stage} stage`;
        updateData.nextScheduledEmail = null;
        
        console.log(`⏹️ Email automation stopped for ${currentLead.name} - moved to ${stage}`);
      }
    }
    
    // Prepare the update query properly
    const updateQuery: any = {
      $set: updateData
    };
    
    // Set specific followUpCount based on calling stage
    if (stage === 'called_once') {
      updateQuery.$set.followUpCount = 1;
    } else if (stage === 'called_twice') {
      updateQuery.$set.followUpCount = 2;
    } else if (stage === 'called_three_times') {
      updateQuery.$set.followUpCount = 3;
    } else if (stage === 'called_four_times') {
      updateQuery.$set.followUpCount = 4;
    } else if (stage === 'called_five_times') {
      updateQuery.$set.followUpCount = 5;
    } else if (stage === 'called_six_times') {
      updateQuery.$set.followUpCount = 6;
    } else if (stage === 'called_seven_times') {
      updateQuery.$set.followUpCount = 7;
    } else if (['emailed', 'replied', 'booked'].includes(newStatus) && !['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'].includes(stage)) {
      // For other contacted stages, increment if not already set
      updateQuery.$inc = { followUpCount: 1 };
    }
    
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      updateQuery,
      { new: true }
    );
    
    if (!updatedLead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      lead: updatedLead
    });
    
  } catch (error: any) {
    console.error('Error updating CRM lead:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update lead'
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating new leads in CRM
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const {
      name,
      company,
      position,
      email,
      phone,
      source,
      stage,
      notes,
      website,
      location,
      dealValue,
      tags,
      googleAds,
      organicRanking,
      authInformation
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
    
    // Map CRM stage to database status
    const stageToStatusMapping: { [key: string]: string } = {
      'new_leads': 'active',
      'called_once': 'emailed',
      'called_twice': 'emailed',
      'called_three_times': 'emailed',
      'called_four_times': 'emailed',
      'called_five_times': 'emailed',
      'called_six_times': 'emailed',
      'called_seven_times': 'emailed',
      'meeting': 'booked',
      'deal': 'closed won'
    };
    
    // Map CRM source to database source
    const sourceToDbMapping: { [key: string]: string } = {
      'website': 'search',
      'linkedin': 'linkedin',
      'referral': 'referral',
      'cold_email': 'cold_email',
      'event': 'event',
      'other': 'manual'
    };
    
    // Get current user ID from request
    const userId = request.nextUrl.searchParams.get('userId');
    
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
      industry: position || 'Unknown', // Map position to industry field
      email,
      phone: phone || '',
      website: website || '',
      location: location || '',
      source: sourceToDbMapping[source] || 'manual',
      status: stageToStatusMapping[stage] || 'active',
      notes: notes || '',
      tags: tags || [],
      googleAds: googleAds || false,
      organicRanking: organicRanking || null,
      dealValue: dealValue || 0,
      probability: stage === 'deal' ? 90 : stage === 'meeting' ? 70 : stage === 'meeting' ? 50 : 25,
      assignedTo: userId, // Assign to current user
      leadsCreatedBy: userId, // User ID who created this lead
      createdAt: new Date(),
      updatedAt: new Date(),
      lastContactedAt: ['emailed', 'replied', 'booked'].includes(stageToStatusMapping[stage]) ? new Date() : null,
      followUpCount: 0,
      ...(authInformation ? { authInformation: {
        company_name: authInformation.company_name || '',
        company_email: authInformation.company_email || '',
        owner_name: authInformation.owner_name || '',
        owner_email: authInformation.owner_email || '',
        manager_name: authInformation.manager_name || '',
        manager_email: authInformation.manager_email || '',
        hr_name: authInformation.hr_name || '',
        hr_email: authInformation.hr_email || '',
        executive_name: authInformation.executive_name || '',
        executive_email: authInformation.executive_email || ''
      } } : {})
    };
    
    const newLead = new Lead(leadData);
    const savedLead = await newLead.save();
    
    return NextResponse.json({
      success: true,
      lead: savedLead,
      message: 'Lead created successfully'
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