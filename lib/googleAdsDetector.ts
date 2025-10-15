import { getJson } from 'serpapi';

interface GoogleAdsResult {
  hasGoogleAds: boolean;
  organicRanking?: number;
  adPosition?: number;
  competitorAds?: string[];
}

interface AdData {
  title: string;
  link: string;
  displayed_link: string;
  snippet?: string;
}

export class GoogleAdsDetector {
  private serpApiKey: string;
  
  constructor(apiKey?: string) {
    this.serpApiKey = apiKey || process.env.SERPAPI_KEY || '';
    if (!this.serpApiKey) {
      throw new Error('SERPAPI_KEY is required for Google Ads detection');
    }
  }

  /**
   * Check if a company is running Google Ads for specific service + location keywords
   * This is the main function that determines high-value leads
   */
  async checkGoogleAds(
    companyWebsite: string, 
    service: string, 
    location: string
  ): Promise<GoogleAdsResult> {
    try {
      // Remove protocol and www from website for comparison
      const cleanWebsite = this.cleanWebsiteUrl(companyWebsite);
      
      // Search for the service + location combination
      const searchQuery = `${service} ${location}`;
      
      // Get search results including ads and organic results
      const searchResults = await getJson({
        engine: "google",
        api_key: this.serpApiKey,
        q: searchQuery,
        location: location,
        num: 20, // Get more results to check rankings
        hl: "en",
        gl: "us"
      });

      let hasGoogleAds = false;
      let organicRanking: number | undefined;
      let adPosition: number | undefined;
      const competitorAds: string[] = [];

      // Check for Google Ads (ads appear at top and bottom)
      const topAds = searchResults.ads || [];
      const bottomAds = searchResults.bottom_ads || [];
      const allAds = [...topAds, ...bottomAds];

      // Check if this company has ads
      allAds.forEach((ad: AdData, index: number) => {
        const adWebsite = this.cleanWebsiteUrl(ad.link || ad.displayed_link);
        if (this.isSameWebsite(cleanWebsite, adWebsite)) {
          hasGoogleAds = true;
          adPosition = index + 1;
        } else {
          // Track competitor ads
          competitorAds.push(ad.displayed_link || ad.link);
        }
      });

      // Check organic ranking
      const organicResults = searchResults.organic_results || [];
      organicResults.forEach((result: any, index: number) => {
        const organicWebsite = this.cleanWebsiteUrl(result.link);
        if (this.isSameWebsite(cleanWebsite, organicWebsite)) {
          organicRanking = index + 1;
        }
      });

      return {
        hasGoogleAds,
        organicRanking,
        adPosition,
        competitorAds: competitorAds.slice(0, 5) // Limit to top 5 competitors
      };

    } catch (error) {
      console.error('Error checking Google Ads:', error);
      return {
        hasGoogleAds: false,
        organicRanking: undefined
      };
    }
  }

  /**
   * Batch check multiple leads for Google Ads (optimized for performance)
   */
  async batchCheckGoogleAds(
    leads: Array<{ website: string; service: string; location: string }>,
    maxConcurrent = 3
  ): Promise<Map<string, GoogleAdsResult>> {
    const results = new Map<string, GoogleAdsResult>();
    
    // Process in batches to avoid rate limiting
    for (let i = 0; i < leads.length; i += maxConcurrent) {
      const batch = leads.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (lead) => {
        const result = await this.checkGoogleAds(lead.website, lead.service, lead.location);
        results.set(lead.website, result);
        
        // Add delay between requests to respect rate limits
        await this.delay(1000);
        return result;
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Clean website URL for comparison
   */
  private cleanWebsiteUrl(url: string): string {
    if (!url) return '';
    
    try {
      // Remove protocol
      let cleanUrl = url.replace(/^https?:\/\//, '');
      
      // Remove www
      cleanUrl = cleanUrl.replace(/^www\./, '');
      
      // Remove trailing slash and path
      cleanUrl = cleanUrl.split('/')[0];
      
      // Remove port numbers
      cleanUrl = cleanUrl.split(':')[0];
      
      return cleanUrl.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Check if two websites are the same (accounting for variations)
   */
  private isSameWebsite(website1: string, website2: string): boolean {
    const clean1 = this.cleanWebsiteUrl(website1);
    const clean2 = this.cleanWebsiteUrl(website2);
    
    // Direct match
    if (clean1 === clean2) return true;
    
    // Check if one contains the other (for subdomains)
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return true;
    }
    
    // Check for common domain variations
    const domain1 = clean1.split('.').slice(-2).join('.');
    const domain2 = clean2.split('.').slice(-2).join('.');
    
    return domain1 === domain2;
  }

  /**
   * Add delay between API calls
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if a lead is high-value based on Google Ads and organic ranking
   */
  static isHighValueLead(result: GoogleAdsResult): boolean {
    // High-value criteria:
    // 1. Company is running Google Ads (paying for traffic)
    // 2. AND they have poor organic ranking (position > 10 or no ranking)
    // This means they WANT to rank but CAN'T rank organically
    
    return result.hasGoogleAds && 
           (result.organicRanking === undefined || result.organicRanking > 10);
  }

  /**
   * Get priority score for lead (higher = more valuable)
   */
  static getLeadPriorityScore(result: GoogleAdsResult): number {
    let score = 0;
    
    // Base score for having Google Ads
    if (result.hasGoogleAds) {
      score += 50;
      
      // Higher score for top ad positions (they're spending more)
      if (result.adPosition && result.adPosition <= 3) {
        score += 30;
      }
    }
    
    // Points for poor organic ranking (they need SEO help)
    if (result.organicRanking === undefined) {
      score += 40; // Not ranking at all
    } else if (result.organicRanking > 20) {
      score += 30; // Very poor ranking
    } else if (result.organicRanking > 10) {
      score += 20; // Below first page
    }
    
    // Bonus for competitive market (many competitors running ads)
    if (result.competitorAds && result.competitorAds.length >= 3) {
      score += 15;
    }
    
    return score;
  }
}

export default GoogleAdsDetector; 