import OpenAI from 'openai';

interface CompanyOwnerLookupResult {
  success: boolean;
  ownerName?: string;
  error?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Lookup company owner using OpenAI
   * @param companyName - The name of the company to lookup
   * @returns Promise with owner name or error
   */
  async lookupCompanyOwner(companyName: string): Promise<CompanyOwnerLookupResult> {
    try {
      console.log(`🔍 Looking up owner for company: ${companyName} using GPT-5`);
      
      const prompt = `You are a business intelligence expert specializing in company ownership research. Find the current owner, founder, CEO, or primary decision maker for this company.

Company: "${companyName}"

INSTRUCTIONS:
1. Search your knowledge for the ACTUAL REAL owner, founder, or CEO name
2. Only return REAL PERSON NAMES (like "John Smith", "Sarah Johnson")
3. Do NOT make up names or use company names as owner names
4. Do NOT return generic titles or roles
5. If you don't know the real owner, return null

STRICT RULES:
- ONLY return real human names you are confident about
- NEVER return company names as owner names
- NEVER return generic roles like "CEO" or "Founder" without a real name
- NEVER guess or make up names
- If unsure, return null

Respond ONLY in this JSON format:
{
  "ownerName": "Real Person Name" OR null,
  "confidence": "high|medium|low"
}

GOOD Examples:
- "Microsoft" → "Satya Nadella" (real CEO name)
- "Tesla" → "Elon Musk" (real owner name)
- "Meta" → "Mark Zuckerberg" (real founder name)

BAD Examples (NEVER do this):
- "TechBrains (CEO)" ❌
- "Manufacturing Software" ❌  
- "App Development USA" ❌
- "Company Owner" ❌

If you don't know the real person's name, use null.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a helpful business intelligence assistant that provides accurate information about company ownership. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 1200,
        // Lower temperature for more consistent results
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        return {
          success: false,
          error: 'No response from OpenAI'
        };
      }

      try {
        // Clean the response - remove markdown code blocks if present
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(cleanResponse);
        
        if (parsed.ownerName && parsed.ownerName !== null) {
          console.log(`✅ Found owner for ${companyName}: ${parsed.ownerName} (confidence: ${parsed.confidence})`);
          return {
            success: true,
            ownerName: parsed.ownerName,
            confidence: parsed.confidence || 'medium'
          };
        } else {
          console.log(`❌ No specific owner found for ${companyName}, leaving blank`);
          return {
            success: false,
            error: 'No real owner name found'
          };
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response:', response);
        
        // Try to extract owner name from unstructured response
        const ownerMatch = response.match(/owner[:\s]+([A-Za-z\s]+)/i) || 
                          response.match(/CEO[:\s]+([A-Za-z\s]+)/i) ||
                          response.match(/founder[:\s]+([A-Za-z\s]+)/i);
        
        if (ownerMatch && ownerMatch[1]) {
          const extractedName = ownerMatch[1].trim();
          console.log(`🔧 Extracted owner name from unstructured response: ${extractedName}`);
          return {
            success: true,
            ownerName: extractedName,
            confidence: 'low'
          };
        }
        
        // No fallback - leave blank if no real name found
        console.log(`❌ No owner name found for ${companyName}, leaving blank`);
        return {
          success: false,
          error: 'No real owner name found'
        };
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      // On API error, return failure (blank)
      return {
        success: false,
        error: error.message || 'OpenAI API request failed'
      };
    }
  }

  /**
   * Generate a reasonable fallback owner name based on company name patterns
   */
  private generateFallbackOwner(companyName: string): string {
    // Clean the company name
    const cleanName = companyName.replace(/\b(LLC|Inc|Corp|Corporation|Ltd|Limited|Company|Co\.?)\b/gi, '').trim();
    
    // Pattern matching for common business structures
    
    // 1. Person's name + business type (e.g., "John's Pizza", "Smith Law Firm")
    const personPattern = /^([A-Z][a-z]+(?:'s|s)?)\s+/i;
    const personMatch = cleanName.match(personPattern);
    if (personMatch) {
      const firstName = personMatch[1].replace(/['s].*$/, '');
      return `${firstName} (Owner)`;
    }
    
    // 2. Last name + business type (e.g., "Smith & Associates", "Johnson Consulting")
    const lastNamePattern = /^([A-Z][a-z]+)\s+(?:&|and|Associates|Consulting|Services|Group|Partners)/i;
    const lastNameMatch = cleanName.match(lastNamePattern);
    if (lastNameMatch) {
      return `${lastNameMatch[1]} (Principal)`;
    }
    
    // 3. Extract meaningful company name parts for better names
    const words = cleanName.split(/\s+/).filter(word => 
      word.length > 2 && 
      !/^(the|and|of|for|in|at|by|with|from|to|inc|llc|corp|ltd)$/i.test(word)
    );
    
    // 4. Technology/Development companies - use company-specific names
    if (/\b(Tech|Technology|Software|Development|App|Web|Digital|IT|Solutions|Code|System)\b/i.test(companyName)) {
      const techWords = words.filter(word => !/\b(Tech|Technology|Software|Development|App|Web|Digital|IT|Solutions|Code|System|Company|Corp|LLC|Inc|New|York|NYC)\b/i.test(word));
      if (techWords.length > 0) {
        return `${techWords[0]} (CEO)`;
      }
      return 'Tech Founder';
    }
    
    // 5. Professional services
    if (/\b(Law|Legal|Attorney|Accounting|Consulting|Marketing|Agency)\b/i.test(companyName)) {
      const profWords = words.filter(word => !/\b(Law|Legal|Attorney|Accounting|Consulting|Marketing|Agency|Firm|Group|Associates|Company|LLC|Inc)\b/i.test(word));
      if (profWords.length > 0) {
        return `${profWords[0]} (Principal)`;
      }
      return 'Managing Partner';
    }
    
    // 6. Extract first meaningful word as potential owner name
    if (words.length > 0) {
      const firstMeaningfulWord = words[0];
      // Check if it looks like a proper name or company identifier
      if (/^[A-Z][a-z]{2,}$/i.test(firstMeaningfulWord)) {
        // For tech companies
        if (/\b(Software|Tech|Digital|Web|App|IT|Code|System)\b/i.test(companyName)) {
          return `${firstMeaningfulWord} (Founder)`;
        }
        // For consulting/professional
        if (/\b(Consulting|Solutions|Services|Group|Partners)\b/i.test(companyName)) {
          return `${firstMeaningfulWord} (CEO)`;
        }
        // Default
        return `${firstMeaningfulWord} (Owner)`;
      }
    }
    
    // 7. Healthcare
    if (/\b(Medical|Health|Clinic|Doctor|Dental)\b/i.test(companyName)) {
      return 'Dr. Smith (Practice Owner)';
    }
    
    // 8. Restaurants/Food
    if (/\b(Restaurant|Cafe|Pizza|Food|Catering|Kitchen)\b/i.test(companyName)) {
      return 'Chef/Owner';
    }
    
    // 9. Retail/Shop
    if (/\b(Shop|Store|Retail|Market|Boutique)\b/i.test(companyName)) {
      return 'Store Manager';
    }
    
    // 10. Construction/Contracting
    if (/\b(Construction|Contractor|Building|Roofing|Plumbing|Electric)\b/i.test(companyName)) {
      return 'Project Manager';
    }
    
    // Default fallback with more realistic name
    return 'Business Owner';
  }

  /**
   * Batch lookup multiple company owners
   * @param companyNames - Array of company names
   * @returns Promise with array of lookup results
   */
  async batchLookupCompanyOwners(companyNames: string[]): Promise<Array<{company: string, result: CompanyOwnerLookupResult}>> {
    const results: Array<{company: string, result: CompanyOwnerLookupResult}> = [];
    
    console.log(`🔍 Starting batch lookup for ${companyNames.length} companies`);
    
    // Process companies in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < companyNames.length; i += batchSize) {
      const batch = companyNames.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (companyName) => {
        const result = await this.lookupCompanyOwner(companyName);
        return { company: companyName, result };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limits
      if (i + batchSize < companyNames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    console.log(`✅ Batch lookup completed. Found owners for ${results.filter(r => r.result.success).length}/${companyNames.length} companies`);
    
    return results;
  }
}

/**
 * Create OpenAI service instance with user credentials
 * @param userId - User ID to fetch OpenAI credentials
 * @returns OpenAI service instance or null if credentials missing
 */
export async function createOpenAIServiceForUser(userId: string): Promise<OpenAIService | null> {
  try {
    // Import User model dynamically to avoid circular imports
    const { default: User } = await import('../models/userSchema');
    const { default: dbConnect } = await import('../lib/mongodb');
    
    await dbConnect();
    
    const user = await User.findById(userId).lean();
    const openaiKey = user && typeof user === 'object' && 'credentials' in user ? 
      (user.credentials as any)?.OPENAI_API_KEY : undefined;
    
    if (!openaiKey) {
      console.error(`❌ OpenAI API key not found for user ${userId}`);
      return null;
    }
    
    return new OpenAIService(openaiKey);
  } catch (error) {
    console.error('Error creating OpenAI service for user:', error);
    return null;
  }
}

export default OpenAIService;
