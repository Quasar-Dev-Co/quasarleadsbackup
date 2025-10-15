import { NextRequest, NextResponse } from 'next/server';
import { getJson } from 'serpapi';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import User from '@/models/userSchema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

// Basic type definitions for normal leads
interface ScrapedData {
  url: string;
  title: string;
  emails: string[];
  phones: string[];
  extractionSuccess: boolean;
}

interface BasicLead {
  url: string;
  title: string;
  snippet: string;
  ranking: number;
  domain: string;
  scrapedData: ScrapedData;
  emailFound: boolean;
  emails: string[];
  // NEW: Google Maps business data
  businessName: string;
  phone: string;
  address: string;
  rating: number;
  reviews: number;
  businessType: string;
  placeId: string;
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
  leadSource: 'organic' | 'local';
}

// Helper to validate required credential keys
function requireCredentials(creds: Record<string, string | undefined>, keys: string[]): { ok: boolean; missing: string[] } {
  const missing = keys.filter((k) => !creds[k]);
  return { ok: missing.length === 0, missing };
}
const SCRAPE_TIMEOUT: number = 8000; // Shorter timeout for faster processing
const RATE_LIMIT_DELAY: number = 1000; // Standard delay

// Basic rate limiter
const rateLimit = (): Promise<void> => new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

// Simple email extraction for normal leads
function extractBasicEmails(html: string, text: string): string[] {
  const emails = new Set<string>();
  
  const emailPattern = /\b[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}\b/g;
  
  const sources = [html, text];
  
  sources.forEach((source: string) => {
    if (!source) return;
    
    const matches = source.match(emailPattern);
    if (matches) {
      matches.forEach((email: string) => {
        const cleanEmail = email.replace(/\s+/g, '').toLowerCase().trim();
        
        if (cleanEmail.includes('@') && cleanEmail.includes('.')) {
          // Basic validation - avoid obvious spam emails
          if (!cleanEmail.includes('example') && 
              !cleanEmail.includes('yoursite') && 
              !cleanEmail.includes('placeholder') &&
              !cleanEmail.includes('test@')) {
            emails.add(cleanEmail);
          }
        }
      });
    }
  });

  return Array.from(emails);
}

// Simple phone extraction
function extractBasicPhones(text: string): string[] {
  const phones = new Set<string>();
  const phoneRegex = /(?:\+\d{1,4}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?)?(?:\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{0,4})/g;
  const phoneMatches = text.match(phoneRegex);
  
  if (phoneMatches) {
    phoneMatches.forEach((phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 15) {
        phones.add(phone);
      }
    });
  }

  return Array.from(phones);
}

function cleanDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

// Deduplicate leads by domain to avoid collecting the same business multiple times
function deduplicateLeads(leads: BasicLead[]): BasicLead[] {
  const seenDomains = new Set<string>();
  const uniqueLeads: BasicLead[] = [];
  
  for (const lead of leads) {
    if (!seenDomains.has(lead.domain)) {
      seenDomains.add(lead.domain);
      uniqueLeads.push(lead);
    }
  }
  
  console.log(`🔧 Deduplication: ${leads.length} → ${uniqueLeads.length} unique leads (removed ${leads.length - uniqueLeads.length} duplicates)`);
  return uniqueLeads;
}

