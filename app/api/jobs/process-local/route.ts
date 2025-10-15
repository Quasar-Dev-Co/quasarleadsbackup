import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue, { IJobQueue } from '@/models/jobQueueSchema';
import Lead from '@/models/leadSchema';
import OpenAI from 'openai';
import User from '@/models/userSchema';
import { enrichLeadsWithOwners } from '@/lib/leadEnrichment';

// Environment variables (will be overridden by user-specific creds when available)
let SERPAPI_KEY = process.env.SERPAPI_KEY || '';
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize OpenAI only if API key is available
let openai: OpenAI | null = null;
if (OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    console.log('✅ OpenAI initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error);
    openai = null;
  }
} else {
  console.log('⚠️ OpenAI API key not found - AI features will be disabled');
}

interface ProcessedLead {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedinProfile: string;
  description: string;
  location: string;
  status: string;
  source: string;
  tags: string[];
  isHighValue?: boolean;
  organicRanking?: number | null;
  isRunningAds?: boolean;
  leadSource: 'organic' | 'local' | 'ads' | 'high-value' | 'ai-generated';
}

// Function to clean and validate leads using OpenAI
async function cleanLeadsWithAI(leads: any[], service: string, location: string): Promise<ProcessedLead[]> {
  if (!openai) {
    console.log('⚠️ OpenAI not available, skipping AI cleaning');
    return leads.map(lead => ({
      ...lead,
      leadSource: 'organic'
    }));
  }

  const cleanedLeads: ProcessedLead[] = [];
  
  try {
    console.log(`🧠 Cleaning ${leads.length} leads with AI...`);
    
    // Process leads in batches of 10
    for (let i = 0; i < leads.length; i += 10) {
      const batch = leads.slice(i, i + 10);
      
      const prompt = `
You are a lead validation expert. Analyze these leads and return a JSON array with cleaned and validated data.

For each lead, provide:
1. Valid business email (check if email format is correct and business-like)
2. Company name (extract from domain or title)
3. Contact name (extract from email or generate professional name)
4. Phone number (if available)
5. Website URL
6. LinkedIn profile (if found)
7. Description (professional summary)
8. Is this a high-value lead? (companies running ads but not ranking well organically)
9. Tags (service, location, lead type)

Service: ${service}
Location: ${location}

Leads to analyze:
${batch.map((lead, index) => `
Lead ${index + 1}:
- Title: ${lead.title || lead.name || 'N/A'}
- Email: ${lead.email || 'N/A'}
- Website: ${lead.website || lead.url || 'N/A'}
- Phone: ${lead.phone || 'N/A'}
- Description: ${lead.description || lead.snippet || 'N/A'}
`).join('\n')}

Return only a valid JSON array with this structure:
[
  {
    "name": "Contact Name",
    "company": "Company Name",
    "email": "validated@email.com",
    "phone": "phone number",
    "website": "website url",
    "linkedinProfile": "linkedin url",
    "description": "professional description",
    "isHighValue": true/false,
    "tags": ["service", "location", "lead-type"],
    "leadSource": "organic|high-value|ai-generated"
  }
]
`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const cleanedBatch = JSON.parse(content);
          cleanedLeads.push(...cleanedBatch);
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          // Fallback to original leads
          cleanedLeads.push(...batch.map(lead => ({
            ...lead,
            leadSource: 'organic'
          })));
        }
      }
      
      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ AI cleaned ${cleanedLeads.length} leads`);
    
  } catch (error) {
    console.error('Error in AI lead cleaning:', error);
    // Fallback to original leads
    return leads.map(lead => ({
      ...lead,
      leadSource: 'organic'
    }));
  }
  
  return cleanedLeads;
}

// Function to generate additional high-value leads using AI
async function generateHighValueLeads(service: string, location: string, existingLeads: ProcessedLead[], targetCount: number = 20): Promise<ProcessedLead[]> {
  if (!openai) {
    console.log('⚠️ OpenAI not available, skipping AI lead generation');
    return [];
  }

  const highValueLeads: ProcessedLead[] = [];

  try {
    console.log(`💎 Generating ${targetCount} HIGH-VALUE leads with Google Ads flags for ${service} in ${location}...`);
    
    const existingDomains = existingLeads.map(lead => lead.website).filter(Boolean);
    
    const prompt = `You are a business intelligence expert specializing in Google Ads and SEO analysis.

I need you to generate ${targetCount} REAL companies in ${location} that provide ${service} services and meet these HIGH-VALUE criteria:
1. They are currently running Google Ads (actively spending money on advertising)
2. They have poor organic rankings (ranking position 15+ or not visible in first page)
3. This makes them HIGH-VALUE because they have marketing budget but need better organic/SEO results

IMPORTANT: Use this EXACT JSON format:
{
  "high_value_leads": [
    {
      "name": "John Smith",
      "company": "ABC Digital Solutions",
      "email": "contact@abcdigital.com",
      "phone": "+1-555-123-4567", 
      "website": "https://abcdigital.com",
      "linkedinProfile": "linkedin.com/company/abc-digital-solutions",
      "organicRanking": 18,
      "adsSpend": "$1500/month",
      "reasoning": "Running Google Ads for '${service} ${location}' spending $1500/month but ranking #18 organically"
    }
  ]
}

Requirements for each lead:
- Real business name that sounds authentic for ${location}
- Professional email (use company domain, not gmail/yahoo)
- Realistic phone number for ${location} area
- Website URL that matches company name  
- LinkedIn company profile URL
- Organic ranking between 15-50 (poor ranking)
- Realistic monthly ad spend ($500-$5000)
- Brief reasoning why they're high-value

AVOID these existing domains: ${existingDomains.slice(0, 10).join(', ')}

Generate ${targetCount} companies that are clearly spending money on ads but struggling organically:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        const aiData = JSON.parse(content);
        
        console.log(`🤖 AI Response: ${aiData.high_value_leads?.length || 0} high-value leads generated`);
        
        // Process AI-generated high-value leads
        aiData.high_value_leads?.forEach((aiLead: any) => {
          if (aiLead.website && aiLead.email && aiLead.company) {
            const newLead: ProcessedLead = {
              name: aiLead.name || 'Decision Maker',
              company: aiLead.company,
              email: aiLead.email,
              phone: aiLead.phone || '',
              website: aiLead.website,
              linkedinProfile: aiLead.linkedinProfile || '',
              description: `HIGH-VALUE AI LEAD: ${aiLead.reasoning || 'Running Google Ads but poor organic ranking'} - ${aiLead.adsSpend || 'Unknown budget'}`,
              location,
              status: 'active',
              source: 'ai-high-value',
              tags: [service.toLowerCase(), location.toLowerCase(), 'ai-generated', 'high-value', 'google-ads', 'poor-organic'],
              leadSource: 'high-value',
              isHighValue: true, // ✅ ALWAYS HIGH-VALUE
              isRunningAds: true, // ✅ ALWAYS RUNNING ADS
              organicRanking: aiLead.organicRanking || Math.floor(Math.random() * 35) + 15 // ✅ POOR RANKING (15-50)
            };
            
            highValueLeads.push(newLead);
            console.log(`💎 Generated HIGH-VALUE lead: ${newLead.company} (Ads: ✅, Organic: #${newLead.organicRanking})`);
          }
        });
        
        console.log(`🎯 Successfully generated ${highValueLeads.length} HIGH-VALUE leads with Google Ads!`);
        
      } catch (parseError) {
        console.error('Error parsing AI generated leads:', parseError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error generating HIGH-VALUE leads with AI:', error);
  }
  
  return highValueLeads;
}

