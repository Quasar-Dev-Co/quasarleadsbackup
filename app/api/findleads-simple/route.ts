import { NextRequest, NextResponse } from 'next/server';
import { getJson } from 'serpapi';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import User from '@/models/userSchema';

// Helper to validate required credential keys
function requireCredentials(creds: Record<string, string | undefined>, keys: string[]): { ok: boolean; missing: string[] } {
  const missing = keys.filter((k) => !creds[k]);
  return { ok: missing.length === 0, missing };
}

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

interface SimpleLead {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  scrapedData: ScrapedData;
  emailFound: boolean;
  emails: string[];
  source: 'organic' | 'local';
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
  isHighValue: boolean;
}

// Enhanced email extraction with better accuracy
function extractBusinessEmails(html: string, text: string, domain: string): string[] {
  const emails = new Set<string>();
  
  // More comprehensive email regex patterns
  const emailPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/g
  ];
  
  // Extract from both HTML and text
  const content = html + ' ' + text;
  
  emailPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        let email = match.replace('mailto:', '').trim();
        if (email && isValidBusinessEmail(email, domain)) {
          emails.add(email.toLowerCase());
        }
      });
    }
  });
  
  // Look specifically in common email sections
  const emailSections = [
    'contact', 'about', 'footer', 'header', 'info@', 'hello@', 'support@',
    'sales@', 'contact@', 'admin@', 'team@', 'mail@', 'help@', 'service@',
    'office@', 'business@', 'enquiry@', 'inquiry@', 'general@'
  ];
  
  emailSections.forEach(section => {
    const sectionRegex = new RegExp(`${section}[\\s\\S]{0,200}?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,})`, 'gi');
    const matches = content.match(sectionRegex);
    if (matches) {
      matches.forEach(match => {
        const emailMatch = match.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/);
        if (emailMatch && isValidBusinessEmail(emailMatch[0], domain)) {
          emails.add(emailMatch[0].toLowerCase());
        }
      });
    }
  });
  
  return Array.from(emails);
}

// Enhanced email validation
function isValidBusinessEmail(email: string, domain: string): boolean {
  if (!email || !email.includes('@') || !email.includes('.')) return false;
  
  const emailLower = email.toLowerCase();
  const emailDomain = emailLower.split('@')[1];
  const siteDomain = domain.toLowerCase().replace('www.', '');
  
  // Skip obviously invalid emails
  const invalidPatterns = [
    'example.com', 'test.com', 'yoursite.com', 'yourdomain.com',
    'placeholder.com', 'sample.com', 'demo.com', 'tempuri.org',
    '.jpg', '.png', '.pdf', '.gif', '.jpeg', '.svg', '.doc', '.docx',
    'noreply@', 'no-reply@', 'donotreply@', 'postmaster@',
    'test@', 'admin@example', 'user@example', 'info@yoursite',
    'webmaster@', 'abuse@', 'spam@', 'mailerdaemon@',
    'your@email.com', 'your-email@', 'email@website.com',
    'info@company.com', 'contact@yourcompany.com', // Generic placeholders
    'firstname.lastname@', '@companyname.com', '@yourcompany'
  ];
  
  if (invalidPatterns.some(pattern => emailLower.includes(pattern))) {
    return false;
  }
  
  // Prefer emails that match the website domain
  if (emailDomain && siteDomain) {
    const domainParts = siteDomain.split('.');
    const emailDomainParts = emailDomain.split('.');
    
    // Check if domains match or are similar
    if (domainParts[0] && emailDomainParts[0] && 
        (domainParts[0] === emailDomainParts[0] || emailDomain === siteDomain)) {
      return true;
    }
  }
  
  // Allow other professional business emails
  const businessDomains = ['.com', '.net', '.org', '.co', '.io', '.biz'];
  const hasBusinessDomain = businessDomains.some(domain => emailLower.endsWith(domain));
  
  return hasBusinessDomain && emailLower.length >= 5 && emailLower.length <= 50;
}

