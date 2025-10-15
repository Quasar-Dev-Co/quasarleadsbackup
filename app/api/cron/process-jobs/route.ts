import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobQueue, { IJobQueue } from '@/models/jobQueueSchema';
import User from '@/models/userSchema';
import Lead from '@/models/leadSchema';
import { getJson } from 'serpapi';
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { GoogleAdsDetector } from '@/lib/googleAdsDetector';
import { enrichLeadsWithOwners } from '@/lib/leadEnrichment';

// Environment variables (fallbacks)
let SERPAPI_KEY = process.env.SERPAPI_KEY || '';
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize OpenAI
let openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface ScrapedData {
  url: string;
  title: string;
  metaDescription: string;
  bodyText: string;
  emails: string[];
  phones: string[];
  linkedinProfiles: string[];
  aboutContent: string;
  servicesContent: string;
  contactContent: string;
  hasContactPage: boolean;
  hasAboutPage: boolean;
  businessType: string;
  extractionSuccess: boolean;
}

interface OrganicLead {
  url: string;
  title: string;
  snippet: string;
  ranking: number;
  domain: string;
  scrapedData: ScrapedData;
  emailFound: boolean;
  emails: string[];
  leadSource?: 'organic' | 'local' | 'ads';
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
  address?: string;
  rating?: string;
  reviews?: string;
  isHighValue?: boolean;
  organicRanking?: number | null;
  isRunningAds?: boolean;
  leadSource: 'organic' | 'local' | 'ads' | 'high-value' | 'ai-generated';
}

// Function to scrape website data
async function scrapeWebsite(url: string): Promise<ScrapedData> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract basic info
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = [...new Set(bodyText.match(emailRegex) || [])];
    
    // Extract phone numbers
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
    const phones = [...new Set(bodyText.match(phoneRegex) || [])];
    
    // Extract LinkedIn profiles
    const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/g;
    const linkedinProfiles = [...new Set(bodyText.match(linkedinRegex) || [])];
    
    // Extract content sections
    const aboutContent = $('section, div').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('about') || text.includes('company') || text.includes('story');
    }).first().text().trim();
    
    const servicesContent = $('section, div').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('service') || text.includes('offer') || text.includes('solution');
    }).first().text().trim();
    
    const contactContent = $('section, div').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('contact') || text.includes('reach') || text.includes('get in touch');
    }).first().text().trim();
    
    return {
      url,
      title,
      metaDescription,
      bodyText,
      emails,
      phones,
      linkedinProfiles,
      aboutContent,
      servicesContent,
      contactContent,
      hasContactPage: url.toLowerCase().includes('contact'),
      hasAboutPage: url.toLowerCase().includes('about'),
      businessType: 'service',
      extractionSuccess: true
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return {
      url,
      title: '',
      metaDescription: '',
      bodyText: '',
      emails: [],
      phones: [],
      linkedinProfiles: [],
      aboutContent: '',
      servicesContent: '',
      contactContent: '',
      hasContactPage: false,
      hasAboutPage: false,
      businessType: 'unknown',
      extractionSuccess: false
    };
  }
}