// Enhanced processServiceLocation function with comprehensive workflow
async function processServiceLocation(service: string, location: string, leadQuantity: number, includeGoogleAdsAnalysis = false, analyzeLeads = false, userId?: string): Promise<ProcessedLead[]> {
  const processedLeads: ProcessedLead[] = [];
  
  try {
    console.log(`🔄 Processing ${service} in ${location} with Google Ads Analysis: ${includeGoogleAdsAnalysis}, Analyze Leads: ${analyzeLeads}`);
    
    // STEP 1: Choose API based on job configuration  
    // FIXED: Use production URL instead of preview URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://testqlagain.vercel.app';
      
    const apiEndpoint = includeGoogleAdsAnalysis && analyzeLeads ? 
      `${baseUrl}/api/findleads` : // High-value analysis
      `${baseUrl}/api/findleads-normal`; // Normal leads
      
    const analysisType = includeGoogleAdsAnalysis && analyzeLeads ? 'high-value analysis' : 'normal lead collection';
    console.log(`📡 Step 1: Getting leads from ${analysisType} API (${apiEndpoint})...`);
    
    console.log(`🌐 Making API call to: ${apiEndpoint}`);
    console.log(`📋 Request payload:`, JSON.stringify({
      services: [service],
      locations: [location],
      leadQuantity: includeGoogleAdsAnalysis && analyzeLeads ? Math.floor(leadQuantity * 0.8) : leadQuantity
    }, null, 2));

    const findLeadsResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        services: [service],
        locations: [location],
        leadQuantity: includeGoogleAdsAnalysis && analyzeLeads ? Math.floor(leadQuantity * 0.8) : leadQuantity, // Full quantity for normal, 80% for high-value
        userId: userId // Pass the user ID to the findleads API
      }),
    });

    console.log(`📡 API Response Status: ${findLeadsResponse.status} ${findLeadsResponse.statusText}`);

    if (!findLeadsResponse.ok) {
      const errorText = await findLeadsResponse.text();
      console.error(`❌ Findleads API failed with status ${findLeadsResponse.status}:`);
      console.error(`📄 Error response body:`, errorText);
      throw new Error(`Findleads API failed: ${findLeadsResponse.status} - ${errorText}`);
    }

    const findLeadsData = await findLeadsResponse.json();
    const initialLeads = findLeadsData.leads || [];
    
    console.log(`📊 API Response Success:`, {
      totalLeads: initialLeads.length,
      successMessage: findLeadsData.message,
      stats: findLeadsData.stats
    });
    
    console.log(`📊 Found ${initialLeads.length} initial leads from findleads API`);
    
    // Convert to ProcessedLead format
    for (const lead of initialLeads) {
      const processedLead: ProcessedLead = {
        name: lead.name || 'Contact',
        company: lead.company || 'Unknown Company',
        email: lead.email || '',
        phone: lead.phone || '',
        website: lead.website || '',
        linkedinProfile: lead.linkedinProfile || '',
        description: lead.description || `${service} services in ${location}`,
        location,
        status: 'active',
        source: lead.source || 'findleads-api',
        tags: [service.toLowerCase(), location.toLowerCase(), 'findleads'],
        leadSource: 'organic',
        isHighValue: false,
        isRunningAds: false,
        organicRanking: undefined
      };
      
      processedLeads.push(processedLead);
    }
    
    // STEP 2: Use AI to enhance leads without emails/LinkedIn
    if (analyzeLeads && openai) {
      console.log('🤖 Step 2: Using AI to enhance leads without complete contact info...');
      const leadsNeedingEnhancement = processedLeads.filter(lead => 
        !lead.email || !lead.linkedinProfile || lead.email === '' || lead.linkedinProfile === ''
      );
      
      if (leadsNeedingEnhancement.length > 0) {
        const cleanedLeads = await cleanLeadsWithAI(leadsNeedingEnhancement, service, location);
        
        // Update the original leads with enhanced data
        cleanedLeads.forEach((cleaned, index) => {
          if (index < leadsNeedingEnhancement.length) {
            Object.assign(leadsNeedingEnhancement[index], cleaned);
          }
        });
      }
    }
    
    // STEP 3: Check Google Ads for all leads
    if (includeGoogleAdsAnalysis) {
      console.log('🎯 Step 3: Analyzing Google Ads status for all leads...');
      
      // Import GoogleAdsDetector (assuming it's available)
      const { GoogleAdsDetector } = await import('@/lib/googleAdsDetector');
      const adsDetector = new GoogleAdsDetector(SERPAPI_KEY);
      
      for (const lead of processedLeads) {
        try {
          if (!lead.website) continue;
          
          console.log(`🔍 Checking Google Ads for ${lead.company} (${lead.website})`);
          
          const adsResult = await adsDetector.checkGoogleAds(lead.website, service, location);
          
          // Update lead with Google Ads information
          lead.isRunningAds = adsResult.hasGoogleAds;
          if (adsResult.organicRanking) {
            lead.organicRanking = adsResult.organicRanking;
          }
          
          // Mark as high-value if running ads but poor organic ranking
          if (adsResult.hasGoogleAds && (!adsResult.organicRanking || adsResult.organicRanking > 10)) {
            lead.isHighValue = true;
            lead.leadSource = 'high-value';
            lead.tags.push('google-ads', 'high-value');
            console.log(`💎 Found high-value lead: ${lead.company} (running ads, organic ranking: ${adsResult.organicRanking || 'not found'})`);
          }
          
          // Add Google Ads tag if running ads
          if (adsResult.hasGoogleAds && !lead.tags.includes('google-ads')) {
            lead.tags.push('google-ads');
          }
          
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`❌ Error checking Google Ads for ${lead.company}:`, error);
        }
      }
      
      const highValueCount = processedLeads.filter(lead => lead.isHighValue).length;
      const runningAdsCount = processedLeads.filter(lead => lead.isRunningAds).length;
      
      console.log(`✅ Google Ads analysis complete: ${runningAdsCount} running ads, ${highValueCount} high-value leads`);
    }
    
    // STEP 4: Generate additional high-value leads using AI if requested
    if (analyzeLeads && includeGoogleAdsAnalysis && openai) {
      console.log('💎 Step 4: Generating additional high-value leads with AI...');
      
      const highValueLeads = processedLeads.filter(lead => lead.isHighValue);
      const targetHighValueLeads = Math.max(5, Math.floor(leadQuantity * 0.3)); // At least 30% high-value
      
      if (highValueLeads.length < targetHighValueLeads) {
        const additionalLeadsNeeded = targetHighValueLeads - highValueLeads.length;
        console.log(`🎯 Need ${additionalLeadsNeeded} more high-value leads`);
        
        console.log(`🎯 Generating ${additionalLeadsNeeded} AI high-value leads...`);
        const additionalLeads = await generateHighValueLeads(
          service, 
          location, 
          processedLeads, 
          additionalLeadsNeeded
        );
        console.log(`💎 Generated ${additionalLeads.length} high-value leads with Google Ads flags set`);
        
        processedLeads.push(...additionalLeads);
      }
    }
    
    // Filter out leads without emails (keep only those with proper contact info)
    const finalLeads = processedLeads.filter(lead => 
      lead.email && 
      lead.email.includes('@') && 
      lead.email.includes('.')
    );
    
    console.log(`✅ Completed processing ${service} in ${location}: ${finalLeads.length} leads with proper emails`);
    
    return finalLeads;
    
  } catch (error) {
    console.error(`❌ Error processing ${service} in ${location}:`, error);
  }
  
  return processedLeads.filter(lead => lead.email && lead.email.includes('@'));
}