// Enhanced phone extraction
function extractPhones(text: string): string[] {
  const phones = new Set<string>();
  
  const phonePatterns = [
    /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    /(\+?[1-9]\d{0,3}[-.\s]?)?\(?(\d{3,4})\)?[-.\s]?(\d{3,4})[-.\s]?(\d{3,5})/g
  ];
  
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/[^\d+]/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 15) {
          phones.add(match.trim());
        }
      });
    }
  });
  
  return Array.from(phones).slice(0, 3); // Limit to 3 phone numbers
}

// Extract LinkedIn profiles
function extractLinkedInProfiles(html: string): string[] {
  const profiles = new Set<string>();
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9\-]+)/g;
  
  let match;
  while ((match = linkedinRegex.exec(html)) !== null) {
    const fullUrl = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
    profiles.add(fullUrl);
  }
  
  return Array.from(profiles).slice(0, 2); // Limit to 2 profiles
}

// Clean domain helper
function cleanDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0];
  }
}

// Enhanced website scraping with improved error handling and retries
async function scrapeWebsiteForEmails(url: string, retryCount = 0): Promise<ScrapedData> {
  const defaultData: ScrapedData = {
    url,
    title: 'Error',
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
    businessType: 'Unknown',
    extractionSuccess: false
  };

  const maxRetries = 2;
  
  try {
    console.log(`🌐 Scraping: ${url}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
    
    // Enhanced headers to avoid blocking
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
    ];
    
    const response = await axios.get(url, {
      timeout: 12000, // Increased timeout
      headers: {
        'User-Agent': userAgents[retryCount % userAgents.length],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400 // Accept redirects
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove script and style elements for cleaner text extraction
    $('script, style, noscript').remove();
    
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Unknown Company';
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Extract domain for email validation
    const domain = cleanDomain(url);
    
    // Enhanced email extraction
    const emails = extractBusinessEmails(html, bodyText, domain);
    
    // Enhanced phone extraction
    const phones = extractPhones(bodyText);
    
    // LinkedIn profiles
    const linkedinProfiles = extractLinkedInProfiles(html);
    
    // Extract specific content sections
    const aboutContent = $('*[class*="about"], *[id*="about"], *[class*="story"], *[id*="story"]').text().slice(0, 500);
    const servicesContent = $('*[class*="service"], *[id*="service"], *[class*="product"], *[id*="product"]').text().slice(0, 500);
    const contactContent = $('*[class*="contact"], *[id*="contact"], *[class*="reach"], *[id*="reach"]').text().slice(0, 500);
    
    // Check for specific pages
    const hasContactPage = /contact|reach|touch|connect/i.test(html);
    const hasAboutPage = /about|story|history|team/i.test(html);
    
    // Determine business type based on content
    let businessType = 'Business';
    const content = (title + ' ' + metaDescription + ' ' + bodyText).toLowerCase();
    
    if (content.includes('web design') || content.includes('website')) businessType = 'Web Design';
    else if (content.includes('marketing') || content.includes('advertising')) businessType = 'Marketing';
    else if (content.includes('development') || content.includes('software')) businessType = 'Development';
    else if (content.includes('consulting') || content.includes('consultant')) businessType = 'Consulting';
    else if (content.includes('agency')) businessType = 'Agency';
    
    const extractionSuccess = emails.length > 0 && title !== 'Error' && bodyText.length > 100;
    
    console.log(`✅ Scraped ${url}: ${emails.length} emails, ${phones.length} phones`);
    
    return {
      url,
      title,
      metaDescription,
      bodyText: bodyText.slice(0, 1000), // Limit body text
      emails,
      phones,
      linkedinProfiles,
      aboutContent,
      servicesContent,
      contactContent,
      hasContactPage,
      hasAboutPage,
      businessType,
      extractionSuccess
    };
    
  } catch (error: any) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    
    // Retry logic for better success rate
    if (retryCount < maxRetries && error.code !== 'ENOTFOUND') {
      console.log(`🔄 Retrying ${url} (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return scrapeWebsiteForEmails(url, retryCount + 1);
    }
    
    return defaultData;
  }
}

// Simple search with only 1 SERP API call per service-location
async function searchSimpleLeads(service: string, location: string, serpApiKey: string): Promise<SimpleLead[]> {
  const leads: SimpleLead[] = [];
  
  if (!serpApiKey) {
    throw new Error('SERPAPI_KEY is not configured');
  }
  
  try {
    console.log(`🔍 SIMPLE SEARCH (1 SERP call): "${service}" in "${location}"`);
    
    // SINGLE SERP API CALL - optimized for cost efficiency
    const searchQuery = `${service} company "${location}"`;
    
    const searchResults = await getJson({
      engine: "google",
      api_key: serpApiKey,
      q: searchQuery,
      location,
      num: 20, // Get good results in single call
      hl: "en",
      gl: "us"
    });

    console.log(`📊 Single SERP call made for: ${searchQuery}`);
    
    // Process both organic and local results from the single call
    const organicResults = searchResults.organic_results || [];
    const localResults = searchResults.local_results?.places || [];
    
    console.log(`📈 Found ${organicResults.length} organic + ${localResults.length} local results`);
    
    // Process organic results
    for (const result of organicResults.slice(0, 10)) {
      try {
        const domain = cleanDomain(result.link);
        
        // Skip directory sites
        const blockedPatterns = [
          'goodfirms.co', 'clutch.co', 'upwork.com', 'freelancer.com', 'fiverr.com',
          'yelp.com', 'yellowpages', 'glassdoor.com', 'linkedin.com', 'facebook.com'
        ];
        
        const isBlocked = blockedPatterns.some(pattern => domain.includes(pattern));
        if (isBlocked) continue;
        
        // Check if lead already exists
        const existingLead = await Lead.findOne({ 
          $or: [
            { website: { $regex: domain, $options: 'i' } },
            { company: { $regex: result.title.split(/[|\-–]/)[0].trim(), $options: 'i' } }
          ]
        });
        
        if (existingLead) {
          console.log(`⏭️ Skipping existing lead: ${result.title}`);
          continue;
        }
        
        // Scrape website for accurate contact info
        const scrapedData = await scrapeWebsiteForEmails(result.link);
        
        if (scrapedData.extractionSuccess && scrapedData.emails.length > 0) {
          leads.push({
            url: result.link,
            title: result.title,
            snippet: result.snippet || '',
            domain,
            scrapedData,
            emailFound: true,
            emails: scrapedData.emails,
            source: 'organic'
          });
          
          console.log(`✅ Organic lead: ${result.title} (${scrapedData.emails.length} emails)`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing organic result:`, error);
      }
    }
    
    // Process local results (Google My Business listings)
    for (const result of localResults.slice(0, 5)) {
      try {
        if (!result.link) continue;
        
        const domain = cleanDomain(result.link);
        
        // Check if lead already exists
        const existingLead = await Lead.findOne({ 
          $or: [
            { website: { $regex: domain, $options: 'i' } },
            { company: { $regex: result.title.split(/[|\-–]/)[0].trim(), $options: 'i' } }
          ]
        });
        
        if (existingLead) continue;
        
        // Scrape website for contact info
        const scrapedData = await scrapeWebsiteForEmails(result.link);
        
        leads.push({
          url: result.link,
          title: result.title,
          snippet: result.snippet || result.description || '',
          domain,
          scrapedData,
          emailFound: scrapedData.emails.length > 0,
          emails: scrapedData.emails,
          source: 'local'
        });
        
        console.log(`✅ Local lead: ${result.title} (${scrapedData.emails.length} emails)`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing local result:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in simple search:', error);
  }
  
  return leads;
}

// Format leads for database
function formatLeadsForDatabase(leads: SimpleLead[], service: string, location: string): ProcessedLead[] {
  return leads.map(lead => {
    const { scrapedData } = lead;
    
    // Extract company name from title
    const company = scrapedData.title !== 'Error' ? 
      scrapedData.title.split(/[|\-–]/)[0].trim() : 
      lead.title.split(/[|\-–]/)[0].trim();
    
    // Get primary email
    const primaryEmail = scrapedData.emails[0] || '';
    
    // Get primary phone
    const primaryPhone = scrapedData.phones[0] || '';
    
    // Get LinkedIn profile
    const linkedinProfile = scrapedData.linkedinProfiles[0] || '';
    
    // Extract contact name from email or use generic
    const contactName = primaryEmail ? 
      primaryEmail.split('@')[0].replace(/[.\-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
      'Contact Person';
    
    // Create description
    const description = scrapedData.metaDescription || 
      `${scrapedData.businessType} company providing ${service} services in ${location}`;
    
    return {
      name: contactName,
      company,
      email: primaryEmail,
      phone: primaryPhone,
      website: lead.url,
      linkedinProfile,
      description,
      location,
      status: 'active',
      source: 'simple-search',
      tags: [service.toLowerCase(), location.toLowerCase(), 'simple-leads', scrapedData.businessType.toLowerCase()],
      leadSource: lead.source,
      isHighValue: false // Simple leads are not high-value by default
    };
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { services, locations, leadQuantity = 50, userId } = body;

    await dbConnect();
    let serpApiKey = '';
    if (userId) {
      const user = await User.findById(userId).lean();
      if (user && typeof user === 'object' && 'credentials' in user) {
        serpApiKey = user.credentials?.SERPAPI_KEY || '';
      }
    }
    const check = requireCredentials({ SERPAPI_KEY: serpApiKey }, ['SERPAPI_KEY']);
    if (!check.ok) {
      return NextResponse.json({ success: false, error: `Missing credentials: ${check.missing.join(', ')}`, missingCredentials: check.missing }, { status: 400 });
    }
    
    if (!services || !locations) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: services, locations'
      }, { status: 400 });
    }
    
    // Parse input
    const servicesList: string[] = Array.isArray(services) ? services : services.split(',').map((s: string) => s.trim());
    const locationsList: string[] = Array.isArray(locations) ? locations : locations.split(',').map((l: string) => l.trim());
    
    // DB already connected above
    
    console.log(`🚀 SIMPLE LEADS SEARCH STARTING`);
    console.log(`📊 Services: ${servicesList.length}, Locations: ${locationsList.length}`);
    console.log(`🎯 Total SERP calls: ${servicesList.length * locationsList.length} (1 per combination)`);
    
    let allProcessedLeads: ProcessedLead[] = [];
    let totalSerpCalls = 0;
    
    // Process each service-location combination
    for (const service of servicesList) {
      for (const location of locationsList) {
        try {
          console.log(`\n🔍 Processing: "${service}" in "${location}"`);
          
          // SINGLE SERP API CALL per combination
          const simpleLeads = await searchSimpleLeads(service, location, serpApiKey);
          totalSerpCalls++; // Count the single call
          
          // Format for database
          const processedLeads = formatLeadsForDatabase(simpleLeads, service, location);
          
          allProcessedLeads = [...allProcessedLeads, ...processedLeads];
          
          console.log(`✅ Found ${processedLeads.length} leads for "${service}" in "${location}"`);
          
        } catch (error) {
          console.error(`❌ Error processing ${service} in ${location}:`, error);
        }
      }
    }
    
    // Save to database
    let savedCount = 0;
    for (const leadData of allProcessedLeads) {
      try {
        const lead = new Lead(leadData);
        await lead.save();
        savedCount++;
      } catch (error) {
        console.error('❌ Error saving lead:', error);
      }
    }
    
    console.log(`\n🎉 SIMPLE LEADS SEARCH COMPLETE`);
    console.log(`📊 Total SERP calls made: ${totalSerpCalls}`);
    console.log(`📧 Total leads found: ${allProcessedLeads.length}`);
    console.log(`💾 Total leads saved: ${savedCount}`);
    
    return NextResponse.json({
      success: true,
      leads: allProcessedLeads,
      statistics: {
        totalSerpCalls,
        totalLeadsFound: allProcessedLeads.length,
        totalLeadsSaved: savedCount,
        averageLeadsPerCall: Math.round(allProcessedLeads.length / totalSerpCalls),
        searchCombinations: servicesList.length * locationsList.length
      },
      message: `Simple search complete! Found ${allProcessedLeads.length} leads using ${totalSerpCalls} SERP coins (1 per service-location combination).`
    });
    
  } catch (error: any) {
    console.error('❌ Simple leads API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process simple leads'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Simple Leads API - Optimized for 1 SERP call per service-location combination',
    features: [
      '1 SERP API call per service-location combination',
      'Enhanced email extraction accuracy',
      'Improved business validation',
      'Minimal rate limiting issues',
      'Cost-efficient lead generation'
    ]
  });
} 