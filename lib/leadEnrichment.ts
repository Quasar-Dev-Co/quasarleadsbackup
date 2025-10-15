import { createOpenAIServiceForUser } from './openaiService';
import Lead from '../models/leadSchema';

export interface LeadWithOwner {
  company: string;
  companyOwner?: string;
  [key: string]: any;
}

/**
 * Enrich a single lead with company owner information
 * @param lead - Lead object to enrich
 * @param userId - User ID for OpenAI credentials
 * @returns Promise with enriched lead data
 */
export async function enrichLeadWithOwner(lead: any, userId: string): Promise<LeadWithOwner> {
  try {
    console.log(`🔍 Starting owner lookup for company: ${lead.company}`);
    
    const openaiService = await createOpenAIServiceForUser(userId);
    if (!openaiService) {
      console.log(`⚠️ OpenAI service not available for user ${userId} - skipping owner lookup`);
      return { ...lead };
    }

    const ownerResult = await openaiService.lookupCompanyOwner(lead.company);
    
    if (ownerResult.success && ownerResult.ownerName) {
      console.log(`✅ Found owner for ${lead.company}: ${ownerResult.ownerName}`);
      return {
        ...lead,
        companyOwner: ownerResult.ownerName
      };
    } else {
      console.log(`❌ No owner found for ${lead.company}: ${ownerResult.error}`);
      return { ...lead };
    }
  } catch (error) {
    console.error(`Error enriching lead ${lead.company} with owner:`, error);
    return { ...lead };
  }
}

/**
 * Enrich multiple leads with company owner information
 * @param leads - Array of leads to enrich
 * @param userId - User ID for OpenAI credentials
 * @returns Promise with enriched leads
 */
export async function enrichLeadsWithOwners(leads: any[], userId: string): Promise<LeadWithOwner[]> {
  try {
    console.log(`🔍 Starting batch owner lookup for ${leads.length} companies using GPT-5 (User: ${userId})`);
    
    const openaiService = await createOpenAIServiceForUser(userId);
    if (!openaiService) {
      console.log(`⚠️ OpenAI service not available for user ${userId} - skipping owner lookup`);
      console.log(`💡 Please add OPENAI_API_KEY to your account credentials to enable GPT-5 owner lookup`);
      return leads;
    }

    // Extract unique company names
    const companyNames = [...new Set(leads.map(lead => lead.company))];
    console.log(`📊 Processing ${companyNames.length} unique companies`);
    
    // Batch lookup company owners
    const ownerResults = await openaiService.batchLookupCompanyOwners(companyNames);
    
    // Create a mapping of company name to owner
    const companyToOwner: Record<string, string> = {};
    ownerResults.forEach(result => {
      if (result.result.success && result.result.ownerName) {
        companyToOwner[result.company] = result.result.ownerName;
      }
    });
    
    console.log(`✅ Found owners for ${Object.keys(companyToOwner).length}/${companyNames.length} companies`);
    
    // Enrich leads with owner information
    const enrichedLeads = leads.map(lead => ({
      ...lead,
      companyOwner: companyToOwner[lead.company] || undefined
    }));
    
    return enrichedLeads;
  } catch (error) {
    console.error('Error enriching leads with owners:', error);
    return leads;
  }
}

/**
 * Update existing leads in database with company owner information
 * @param userId - User ID for OpenAI credentials
 * @param companyNames - Optional array of specific companies to update
 * @returns Promise with update results
 */
export async function updateExistingLeadsWithOwners(userId: string, companyNames?: string[]): Promise<{
  total: number;
  updated: number;
  errors: number;
}> {
  try {
    console.log(`🔄 Starting database update for existing leads...`);
    
    const openaiService = await createOpenAIServiceForUser(userId);
    if (!openaiService) {
      throw new Error(`OpenAI service not available for user ${userId}`);
    }

    // Build query for leads to update
    const query: any = {
      companyOwner: { $exists: false }, // Only update leads without owner info
      assignedTo: userId // Only update user's leads
    };
    
    if (companyNames && companyNames.length > 0) {
      query.company = { $in: companyNames };
    }
    
    const leadsToUpdate = await Lead.find(query).select('_id company').lean();
    console.log(`📊 Found ${leadsToUpdate.length} leads to update`);
    
    if (leadsToUpdate.length === 0) {
      return { total: 0, updated: 0, errors: 0 };
    }
    
    // Extract unique company names
    const uniqueCompanies = [...new Set(leadsToUpdate.map(lead => lead.company))];
    
    // Batch lookup owners
    const ownerResults = await openaiService.batchLookupCompanyOwners(uniqueCompanies);
    
    let updated = 0;
    let errors = 0;
    
    // Update leads with owner information
    for (const result of ownerResults) {
      if (result.result.success && result.result.ownerName) {
        try {
          const updateResult = await Lead.updateMany(
            { 
              company: result.company,
              assignedTo: userId,
              companyOwner: { $exists: false }
            },
            { 
              $set: { 
                companyOwner: result.result.ownerName,
                updatedAt: new Date()
              }
            }
          );
          
          updated += updateResult.modifiedCount;
          console.log(`✅ Updated ${updateResult.modifiedCount} leads for company: ${result.company} -> ${result.result.ownerName}`);
        } catch (error) {
          console.error(`❌ Error updating leads for ${result.company}:`, error);
          errors++;
        }
      }
    }
    
    console.log(`🎉 Database update completed: ${updated} leads updated, ${errors} errors`);
    
    return {
      total: leadsToUpdate.length,
      updated,
      errors
    };
  } catch (error) {
    console.error('Error updating existing leads with owners:', error);
    throw error;
  }
}

export default {
  enrichLeadWithOwner,
  enrichLeadsWithOwners,
  updateExistingLeadsWithOwners
};