// Function to search for organic leads
async function searchOrganicLeads(service: string, location: string): Promise<OrganicLead[]> {
  const organicLeads: OrganicLead[] = [];
  
  try {
    console.log(`🔍 Searching organic results for "${service}" in "${location}"`);
    
    const searchQuery = `${service} "${location}" -directory -list`;
    
    const searchResults = await getJson({
      engine: "google",
      api_key: SERPAPI_KEY,
      q: searchQuery,
      location,
      num: 20,
      hl: "en",
      gl: "us"
    });

    const organicResults = searchResults.organic_results || [];
    
    for (const result of organicResults.slice(0, 10)) {
      try {
        const domain = new URL(result.link).hostname.replace('www.', '');
        
        // Skip if already processed
        const existingLead = await Lead.findOne({ website: { $regex: domain, $options: 'i' } });
        if (existingLead) continue;
        
        // Scrape website data
        const scrapedData = await scrapeWebsite(result.link);
        
        if (scrapedData.extractionSuccess && scrapedData.emails.length > 0) {
          organicLeads.push({
            url: result.link,
            title: result.title,
            snippet: result.snippet,
            ranking: result.position || 0,
            domain,
            scrapedData,
            emailFound: true,
            emails: scrapedData.emails
          });
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing organic result ${result.link}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error searching organic leads:', error);
  }
  
  return organicLeads;
}

// Function to search for local leads using SERP API
async function searchLocalLeads(service: string, location: string): Promise<OrganicLead[]> {
  const localLeads: OrganicLead[] = [];
  
  try {
    console.log(`🗺️ Searching local results for "${service}" in "${location}"`);
    
    const searchQuery = `${service} near "${location}"`;
    
    const searchResults = await getJson({
      engine: "google",
      api_key: SERPAPI_KEY,
      q: searchQuery,
      location,
      num: 10,
      hl: "en",
      gl: "us"
    });

    const localResults = searchResults.local_results || [];
    
    for (const result of localResults.slice(0, 5)) {
      try {
        if (!result.link) continue;
        
        const domain = new URL(result.link).hostname.replace('www.', '');
        
        // Skip if already processed
        const existingLead = await Lead.findOne({ website: { $regex: domain, $options: 'i' } });
        if (existingLead) continue;
        
        // Scrape website data
        const scrapedData = await scrapeWebsite(result.link);
        
        localLeads.push({
          url: result.link,
          title: result.title,
          snippet: result.snippet || result.description || '',
          ranking: result.position || 0,
          domain,
          scrapedData,
          emailFound: scrapedData.emails.length > 0,
          emails: scrapedData.emails,
          leadSource: 'local'
        });
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing local result ${result.link}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error searching local leads:', error);
  }
  
  return localLeads;
}

// Function to enhance leads using ChatGPT for missing contact info
async function enhanceLeadsWithAI(leads: ProcessedLead[], service: string, location: string): Promise<void> {
  if (!openai) {
    console.log('⚠️ OpenAI not available, skipping AI enhancement');
    return;
  }
  
  const leadsNeedingEnhancement = leads.filter(lead => 
    !lead.email || !lead.linkedinProfile || lead.email === '' || lead.linkedinProfile === ''
  );
  
  if (leadsNeedingEnhancement.length === 0) {
    console.log('✅ All leads have complete contact information');
    return;
  }
  
  try {
    console.log(`🤖 Enhancing ${leadsNeedingEnhancement.length} leads with missing contact info...`);
    
    const prompt = `You are a lead research expert. I have ${leadsNeedingEnhancement.length} business leads for ${service} services in ${location} that need contact information enhancement.

For each business, I need you to help find:
1. Professional email address (preferably contact@, info@, hello@, or decision-maker emails)
2. LinkedIn company profile URL
3. Key decision maker name and title
4. Phone number (if easily discoverable)

Here are the businesses:
${leadsNeedingEnhancement.map((lead, index) => 
  `${index + 1}. Company: ${lead.company}
     Website: ${lead.website}
     Current Email: ${lead.email || 'MISSING'}
     Current LinkedIn: ${lead.linkedinProfile || 'MISSING'}`
).join('\n\n')}

Please provide the enhanced information in JSON format:
{
  "enhanced_leads": [
    {
      "index": 1,
      "email": "contact@company.com",
      "linkedinProfile": "linkedin.com/company/company-name",
      "decisionMaker": "John Smith",
      "title": "CEO",
      "phone": "+1234567890"
    }
  ]
}

Only include leads where you can confidently provide missing information. Use common business email patterns and actual LinkedIn URLs.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseContent = completion.choices[0].message.content;
    if (responseContent) {
      const enhancedData = JSON.parse(responseContent);
      
      // Apply enhancements to leads
      enhancedData.enhanced_leads?.forEach((enhancement: any) => {
        const leadIndex = enhancement.index - 1;
        if (leadIndex >= 0 && leadIndex < leadsNeedingEnhancement.length) {
          const lead = leadsNeedingEnhancement[leadIndex];
          
          if (enhancement.email && !lead.email) {
            lead.email = enhancement.email;
          }
          if (enhancement.linkedinProfile && !lead.linkedinProfile) {
            lead.linkedinProfile = enhancement.linkedinProfile;
          }
          if (enhancement.decisionMaker && (!lead.name || lead.name === 'Contact')) {
            lead.name = enhancement.decisionMaker;
          }
          if (enhancement.phone && !lead.phone) {
            lead.phone = enhancement.phone;
          }
          
          // Add AI enhancement tag
          if (!lead.tags.includes('ai-enhanced')) {
            lead.tags.push('ai-enhanced');
          }
        }
      });
      
      console.log(`✅ Enhanced ${enhancedData.enhanced_leads?.length || 0} leads with AI`);
    }
    
  } catch (error) {
    console.error('❌ Error enhancing leads with AI:', error);
  }
}

// Function to analyze Google Ads for all leads
async function analyzeGoogleAdsForLeads(leads: ProcessedLead[], service: string, location: string): Promise<void> {
  // Initialize with user-specific key if available
  const adsDetector = new GoogleAdsDetector(SERPAPI_KEY);
  
  console.log(`🎯 Analyzing Google Ads for ${leads.length} leads...`);
  
  for (const lead of leads) {
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
  
  const highValueCount = leads.filter(lead => lead.isHighValue).length;
  const runningAdsCount = leads.filter(lead => lead.isRunningAds).length;
  
  console.log(`✅ Google Ads analysis complete: ${runningAdsCount} running ads, ${highValueCount} high-value leads`);
}

// Function to generate high-value leads using ChatGPT (companies running ads but not ranking organically)
async function generateHighValueLeadsWithAI(service: string, location: string, targetQuantity: number): Promise<ProcessedLead[]> {
  const highValueLeads: ProcessedLead[] = [];
  
  if (!openai) {
    console.log('⚠️ OpenAI not available for generating high-value leads');
    return highValueLeads;
  }
  
  try {
    const leadsToGenerate = Math.min(15, targetQuantity); // Generate up to 15 high-value leads
    console.log(`💎 Using AI to generate ${leadsToGenerate} HIGH-VALUE leads for ${service} in ${location}...`);
    
    const prompt = `You are a business intelligence expert specializing in Google Ads and SEO analysis.

I need you to generate ${leadsToGenerate} REAL companies in ${location} that provide ${service} services and meet these HIGH-VALUE criteria:
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
      "reasoning": "Running Google Ads for 'web design NYC' spending $1500/month but ranking #18 organically"
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

Generate ${leadsToGenerate} companies that are clearly spending money on ads but struggling organically:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 4000
    });

    const responseContent = completion.choices[0].message.content;
    
    if (responseContent) {
      const aiData = JSON.parse(responseContent);
      
      console.log(`🤖 AI Response: ${aiData.high_value_leads?.length || 0} high-value leads generated`);
      
      // Process AI-generated high-value leads
      aiData.high_value_leads?.forEach((aiLead: any, index: number) => {
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
          console.log(`💎 Generated HIGH-VALUE lead: ${newLead.company} (Ads: YES, Organic: #${newLead.organicRanking})`);
        }
      });
      
      console.log(`🎯 Successfully generated ${highValueLeads.length} HIGH-VALUE leads with Google Ads!`);
    }
    
  } catch (error) {
    console.error('❌ Error generating high-value leads with AI:', error);
  }
  
  return highValueLeads;
}

// Timeout-aware service location processing
async function processServiceLocation(service: string, location: string, leadQuantity: number, includeGoogleAdsAnalysis = false, analyzeLeads = false, userId?: string): Promise<ProcessedLead[]> {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 1.5 * 60 * 1000; // 1.5 minutes (leave 30 seconds buffer)
  
  try {
    console.log(`⏰ Starting processing for ${service} in ${location} at ${new Date().toISOString()}`);
    
    // FIXED: Use production URL instead of preview URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://testqlagain.vercel.app';
    
    // Choose API endpoint based on job configuration
    const apiEndpoint = includeGoogleAdsAnalysis && analyzeLeads ? 
      `${baseUrl}/api/findleads` : // High-value analysis (multiple SERP calls)
      `${baseUrl}/api/findleads-normal`; // Simple leads (1 SERP call per service-location)
      
    const analysisType = includeGoogleAdsAnalysis && analyzeLeads ? 'high-value analysis' : 'simple lead collection';
    console.log(`📡 Using ${analysisType} API (${apiEndpoint}) for ${service} in ${location}...`);
    
    console.log(`🌐 Making cron API call to: ${apiEndpoint}`);
    console.log(`📋 Cron request payload:`, JSON.stringify({
      services: [service],
      locations: [location],
      leadQuantity: leadQuantity
    }, null, 2));

    // Check timeout before making the API call
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_EXECUTION_TIME) {
      console.log(`⏰ Timeout approaching (${elapsedTime}ms elapsed), aborting API call`);
      throw new Error('TIMEOUT_APPROACHING');
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        services: [service],
        locations: [location],
        leadQuantity: leadQuantity,
        userId: userId // Pass the user ID to the findleads API
      }),
    });

    console.log(`📡 Cron API Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Cron API call failed: ${response.status} - ${errorText}`);
      console.error(`🔍 Failed URL: ${apiEndpoint}`);
      console.error(`🔍 Environment: NODE_ENV=${process.env.NODE_ENV}, VERCEL_URL=${process.env.VERCEL_URL}`);
      throw new Error(`${analysisType} API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const leads = data.leads || [];
    
    console.log(`📊 ${analysisType} API returned ${leads.length} leads for ${service} in ${location}`);
    console.log(`📊 Cron API Response Success:`, {
      totalLeads: leads.length,
      successMessage: data.message,
      stats: data.stats
    });
    
    // Enhanced logging for debugging
    if (leads.length === 0) {
      console.error(`❌ NO LEADS FOUND! API response:`, JSON.stringify(data, null, 2));
      console.error(`🔍 Possible issues: API not working, SERPAPI_KEY missing, or location/service invalid`);
    } else {
      console.log(`✅ Sample lead:`, JSON.stringify(leads[0], null, 2));
    }
    
    console.log(`💰 SERP API usage: ${includeGoogleAdsAnalysis && analyzeLeads ? 'HIGH (Google Ads analysis included)' : 'MINIMAL (basic search only)'}`);
    
    const totalTime = Date.now() - startTime;
    console.log(`⏰ Processing completed in ${totalTime}ms for ${service} in ${location}`);
    
    return leads;
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error processing ${service} in ${location} after ${totalTime}ms:`, error);
    
    // If it's a timeout error, re-throw it so the job can be marked as needing continuation
    if (error.message === 'TIMEOUT_APPROACHING') {
      throw error;
    }
    
    return [];
  }
}