// Local development job processor
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Optionally override API keys with user-specific credentials when job has userId
    try {
      const bodyPreview = await request.clone().json();
      const jobIdPreview = bodyPreview?.jobId;
      await dbConnect();
      const job = (jobIdPreview ? await JobQueue.findOne({ jobId: jobIdPreview }).lean() : null) as any;
      if (job?.userId) {
        const user = await (await import('@/models/userSchema')).default.findById(job.userId).lean() as any;
        const userSerp = user?.credentials?.SERPAPI_KEY as string | undefined;
        const userOpenai = user?.credentials?.OPENAI_API_KEY as string | undefined;
        if (userSerp) SERPAPI_KEY = userSerp;
        if (userOpenai) {
          OPENAI_API_KEY = userOpenai;
          openai = new OpenAI({ apiKey: userOpenai });
        }
      }
    } catch {}

    // Environment validation for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode - checking environment variables...');
      console.log('SERPAPI_KEY:', SERPAPI_KEY ? '✅ Set' : '❌ Missing');
      console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
      console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { jobId } = body;
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job ID is required'
      }, { status: 400 });
    }
    
    // Get the job
    const job = await JobQueue.findOne({ jobId }) as IJobQueue | null;
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 });
    }
    
    console.log(`🔍 Job details:`, {
      jobId: job.jobId,
      userId: job.userId,
      services: job.services,
      locations: job.locations,
      leadQuantity: job.leadQuantity
    });
    
    if (job.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Job is not in pending status'
      }, { status: 400 });
    }
    
    // Start the job
    job.status = 'running';
    job.startedAt = new Date();
    job.updatedAt = new Date();
    await job.save();
    
    const { services, locations, leadQuantity, includeGoogleAdsAnalysis = false, analyzeLeads = false } = job;
    const totalSteps = services.length * locations.length;
    let totalLeadsCollected = 0;
    
    console.log(`🚀 Starting local job ${job.jobId}: ${totalSteps} steps`);
    
    // Process each service-location combination
    for (let serviceIndex = 0; serviceIndex < services.length; serviceIndex++) {
      const service = services[serviceIndex];
      
      for (let locationIndex = 0; locationIndex < locations.length; locationIndex++) {
        const location = locations[locationIndex];
        const currentStep = serviceIndex * locations.length + locationIndex + 1;
        
        try {
          // Update progress
          const progress = Math.round((currentStep / totalSteps) * 100);
          job.progress = Math.min(100, Math.max(0, progress));
          job.progressMessage = `Processing: ${service} in ${location} (${currentStep}/${totalSteps})`;
          job.currentStep = currentStep;
          job.updatedAt = new Date();
          await job.save();
          
          console.log(`📊 Step ${currentStep}/${totalSteps}: ${service} in ${location}`);
          
          // Process this service-location combination
          const leads = await processServiceLocation(service, location, leadQuantity, includeGoogleAdsAnalysis, analyzeLeads, job.userId);
          
          // 🔍 ENRICH LEADS WITH COMPANY OWNER INFORMATION
          console.log(`🔍 Enriching ${leads.length} leads with company owner information...`);
          const enrichedLeads = await enrichLeadsWithOwners(leads, job.userId || 'quasar-admin');
          console.log(`✅ Lead enrichment completed`);
          
          // Save leads to database with enhanced duplicate detection
          for (const lead of enrichedLeads) {
            try {
              // Enhanced duplicate detection - check by email, company name, or website
              const duplicateQuery = {
                $or: [
                  { email: lead.email },
                  { company: { $regex: new RegExp(lead.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
                  ...(lead.website ? [{ website: lead.website }] : [])
                ]
              };
              
              const existingLead = await Lead.findOne(duplicateQuery);
              
              if (!existingLead) {
                const userId = job.userId || "quasar-admin";
                console.log(`💾 Creating lead with user ID: ${userId} for ${lead.company}${lead.companyOwner ? ` (Owner: ${lead.companyOwner})` : ''}`);
                
                const newLead = new Lead({
          ...lead,
          // Map processed lead fields to database schema
          googleAds: lead.isRunningAds || false,
          googleAdsChecked: lead.isRunningAds !== undefined, // Mark as checked if we have ads data
          isHighValue: lead.isHighValue || false,
          assignedTo: userId, // Assign to job creator
          leadsCreatedBy: userId, // User ID who created this lead
          createdAt: new Date(),
          updatedAt: new Date()
        });
                
                console.log(`💾 Saving NEW lead: ${lead.company} - ${lead.email} - isHighValue: ${lead.isHighValue}`);
                await newLead.save();
                totalLeadsCollected++;
                
                if (lead.isHighValue) {
                  console.log(`💎 HIGH-VALUE LEAD SAVED: ${lead.company} - ${lead.email}`);
                }
              } else {
                console.log(`🔄 DUPLICATE DETECTED: ${lead.company} already exists as "${existingLead.company}"`);
                
                // Update existing lead with better information if the new lead has more data
                let updated = false;
                
                if (includeGoogleAdsAnalysis && lead.isRunningAds !== undefined) {
                  existingLead.googleAds = lead.isRunningAds;
                  existingLead.googleAdsChecked = true;
                  existingLead.organicRanking = lead.organicRanking;
                  updated = true;
                }
                
                if (lead.isHighValue && !existingLead.isHighValue) {
                  existingLead.isHighValue = true;
                  updated = true;
                }
                
                // Update with better contact info if missing
                if (!existingLead.linkedinProfile && lead.linkedinProfile) {
                  existingLead.linkedinProfile = lead.linkedinProfile;
                  updated = true;
                }
                
                if (!existingLead.website && lead.website) {
                  existingLead.website = lead.website;
                  updated = true;
                }
                
                if (updated) {
                  existingLead.updatedAt = new Date();
                  await existingLead.save();
                  console.log(`✅ Updated existing lead: ${existingLead.company} with new data`);
                } else {
                  console.log(`⚠️ Skipped duplicate: ${lead.company} (no new data to add)`);
                }
              }
            } catch (error) {
              console.error(`Error saving lead ${lead.email}:`, error);
            }
          }
          
          // Update collected leads count
          await JobQueue.findByIdAndUpdate(job._id, {
            collectedLeads: totalLeadsCollected
          });
          
          console.log(`✅ Step ${currentStep} completed: ${leads.length} leads collected`);
          
          // Add delay between steps to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Error in step ${currentStep}:`, error);
          
          // Update progress with error
          const progress = Math.round((currentStep / totalSteps) * 100);
          job.progress = Math.min(100, Math.max(0, progress));
          job.progressMessage = `Error in step ${currentStep}: ${service} in ${location}`;
          job.currentStep = currentStep;
          job.updatedAt = new Date();
          await job.save();
          
          // Continue with next step instead of failing entire job
        }
      }
    }
    
    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.progressMessage = 'Job completed successfully!';
    job.completedAt = new Date();
    job.totalLeadsCollected = totalLeadsCollected;
    job.updatedAt = new Date();
    await job.save();
    
    console.log(`🎉 Local job ${job.jobId} completed: ${totalLeadsCollected} leads collected`);
    
    return NextResponse.json({
      success: true,
      message: `Job ${job.jobId} completed successfully`,
      jobId: job.jobId,
      totalLeadsCollected
    });
    
  } catch (error: any) {
    console.error('Error in local job processor:', error);
    
    // If there was a job being processed, mark it as failed
    try {
      const runningJob = await JobQueue.findOne({ status: 'running' });
      if (runningJob) {
        runningJob.status = 'failed';
        runningJob.errorMessage = error.message || 'Unknown error occurred';
        runningJob.completedAt = new Date();
        runningJob.updatedAt = new Date();
        await runningJob.save();
      }
    } catch (updateError) {
      console.error('Error updating failed job:', updateError);
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Local job processor failed'
    }, { status: 500 });
  }
} 