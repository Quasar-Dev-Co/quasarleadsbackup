import { NextRequest, NextResponse } from 'next/server';
import { getJson } from 'serpapi';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

const SERPAPI_KEY = process.env.SERPAPI_KEY;

interface VerificationResult {
  leadId: string;
  company: string;
  website: string;
  foundInAds: boolean;
  foundInOrganic: boolean;
  adPosition?: number;
  organicPosition?: number;
  searchQuery: string;
  location: string;
  timestamp: string;
  verificationStatus: 'verified' | 'partially_verified' | 'not_found';
  notes: string[];
}

/**
 * POST endpoint to manually verify high-value leads
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!SERPAPI_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'SERP API key not configured' 
      }, { status: 500 });
    }

    await dbConnect();
    
    const body = await request.json();
    const { leadIds, service, location } = body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Please provide leadIds array'
      }, { status: 400 });
    }

    if (!service || !location) {
      return NextResponse.json({
        success: false,
        error: 'Please provide service and location for search'
      }, { status: 400 });
    }

    console.log(`🔍 Manual verification starting for ${leadIds.length} leads`);
    console.log(`   📊 Using SerpApi Google Ads verification: https://serpapi.com/google-ads`);
    console.log(`   📍 Location: ${location}`);
    console.log(`   🔧 Service: ${service}`);
    
    // Get the leads from database
    const leads = await Lead.find({ 
      _id: { $in: leadIds },
      isHighValue: true 
    }).lean();

    if (leads.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No high-value leads found with provided IDs'
      });
    }

    const verificationResults: VerificationResult[] = [];
    
    // Test different search queries that the system uses
    const searchQueries = [
      `${service} "${location}"`,
      `best ${service} "${location}"`,
      `${service} company "${location}"`,
      `${service} services "${location}"`
    ];

    for (const lead of leads) {
      console.log(`🔍 Verifying lead: ${lead.company} - ${lead.website}`);
      
      let bestResult: VerificationResult = {
        leadId: String(lead._id),
        company: lead.company,
        website: lead.website || '',
        foundInAds: false,
        foundInOrganic: false,
        searchQuery: '',
        location,
        timestamp: new Date().toISOString(),
        verificationStatus: 'not_found',
        notes: []
      };

      // Test each search query
      for (const query of searchQueries) {
        try {
          console.log(`   🔍 Testing query: "${query}"`);
          
          const searchResults = await getJson({
            engine: "google",
            api_key: SERPAPI_KEY,
            q: query,
            location,
            num: 30,
            hl: "en",
            gl: "us"
          });

          const domain = lead.website ? cleanDomain(lead.website) : '';
          let foundInAds = false;
          let foundInOrganic = false;
          let adPosition: number | undefined;
          let organicPosition: number | undefined;

          // Check ads results
          const topAds = searchResults.ads || [];
          const bottomAds = searchResults.bottom_ads || [];
          const allAds = [...topAds, ...bottomAds];

          allAds.forEach((ad: any, index: number) => {
            const adDomain = cleanDomain(ad.link || ad.displayed_link);
            if (domain && (adDomain === domain || ad.title.toLowerCase().includes(lead.company.toLowerCase().split(' ')[0]))) {
              foundInAds = true;
              adPosition = index + 1;
              console.log(`   ✅ Found in ads at position ${adPosition}`);
            }
          });

          // Check organic results
          const organicResults = searchResults.organic_results || [];
          organicResults.forEach((result: any, index: number) => {
            const organicDomain = cleanDomain(result.link);
            if (domain && (organicDomain === domain || result.title.toLowerCase().includes(lead.company.toLowerCase().split(' ')[0]))) {
              foundInOrganic = true;
              organicPosition = index + 1;
              console.log(`   ✅ Found in organic at position ${organicPosition}`);
            }
          });

          // Update best result if this query found the lead
          if (foundInAds || foundInOrganic) {
            bestResult = {
              leadId: String(lead._id),
              company: lead.company,
              website: lead.website || '',
              foundInAds,
              foundInOrganic,
              adPosition,
              organicPosition,
              searchQuery: query,
              location,
              timestamp: new Date().toISOString(),
              verificationStatus: foundInAds && foundInOrganic ? 'verified' : 'partially_verified',
              notes: [
                ...(foundInAds ? [`Found in Google Ads at position ${adPosition}`] : []),
                ...(foundInOrganic ? [`Found in organic results at position ${organicPosition}`] : []),
                `Search query: "${query}"`
              ]
            };
            
            // If we found it in ads (which is what makes it high-value), we can break
            if (foundInAds) break;
          }

          // Add delay between searches
          await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
          console.error(`   ❌ Error searching with query "${query}":`, error);
          bestResult.notes.push(`Error with query "${query}": ${error}`);
        }
      }

      // Add additional analysis notes
      if (!bestResult.foundInAds && !bestResult.foundInOrganic) {
        bestResult.notes.push('❌ Not found in any search results - may be expired ad campaign or geo-targeted');
        bestResult.notes.push('💡 Try searching directly for the company name');
        bestResult.notes.push('⏰ Ads may have stopped running since lead was collected');
      }

      if (bestResult.foundInOrganic && !bestResult.foundInAds) {
        bestResult.notes.push('⚠️ Found organically but not in ads - ad campaign may have ended');
      }

      if (bestResult.foundInAds && bestResult.organicPosition && bestResult.organicPosition <= 10) {
        bestResult.notes.push('❓ Found in ads AND ranking well organically - may not be truly high-value');
      }

      verificationResults.push(bestResult);
      console.log(`   📊 Final result: ${bestResult.verificationStatus}`);
    }

    // Summary statistics
    const verified = verificationResults.filter(r => r.verificationStatus === 'verified').length;
    const partiallyVerified = verificationResults.filter(r => r.verificationStatus === 'partially_verified').length;
    const notFound = verificationResults.filter(r => r.verificationStatus === 'not_found').length;

    return NextResponse.json({
      success: true,
      message: `Manual verification complete for ${leads.length} high-value leads`,
      summary: {
        total: leads.length,
        verified,
        partiallyVerified,
        notFound,
        verificationRate: Math.round((verified + partiallyVerified) / leads.length * 100)
      },
      results: verificationResults,
      recommendations: [
        notFound > 0 ? "Some leads could not be verified - they may be from expired ad campaigns" : null,
        verified < leads.length ? "Consider running lead collection again to get fresh, currently active ads" : null,
        "High-value leads are time-sensitive - ads may stop running after budget is exhausted"
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Error in manual verification:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Helper function to clean domain for comparison
 */
function cleanDomain(url: string): string {
  if (!url) return '';
  try {
    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    return cleanUrl;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * GET endpoint for manual verification info
 */
export async function GET(): Promise<NextResponse> {
  try {
    await dbConnect();
    
    const highValueLeads = await Lead.find({ 
      isHighValue: true 
    }).select('_id company website tags createdAt').limit(10).lean();

    return NextResponse.json({
      message: 'Manual High-Value Lead Verification API',
      availableLeads: highValueLeads.length,
      sampleLeads: highValueLeads.map(lead => ({
        id: lead._id,
        company: lead.company,
        website: lead.website,
        tags: lead.tags,
        created: lead.createdAt
      })),
      usage: {
        endpoint: 'POST /api/leads/verify-manual',
        requiredParams: ['leadIds', 'service', 'location'],
        example: {
          leadIds: ['lead_id_1', 'lead_id_2'],
          service: 'web development',
          location: 'New York'
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 