// Main cron job handler
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify this is a legitimate cron job request
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if this is a Vercel cron job (they send 'vercel-cron/1.0' as user agent)
    const isVercelCron = userAgent === 'vercel-cron/1.0';
    
    // In production, verify either the cron secret OR that it's a Vercel cron job
    if (process.env.NODE_ENV === 'production') {
      const hasValidAuth = authHeader === `Bearer ${cronSecret}`;
      
      if (!hasValidAuth && !isVercelCron) {
        console.log('❌ Unauthorized cron job request');
        console.log(`   User-Agent: ${userAgent}`);
        console.log(`   Authorization: ${authHeader ? 'Present' : 'Missing'}`);
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    console.log('✅ Authorized cron job request');
    console.log(`   User-Agent: ${userAgent}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    
    return await processNextJob();
  } catch (error: any) {
    return handleJobError(error);
  }
}

// NEW: POST handler for manual triggering (development and testing)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 Manual trigger: Processing jobs...');
    return await processNextJob();
  } catch (error: any) {
    return handleJobError(error);
  }
}

// Shared job processing logic
async function processNextJob(): Promise<NextResponse> {
  console.log('🔄 Processing pending lead collection jobs...');
  await dbConnect();
  
  // Get next pending job
  const pendingJob = await JobQueue.findOne({
    status: 'pending'
  }).sort({
    priority: -1,
    createdAt: 1
  }) as IJobQueue | null;
  
  // Check if this is a running job that needs to continue
  const runningJob = await JobQueue.findOne({
    status: 'running'
  }).sort({
    priority: -1,
    updatedAt: 1
  }) as IJobQueue | null;
  
  console.log(`📊 Job Status Check:`);
  console.log(`   Pending jobs found: ${pendingJob ? 1 : 0}`);
  console.log(`   Running jobs found: ${runningJob ? 1 : 0}`);
  
  // Debug: Check all jobs in database
  const allJobs = await JobQueue.find({}).lean();
  console.log(`📊 Total jobs in database: ${allJobs.length}`);
  
  const runningJobsCount = allJobs.filter(job => job.status === 'running').length;
  const pendingJobsCount = allJobs.filter(job => job.status === 'pending').length;
  console.log(`📊 Job counts by status:`);
  console.log(`   Running: ${runningJobsCount}`);
  console.log(`   Pending: ${pendingJobsCount}`);
  console.log(`   Other: ${allJobs.length - runningJobsCount - pendingJobsCount}`);
  
  if (runningJob) {
    console.log(`   Running job: ${runningJob.jobId} (Step ${runningJob.currentStep}/${runningJob.totalSteps})`);
  }
  if (pendingJob) {
    console.log(`   Pending job: ${pendingJob.jobId} (Step ${pendingJob.currentStep}/${pendingJob.totalSteps})`);
  }
  
  // Debug: Show all running jobs
  if (runningJobsCount > 0) {
    console.log(`📊 All running jobs:`);
    allJobs.filter(job => job.status === 'running').forEach(job => {
      console.log(`   - ${job.jobId}: Step ${job.currentStep}/${job.totalSteps} (${job.progress}%)`);
    });
  }
  
  if (!pendingJob && !runningJob) {
    console.log('✅ No pending or running jobs found');
    return NextResponse.json({
      success: true,
      message: 'No pending or running jobs found'
    });
  }
  
  let jobToProcess: IJobQueue | null = runningJob || pendingJob;
  
  // If we found a running job, use that. Otherwise, start the pending job
  if (!runningJob && pendingJob) {
    jobToProcess = pendingJob;
    jobToProcess.status = 'running';
    jobToProcess.startedAt = new Date();
    jobToProcess.currentStep = 0;
    console.log(`🚀 Starting new job: ${jobToProcess.jobId}`);
  } else if (runningJob) {
    console.log(`🔄 Continuing running job: ${runningJob.jobId}`);
  }
  
  // Ensure jobToProcess is not null
  if (!jobToProcess) {
    console.log('❌ No job to process found');
    return NextResponse.json({
      success: false,
      error: 'No job to process found'
    });
  }
  
  // At this point, jobToProcess is guaranteed to be not null
  const job = jobToProcess as IJobQueue;
  
  job.updatedAt = new Date();
  await job.save();
  
  const { services, locations, leadQuantity, includeGoogleAdsAnalysis = false, analyzeLeads = false } = job;
  const totalSteps = services.length * locations.length;
  
  console.log(`🚀 Processing job ${job.jobId}: Step ${job.currentStep + 1}/${totalSteps}`);
  console.log(`🎯 Job type: ${includeGoogleAdsAnalysis && analyzeLeads ? 'HIGH-VALUE ANALYSIS' : 'NORMAL LEAD COLLECTION'}`);
  
  // Calculate current service and location indices
  const currentStep = job.currentStep;
  const serviceIndex = Math.floor(currentStep / locations.length);
  const locationIndex = currentStep % locations.length;
  
  // Check if we've completed all steps
  if (currentStep >= totalSteps) {
    console.log(`✅ Job ${job.jobId} completed all ${totalSteps} steps`);
    
    job.status = 'completed';
    job.completedAt = new Date();
    job.progress = 100;
    job.progressMessage = `Completed: ${totalSteps} service-location combinations processed`;
    await job.save();
    
    return NextResponse.json({
      success: true,
      message: `Job ${job.jobId} completed successfully. Total leads collected: ${job.totalLeadsCollected}`,
      jobId: job.jobId,
      status: 'completed',
      totalLeadsCollected: job.totalLeadsCollected
    });
  }
  
  // Get current service and location
  const currentService = services[serviceIndex];
  const currentLocation = locations[locationIndex];
  
  try {
    // Update progress for current step
    const progress = Math.round(((currentStep + 1) / totalSteps) * 100);
    job.progress = Math.min(100, Math.max(0, progress));
    job.progressMessage = `Processing: ${currentService} in ${currentLocation} (${currentStep + 1}/${totalSteps})`;
    job.currentService = currentService;
    job.currentLocation = currentLocation;
    await job.save();
    
    console.log(`📊 Step ${currentStep + 1}/${totalSteps}: ${currentService} in ${currentLocation}`);
    
    // Process this single service-location combination with timeout awareness
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 1.5 * 60 * 1000; // 1.5 minutes (leave 30 seconds buffer)
    
    try {
              const leads = await processServiceLocation(currentService, currentLocation, leadQuantity, includeGoogleAdsAnalysis, analyzeLeads, job.userId);
      
      // 🔍 ENRICH LEADS WITH COMPANY OWNER INFORMATION
      console.log(`🔍 Enriching ${leads.length} leads with company owner information...`);
      const enrichedLeads = await enrichLeadsWithOwners(leads, job.userId || 'admin');
      console.log(`✅ Lead enrichment completed`);
      
      let stepLeadsCollected = 0;
      
      // Save leads to database with enhanced duplicate detection
      for (const lead of enrichedLeads) {
        try {
          // Check timeout before processing each lead
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > MAX_EXECUTION_TIME) {
            console.log(`⏰ Timeout approaching (${elapsedTime}ms elapsed), stopping lead processing`);
            break;
          }
          
          // FIXED: Only save leads with valid email addresses
          if (!lead.email || lead.email.trim() === '' || !lead.email.includes('@')) {
            console.log(`⚠️ Skipping lead without valid email: ${lead.company} - ${lead.email}`);
            continue;
          }
          
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
            console.log(`💾 Creating lead for ${lead.company}${lead.companyOwner ? ` (Owner: ${lead.companyOwner})` : ''}`);
                    const newLead = new Lead({
          ...lead,
          // Map processed lead fields to database schema
          googleAds: lead.isRunningAds || false,
          googleAdsChecked: lead.isRunningAds !== undefined, // Mark as checked if we have ads data
          isHighValue: lead.isHighValue || false,
          assignedTo: job.userId || "quasar-admin", // Use user ID from job
          leadsCreatedBy: job.userId || "quasar-admin", // Use user ID from job
          createdAt: new Date(),
          updatedAt: new Date()
        });
            await newLead.save();
            stepLeadsCollected++;
            
            console.log(`💾 Saved NEW lead: ${lead.company} - ${lead.email} - isHighValue: ${lead.isHighValue}`);
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
      
      // Update job progress and move to next step
      job.currentStep = currentStep + 1;
      job.totalLeadsCollected += stepLeadsCollected;
      job.collectedLeads = stepLeadsCollected; // Current step leads
      await job.save();
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ Step ${currentStep + 1} completed in ${totalTime}ms: ${stepLeadsCollected} leads collected for ${currentService} in ${currentLocation}`);
      
      // Check if this was the last step
      if (currentStep + 1 >= totalSteps) {
        console.log(`🎉 Job ${job.jobId} completed all steps!`);
        
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress = 100;
        job.progressMessage = `Completed: All ${totalSteps} service-location combinations processed`;
        await job.save();
        
        return NextResponse.json({
          success: true,
          message: `Job ${job.jobId} completed successfully. Total leads collected: ${job.totalLeadsCollected}`,
          jobId: job.jobId,
          status: 'completed',
          totalLeadsCollected: job.totalLeadsCollected,
          currentStep: job.currentStep,
          totalSteps: totalSteps
        });
      } else {
        // Job is still running, will continue in next cron execution
        console.log(`⏳ Job ${job.jobId} step ${currentStep + 1} completed. Next step will be processed in next cron execution.`);
        
        return NextResponse.json({
          success: true,
          message: `Step ${currentStep + 1}/${totalSteps} completed: ${currentService} in ${currentLocation}. ${stepLeadsCollected} leads collected. Next step will be processed in next cron execution.`,
          jobId: job.jobId,
          status: 'running',
          currentStep: job.currentStep,
          totalSteps: totalSteps,
          stepLeadsCollected: stepLeadsCollected,
          totalLeadsCollected: job.totalLeadsCollected
        });
      }
      
    } catch (timeoutError: any) {
      // Handle timeout errors specifically
      if (timeoutError.message === 'TIMEOUT_APPROACHING') {
        const elapsedTime = Date.now() - startTime;
        console.log(`⏰ TIMEOUT APPROACHING: Job processing stopped after ${elapsedTime}ms`);
        console.log(`🔄 Job ${job.jobId} will continue from step ${currentStep + 1} in next cron execution`);
        
        // Save current progress before timeout
        job.progressMessage = `Timeout: Processing ${currentService} in ${currentLocation} (${currentStep + 1}/${totalSteps}) - will continue in next execution`;
        job.updatedAt = new Date();
        await job.save();
        
        return NextResponse.json({
          success: true,
          message: `Timeout approaching: Job ${job.jobId} step ${currentStep + 1} processing stopped. Will continue in next cron execution.`,
          jobId: job.jobId,
          status: 'running',
          currentStep: job.currentStep,
          totalSteps: totalSteps,
          timeout: true
        });
      } else {
        // Re-throw other errors
        throw timeoutError;
      }
    }
    
  } catch (error) {
    console.error(`❌ Error processing step ${currentStep + 1} for job ${job.jobId}:`, error);
    
    // Handle job error
    return await handleJobError(error, job);
  }
}

// Shared error handling logic
async function handleJobError(error: any, job?: IJobQueue): Promise<NextResponse> {
  console.error('Error in job processing:', error);
  
  // If there was a job being processed, mark it as failed
  try {
    let jobToMark = job;
    if (!jobToMark) {
      const runningJob = await JobQueue.findOne({ status: 'running' });
      if (runningJob) {
        jobToMark = runningJob;
      }
    }
    
    if (jobToMark) {
      jobToMark.status = 'failed';
      jobToMark.errorMessage = error.message || 'Unknown error occurred';
      jobToMark.completedAt = new Date();
      jobToMark.updatedAt = new Date();
      await jobToMark.save();
      console.log(`❌ Marked job ${jobToMark.jobId} as failed: ${error.message}`);
    }
  } catch (updateError) {
    console.error('Error updating failed job:', updateError);
  }
  
  return NextResponse.json({
    success: false,
    error: error.message || 'Job processing failed'
  }, { status: 500 });
}