// Basic website scraping for normal leads
async function scrapeWebsiteBasic(url: string): Promise<ScrapedData> {
  const defaultData: ScrapedData = {
    url,
    title: '',
    emails: [],
    phones: [],
    extractionSuccess: false
  };

  try {
    console.log(`📄 Basic scraping: ${url}`);
    
    const response = await axios.get(url, {
      timeout: SCRAPE_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract basic information
    const title = $('title').text().trim() || $('h1').first().text().trim();
    const bodyText = $('body').text();
    const html = response.data;
    
    // Extract emails and phones
    const emails = extractBasicEmails(html, bodyText);
    const phones = extractBasicPhones(bodyText);
    
    return {
      url,
      title,
      emails,
      phones,
      extractionSuccess: true
    };
    
  } catch (error) {
    console.log(`❌ Basic scraping failed for ${url}: ${error}`);
    return defaultData;
  }
}

// 🗺️ GOOGLE MAPS SEARCH - Real business leads with names, phones, addresses!
async function searchGoogleMapsBusiness(service: string, location: string, serpApiKey: string, searchType: string = 'basic'): Promise<BasicLead[]> {
  const leads: BasicLead[] = [];
  
  if (!serpApiKey) {
    throw new Error('SERPAPI_KEY is not configured');
  }

  try {
    console.log(`🗺️ Google Maps Business Search [${searchType}]: ${service} in ${location}`);
    
    // GOOGLE MAPS SEARCH - Much better business data!
    const searchParams = {
      engine: "google_maps", // 🎯 SWITCHED TO GOOGLE MAPS!
      q: `${service} ${location}`, 
      api_key: serpApiKey,
      type: "search", // Business search
      location: location,
      hl: "en"
    };

    console.log(`📡 Google Maps SERPAPI Request:`, JSON.stringify(searchParams, null, 2));
    
    const response = await getJson(searchParams);
    
    console.log(`📨 Google Maps SERPAPI Response keys:`, Object.keys(response));
    
    if (response.error) {
      console.error(`❌ Google Maps SERPAPI Error:`, response.error);
      throw new Error(`Google Maps SERPAPI Error: ${response.error}`);
    }
    
    // Google Maps returns LOCAL RESULTS with rich business data
    const localResults = response.local_results || [];
    
    console.log(`📊 Found ${localResults.length} Google Maps business results`);
    
    if (localResults.length === 0) {
      console.error(`❌ NO GOOGLE MAPS RESULTS! Full response:`, JSON.stringify(response, null, 2));
    }
    
    // Process ALL Google Maps business results (no scraping needed!)
    for (let i = 0; i < localResults.length; i++) {
      const business = localResults[i];
      
      try {
        console.log(`🏢 Processing business: ${business.title || 'Unknown'}`);
        
        // Extract structured business data from Google Maps
        const businessName = business.title || '';
        const phone = business.phone || '';
        const address = business.address || '';
        const website = business.website || business.link || '';
        const rating = business.rating || 0;
        const reviews = business.reviews || 0;
        const businessType = business.type || service;
        const placeId = business.place_id || '';
        const snippet = business.snippet || business.description || '';
        
        // Basic scraping only if website exists (for emails)
        let scrapedData: ScrapedData = {
          url: website,
          title: businessName,
          emails: [],
          phones: [phone].filter(p => p),
          extractionSuccess: !!businessName
        };
        
        // Quick email scraping if website available
        if (website && website.startsWith('http')) {
          try {
            await new Promise(resolve => setTimeout(resolve, 300)); // Faster for maps
            scrapedData = await scrapeWebsiteBasic(website);
            // Keep the phone from Google Maps if scraping didn't find one
            if (scrapedData.phones.length === 0 && phone) {
              scrapedData.phones = [phone];
            }
          } catch (error) {
            console.log(`⚠️ Website scraping failed for ${businessName}, using Maps data only`);
          }
        }
        
        // Create lead with rich Google Maps data
        leads.push({
          url: website,
          title: businessName,
          snippet: snippet,
          ranking: i + 1,
          domain: website ? cleanDomain(website) : businessName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          scrapedData,
          emailFound: scrapedData.emails.length > 0,
          emails: scrapedData.emails,
          // 🎯 RICH GOOGLE MAPS BUSINESS DATA
          businessName,
          phone,
          address,
          rating,
          reviews, 
          businessType,
          placeId
        });
        
        console.log(`✅ Google Maps lead: ${businessName} | Phone: ${phone || 'N/A'} | Email: ${scrapedData.emails[0] || 'N/A'} | Rating: ${rating}⭐`);
        
      } catch (error) {
        console.log(`❌ Error processing Google Maps business ${i + 1}: ${error}`);
      }
    }
    
  } catch (error) {
    console.error(`Error in Google Maps ${searchType} search:`, error);
  }
  
  return leads;
}

// 🗺️ GOOGLE MAPS VARIATION 1: Business search with "best" keyword
async function searchGoogleMapsBest(service: string, location: string, serpApiKey: string): Promise<BasicLead[]> {
  return await searchGoogleMapsBusiness(`best ${service}`, location, serpApiKey, 'best');
}

// 🗺️ GOOGLE MAPS VARIATION 2: Business search with "top" keyword  
async function searchGoogleMapsTop(service: string, location: string, serpApiKey: string): Promise<BasicLead[]> {
  return await searchGoogleMapsBusiness(`top ${service}`, location, serpApiKey, 'top');
}

// 🗺️ GOOGLE MAPS VARIATION 3: Business search with "companies" keyword
async function searchGoogleMapsCompanies(service: string, location: string, serpApiKey: string): Promise<BasicLead[]> {
  return await searchGoogleMapsBusiness(`${service} companies`, location, serpApiKey, 'companies');
}

// 🗺️ GOOGLE MAPS VARIATION 4: Business search with "services" keyword
async function searchGoogleMapsServices(service: string, location: string, serpApiKey: string): Promise<BasicLead[]> {
  return await searchGoogleMapsBusiness(`${service} services`, location, serpApiKey, 'services');
}

// 🗺️ Format Google Maps leads with rich business data for database
function formatGoogleMapsLeads(mapLeads: BasicLead[], service: string, location: string): ProcessedLead[] {
  const processedLeads: ProcessedLead[] = [];
  
  mapLeads.forEach((lead, index) => {
    // Use Google Maps structured data first, fallback to scraped data
    const email = lead.emails[0] || '';
    const phone = lead.phone || lead.scrapedData.phones[0] || '';
    const businessName = lead.businessName || lead.title.split(' - ')[0].split(' | ')[0].trim();
    const website = lead.url || '';
    const address = lead.address || '';
    const rating = lead.rating || 0;
    const reviews = lead.reviews || 0;
    
    // Rich description with Google Maps data
    const description = [
      lead.snippet,
      address ? `Address: ${address}` : '',
      rating > 0 ? `Rating: ${rating}⭐ (${reviews} reviews)` : '',
      lead.businessType ? `Type: ${lead.businessType}` : ''
    ].filter(Boolean).join(' | ');
    
    processedLeads.push({
      name: businessName,
      company: businessName,
      email: email, // Can be empty - users can find emails later
      phone: phone, // From Google Maps or website scraping
      website: website,
      linkedinProfile: '',
      description: description, // Rich description with Maps data
      location: address || location, // Use Google Maps address if available
      status: 'active',
      source: 'google-maps-leads',
      tags: [
        service, 
        location, 
        'google-maps', 
        'real-business-data',
        email ? 'has-email' : 'needs-email',
        phone ? 'has-phone' : 'needs-phone',
        rating > 4 ? 'high-rated' : rating > 0 ? 'rated' : 'unrated',
        reviews > 50 ? 'popular' : reviews > 10 ? 'established' : 'new'
      ],
      leadSource: 'local' // All Google Maps results are local businesses
    });
  });
  
  console.log(`📊 Formatted ${processedLeads.length} Google Maps leads with structured business data`);
  return processedLeads;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { services, locations, leadQuantity = 20, userId } = body;
    
    // Load credentials from the user's profile
    await dbConnect();
    let serpApiKey = '';
    if (userId) {
      const user = await User.findById(userId).lean();
      if (user && typeof user === 'object' && 'credentials' in user) {
        serpApiKey = user.credentials?.SERPAPI_KEY || '';
      }
    }
    
    const credsCheck = requireCredentials({ SERPAPI_KEY: serpApiKey }, ['SERPAPI_KEY']);
    if (!credsCheck.ok) {
      return NextResponse.json({
        success: false,
        error: `Missing credentials: ${credsCheck.missing.join(', ')}`,
        missingCredentials: credsCheck.missing
      }, { status: 400 });
    }
    
    // Get user ID from request if not provided in body
    const finalUserId = userId || request.nextUrl.searchParams.get('userId');
    
    if (!finalUserId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 401 });
    }
    
    if (!services || !locations) {
      return NextResponse.json({
        success: false,
        error: 'Services and locations are required'
      }, { status: 400 });
    }
    
    // DB already connected above
    
    const servicesList: string[] = Array.isArray(services) ? services : [services];
    const locationsList: string[] = Array.isArray(locations) ? locations : [locations];
    
    let allProcessedLeads: ProcessedLead[] = [];
    
    console.log(`🚀 Starting NORMAL lead collection for ${servicesList.length} services x ${locationsList.length} locations`);
    
    // Process each service-location combination
    for (const service of servicesList) {
      for (const location of locationsList) {
        try {
          console.log(`\n🔄 Processing: ${service} in ${location} (Normal Collection)`);
          
          // 🎯 OPTIMIZED FOR SIMPLE SEARCHES: Only use 1 SERP call for 1 service + 1 location
          const isSimpleSearch = servicesList.length === 1 && locationsList.length === 1;
          
          let allMapLeads: BasicLead[] = [];
          
          if (isSimpleSearch) {
            // ✅ SIMPLE SEARCH: Only 1 SERP call for 1 service + 1 location (1 SERP coin)
            console.log(`🗺️ Running SINGLE Google Maps search (1 SERP coin) for simple request...`);
            const basicMapLeads = await searchGoogleMapsBusiness(service, location, serpApiKey, 'basic');
            allMapLeads = basicMapLeads;
            console.log(`📊 Simple search complete: ${allMapLeads.length} leads using 1 SERP coin`);
          } else {
            // 🗺️ COMPREHENSIVE SEARCH: Multiple search variations for bulk requests (5 SERP coins)
            console.log(`🗺️ Running MULTIPLE Google Maps searches for comprehensive lead collection...`);
            const [
              basicMapLeads,
              bestMapLeads, 
              topMapLeads,
              companiesMapLeads,
              servicesMapLeads
            ] = await Promise.all([
              searchGoogleMapsBusiness(service, location, serpApiKey, 'basic'), // Basic Google Maps search
              searchGoogleMapsBest(service, location, serpApiKey), // "best X" Google Maps search
              searchGoogleMapsTop(service, location, serpApiKey), // "top X" Google Maps search  
              searchGoogleMapsCompanies(service, location, serpApiKey), // "X companies" Google Maps search
              searchGoogleMapsServices(service, location, serpApiKey) // "X services" Google Maps search
            ]);
            
            // Combine all Google Maps results and deduplicate by business name/domain
            allMapLeads = deduplicateLeads([
              ...basicMapLeads, 
              ...bestMapLeads, 
              ...topMapLeads, 
              ...companiesMapLeads, 
              ...servicesMapLeads
            ]);
            console.log(`📊 Comprehensive search complete: ${allMapLeads.length} leads using 5 SERP coins`);
          }
          
          console.log(`🔧 After Google Maps deduplication: ${allMapLeads.length} unique business leads`);
          
          // Format Google Maps leads with rich business data
          const processedLeads = formatGoogleMapsLeads(allMapLeads, service, location);
          allProcessedLeads = allProcessedLeads.concat(processedLeads);
          
          console.log(`✅ Completed ${service} in ${location}: ${processedLeads.length} normal leads found`);
          
          // Add delay between locations
          await rateLimit();
          
        } catch (error) {
          console.error(`❌ Error processing ${service} in ${location}:`, error);
        }
      }
    }
    
    // Limit results based on requested quantity
    const finalLeads = allProcessedLeads.slice(0, parseInt(leadQuantity.toString()));
    
    // 🚨 BUG FIX: SAVE LEADS TO DATABASE!
    console.log(`💾 Saving ${finalLeads.length} leads to database...`);
    let savedCount = 0;
    
    for (const leadData of finalLeads) {
      try {
        // Check if lead already exists (by email or company name)
        const existingLead = await Lead.findOne({
          $or: [
            { email: leadData.email },
            { name: leadData.name, company: leadData.company }
          ]
        });
        
        if (!existingLead && leadData.name && leadData.company) {
                  // Create new lead
        const newLead = new Lead({
          name: leadData.name,
          company: leadData.company,
          email: leadData.email || '',
          phone: leadData.phone || '',
          website: leadData.website || '',
          linkedinProfile: leadData.linkedinProfile || '',
          description: leadData.description || '',
          location: leadData.location || '',
          status: 'active',
          source: leadData.source || 'google-maps-leads',
          tags: leadData.tags || [],
          leadSource: leadData.leadSource || 'local',
          assignedTo: finalUserId, // Use the user ID from the request
          leadsCreatedBy: finalUserId, // Use the user ID from the request
          createdAt: new Date(),
          updatedAt: new Date()
        });
          
          await newLead.save();
          savedCount++;
          console.log(`✅ Saved lead: ${leadData.name} - ${leadData.company}`);
        } else {
          console.log(`⚠️ Skipped duplicate: ${leadData.name} - ${leadData.company}`);
        }
      } catch (saveError) {
        console.error(`❌ Error saving lead ${leadData.name}:`, saveError);
      }
    }
    
    console.log(`💾 Database save complete: ${savedCount}/${finalLeads.length} leads saved`);
    
    // Calculate SERP usage
    const isSimpleSearch = servicesList.length === 1 && locationsList.length === 1;
    const serpCoinsPerCombination = isSimpleSearch ? 1 : 5;
    const totalSerpCoins = servicesList.length * locationsList.length * serpCoinsPerCombination;
    
    console.log(`🎉 Google Maps lead collection completed: ${finalLeads.length} REAL business leads collected and ${savedCount} saved to database`);
    console.log(`💰 SERP API usage: ${totalSerpCoins} coins (${serpCoinsPerCombination} per service-location combination)`);
    
    return NextResponse.json({
      success: true,
      leads: finalLeads,
      message: `Successfully collected ${finalLeads.length} real business leads and saved ${savedCount} to database using ${totalSerpCoins} SERP coin${totalSerpCoins > 1 ? 's' : ''} (${serpCoinsPerCombination} per service-location combination)`,
      stats: {
        totalLeads: finalLeads.length,
        savedLeads: savedCount,
        skippedDuplicates: finalLeads.length - savedCount,
        businessLeads: finalLeads.length, // All are real businesses from Google Maps
        withEmails: finalLeads.filter(l => l.email).length,
        withPhones: finalLeads.filter(l => l.phone).length,
        withAddresses: finalLeads.filter(l => l.location && l.location !== 'Miami').length,
        highRated: finalLeads.filter(l => l.tags.includes('high-rated')).length,
        totalSerpCoins,
        serpCoinsPerCombination,
        searchType: isSimpleSearch ? 'Simple (1 SERP coin)' : 'Comprehensive (5 SERP coins)',
        apiUsage: 'Google Maps - Structured business data'
      },
      improvements: [
        '🗺️ Real business names from Google Maps',
        '📞 Phone numbers included',
        '📍 Business addresses included', 
        '⭐ Ratings and reviews data',
        '🏢 Business type classification',
        isSimpleSearch ? '🎯 OPTIMIZED: 1 search for simple requests' : '🔍 COMPREHENSIVE: 5 search variations for maximum coverage',
        '⚡ Faster processing (300ms delays)',
        '🎯 No website scraping needed for basic data'
      ]
    });
    
  } catch (error: any) {
    console.error('Normal lead collection error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to collect normal leads'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Google Maps Lead Collection API - OPTIMIZED SERP Usage',
    description: 'Cost-optimized real business lead collection using Google Maps SERP API',
    serpUsage: {
      simple: '1 service + 1 location = 1 SERP coin (single search)',
      comprehensive: 'Multiple services/locations = 5 SERP coins per combination (comprehensive search)'
    },
    features: [
      '🗺️ Google Maps business search',
      '🏢 Real business names and information', 
      '📞 Phone numbers from Google Maps',
      '📍 Business addresses included',
      '⭐ Ratings and reviews data',
      '🎯 SMART SERP USAGE: 1 coin for simple, 5 coins for comprehensive',
      '⚡ Fast processing with minimal scraping',
      '🎯 Structured business data (no guessing)'
    ],
    searchTypes: {
      simple: ['Basic business search (1 SERP coin)'],
      comprehensive: [
        'Basic business search',
        'Best [service] search',
        'Top [service] search',
        '[Service] companies search',
        '[Service] services search'
      ]
    }
  });
} 