import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

/**
 * POST endpoint to clean up duplicate leads
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    console.log('🧹 Starting duplicate cleanup process...');

    // Read controls: by=email|email_company, scope=user|all (defaults)
    const by = request.nextUrl?.searchParams?.get('by') || 'email_company';
    const scope = request.nextUrl?.searchParams?.get('scope') || 'all';

    // Extract user from Authorization header for scoping
    const authHeader = request.headers.get('authorization') || '';
    const bearerUserId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    
    // Build pipeline with optional user scoping and grouping strategy
    const pipeline: any[] = [];
    if (scope === 'user' && bearerUserId) {
      pipeline.push({
        $match: {
          $or: [
            { assignedTo: bearerUserId },
            { leadsCreatedBy: bearerUserId }
          ]
        }
      });
    }

    // Grouping key
    const groupId = by === 'email' 
      ? { email: { $toLower: "$email" } }
      : { email: { $toLower: "$email" }, company: { $toLower: "$company" } };

    pipeline.push(
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
          leads: { $push: { id: "$_id", createdAt: "$createdAt", company: "$company", email: "$email", linkedinProfile: "$linkedinProfile", website: "$website", phone: "$phone", isHighValue: "$isHighValue", googleAds: "$googleAds", googleAdsChecked: "$googleAdsChecked", organicRanking: "$organicRanking", tags: "$tags" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    );

    // Use aggregation to find duplicates more efficiently
    const duplicateGroups = await Lead.aggregate(pipeline);

    console.log(`📊 Found ${duplicateGroups.length} duplicate groups`);
    
    const duplicatesToRemove: string[] = [];
    const updatesQueue: Array<{ _id: string; updates: any; company: string }> = [];
    
    for (const group of duplicateGroups) {
      // Sort by creation date to keep the oldest
      const sortedLeads = group.leads.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const original = sortedLeads[0];
      const duplicates = sortedLeads.slice(1);
      
      console.log(`🔄 Processing ${duplicates.length} duplicates for: ${original.company}`);
      
      // If deduping strictly by email, we do a simple delete of newer docs and skip merging
      if (by === 'email') {
        for (const duplicate of duplicates) {
          duplicatesToRemove.push(duplicate.id);
        }
        continue;
      }

      // Otherwise (email+company) - prepare merged data for the original lead
      const mergedData: any = {};
      let hasUpdates = false;
      
      for (const duplicate of duplicates) {
        // Merge missing data
        if (!original.linkedinProfile && duplicate.linkedinProfile) {
          mergedData.linkedinProfile = duplicate.linkedinProfile;
          hasUpdates = true;
        }
        
        if (!original.website && duplicate.website) {
          mergedData.website = duplicate.website;
          hasUpdates = true;
        }
        
        if (!original.phone && duplicate.phone) {
          mergedData.phone = duplicate.phone;
          hasUpdates = true;
        }
        
        if (!original.isHighValue && duplicate.isHighValue) {
          mergedData.isHighValue = true;
          hasUpdates = true;
        }
        
        if (!original.googleAds && duplicate.googleAds) {
          mergedData.googleAds = true;
          mergedData.googleAdsChecked = true;
          hasUpdates = true;
        }
        
        if (!original.organicRanking && duplicate.organicRanking) {
          mergedData.organicRanking = duplicate.organicRanking;
          hasUpdates = true;
        }
        
        // Merge tags
        if (duplicate.tags && duplicate.tags.length > 0) {
          const existingTags = original.tags || [];
          const newTags = duplicate.tags.filter((tag: string) => !existingTags.includes(tag));
          if (newTags.length > 0) {
            mergedData.tags = [...existingTags, ...newTags];
            hasUpdates = true;
          }
        }
        
        duplicatesToRemove.push(duplicate.id);
      }
      
      if (hasUpdates) {
        mergedData.updatedAt = new Date();
        updatesQueue.push({
          _id: original.id,
          updates: mergedData,
          company: original.company
        });
      }
    }
    
    console.log(`📊 Found ${duplicatesToRemove.length} duplicates to remove`);
    console.log(`📊 Found ${updatesQueue.length} leads to update with merged data`);
    
    // Update original leads with merged data using atomic operations
    for (const updateItem of updatesQueue) {
      try {
        // Use findByIdAndUpdate to avoid version conflicts
        await Lead.findByIdAndUpdate(
          updateItem._id,
          {
            $set: updateItem.updates
          },
          { 
            new: true,
            runValidators: true 
          }
        );
        console.log(`✅ Updated lead: ${updateItem.company}`);
      } catch (updateError: any) {
        console.error(`❌ Failed to update lead ${updateItem.company}:`, updateError.message);
        // Continue with other updates even if one fails
      }
    }
    
    // Remove duplicates
    if (duplicatesToRemove.length > 0) {
      const deleteResult = await Lead.deleteMany({
        _id: { $in: duplicatesToRemove }
      });
      
      console.log(`✅ Removed ${deleteResult.deletedCount} duplicate leads`);
    }
    
    const finalCount = await Lead.countDocuments();
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
              stats: {
          duplicatesRemoved: duplicatesToRemove.length,
          leadsUpdated: updatesQueue.length,
          finalLeadCount: finalCount
        }
    });
    
  } catch (error: any) {
    console.error('Error cleaning up duplicates:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to clean up duplicates'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to analyze duplicates without removing them
 */
export async function GET(): Promise<NextResponse> {
  try {
    await dbConnect();
    
    console.log('🔍 Analyzing duplicates...');
    
    // Find potential duplicates by email
    const emailDuplicates = await Lead.aggregate([
      {
        $group: {
          _id: { $toLower: "$email" },
          count: { $sum: 1 },
          leads: { $push: { id: "$_id", company: "$company", email: "$email" } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    // Find potential duplicates by company name
    const companyDuplicates = await Lead.aggregate([
      {
        $group: {
          _id: { $toLower: { $regex: { $replaceAll: { input: "$company", find: /[^a-zA-Z0-9]/g, replacement: "" } } } },
          count: { $sum: 1 },
          leads: { $push: { id: "$_id", company: "$company", email: "$email" } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    return NextResponse.json({
      success: true,
      analysis: {
        totalLeads: await Lead.countDocuments(),
        emailDuplicateGroups: emailDuplicates.length,
        companyDuplicateGroups: companyDuplicates.length,
        emailDuplicates: emailDuplicates,
        companyDuplicates: companyDuplicates
      }
    });
    
  } catch (error: any) {
    console.error('Error analyzing duplicates:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to analyze duplicates'
    }, { status: 500 });
  }
} 