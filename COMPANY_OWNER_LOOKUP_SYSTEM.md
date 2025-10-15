# Company Owner Lookup System

## Overview

The system now automatically enriches leads with company owner information using OpenAI during the lead collection process. When leads are collected through the normal flow (services + locations → job queue → cron job), the system will automatically lookup company owners and save this information to the database.

## How It Works

### 1. Automatic Enrichment During Lead Collection

**Flow:**
1. User starts lead collection on `/leads` page
2. Job is queued with services and locations
3. Cron job processes each service-location combination:
   - Collects leads from Google Maps/SERP APIs
   - **🔍 ENRICHES LEADS WITH COMPANY OWNER INFO**
   - Saves enriched leads to database

**Code Location:** 
- `app/api/jobs/process-local/route.ts` (for local processing)
- `app/api/cron/process-jobs/route.ts` (for cron job processing)

```javascript
// Process leads
const leads = await processServiceLocation(service, location, ...);

// 🔍 ENRICH WITH OWNER INFO
const enrichedLeads = await enrichLeadsWithOwners(leads, userId);

// Save to database
for (const lead of enrichedLeads) {
  // lead.companyOwner is now included
}
```

### 2. Manual Enrichment for Existing Leads

**New "Enrich Owners" Button on Leads Page:**
- Available on `/leads` page next to Export/Import buttons
- Processes all existing leads that don't have owner information
- Uses current user's OpenAI credentials
- Shows progress and results via toast notifications

**API Endpoint:** `POST /api/leads/enrich-owners`

### 3. Database Schema Changes

**New Field Added to Lead Schema:**
```javascript
// models/leadSchema.ts
interface Lead {
  // ... existing fields
  companyOwner?: string; // NEW: Company owner name from OpenAI lookup
  // ... other fields
}
```

## System Components

### 1. OpenAI Service (`lib/openaiService.ts`)

**Features:**
- Uses GPT-4o-mini for accurate and cost-effective owner lookup
- Batch processing with rate limiting
- Confidence scoring (high/medium/low)
- Error handling and fallback parsing
- User-specific API key support

**Example Usage:**
```javascript
const openaiService = await createOpenAIServiceForUser(userId);
const result = await openaiService.lookupCompanyOwner("Acme Corp");
// Returns: { success: true, ownerName: "John Smith", confidence: "high" }
```

### 2. Lead Enrichment Service (`lib/leadEnrichment.ts`)

**Functions:**
- `enrichLeadWithOwner()` - Single lead enrichment
- `enrichLeadsWithOwners()` - Batch enrichment for arrays
- `updateExistingLeadsWithOwners()` - Database update for existing leads

**Features:**
- Deduplication by company name
- Batch processing for efficiency
- Database integration
- Error handling and logging

### 3. API Routes

**`/api/leads/enrich-owners`**
- POST: Enrich existing leads with owner info
- GET: Documentation and usage info

**Enhanced `/api/leads`**
- Now accepts `companyOwner` field for manual entry
- Includes owner info in responses

### 4. UI Updates

**Leads Page (`/leads`) Enhancements:**
- New "Enrich Owners" button
- Company Owner column in exports (CSV, PDF)
- Updated lead type definitions
- Progress indicators and feedback

## Configuration Requirements

### Environment Variables
Users need to add their OpenAI API key to their account credentials:

**In Account Settings → Credentials:**
```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### OpenAI Usage
- Model: GPT-4o-mini (accurate and cost-effective)
- Average cost: ~$0.0015 per 1000 leads
- Rate limiting: 5 companies per batch with 1-second delays
- Structured JSON responses for reliable parsing

## Usage Examples

### 1. Automatic Enrichment (New Leads)
```
1. Go to /leads page
2. Enter services: "Web Design, SEO"
3. Enter locations: "Miami FL, Orlando FL"
4. Click "Start Simple Collection"
5. System automatically:
   - Collects leads
   - Looks up company owners
   - Saves enriched data
```

### 2. Manual Enrichment (Existing Leads)
```
1. Go to /leads page
2. Click "Enrich Owners" button
3. System processes all leads without owner info
4. Shows progress: "Updated 45 out of 50 leads"
5. Refresh page to see owner information
```

### 3. Export with Owner Info
```
1. Click "Export" button
2. Choose CSV or PDF format
3. Exported file includes "Company Owner" column
4. Example: "Acme Corp, John Smith, john@acme.com"
```

## Error Handling

### Missing OpenAI Credentials
- System continues normal lead collection
- Logs warning: "OpenAI service not available for user"
- Owner field remains empty

### API Failures
- Individual lead failures don't stop batch processing
- Logs detailed error messages
- Returns partial results with error counts

### Rate Limiting
- Built-in delays between API calls
- Batch processing to avoid overwhelming OpenAI
- Graceful degradation on API limits

## Performance Considerations

### Batch Processing
- Processes up to 5 companies simultaneously
- 1-second delays between batches
- Deduplicates company names to reduce API calls

### Cost Optimization
- Uses GPT-4o-mini (more accurate than GPT-3.5-turbo, cheaper than GPT-4)
- Structured prompts for consistent responses
- Only processes leads without existing owner info

### Processing Time
- ~200ms per company lookup
- 50 leads ≈ 10-15 seconds total
- Larger batches processed via background jobs

## Troubleshooting

### No Owner Information Found
**Cause:** OpenAI doesn't have reliable data for the company
**Solution:** Manual research or alternative data sources

### API Errors
**Cause:** Invalid OpenAI key or quota exceeded
**Solution:** Check credentials in Account Settings

### Slow Processing
**Cause:** Large lead batches
**Solution:** System automatically uses background processing for >30 leads

## Future Enhancements

### Potential Improvements
1. **Additional Data Sources:** LinkedIn API, Clearbit, etc.
2. **Confidence Scoring:** Display confidence levels in UI
3. **Manual Override:** Allow users to edit owner information
4. **Bulk Actions:** Select specific companies for enrichment
5. **Caching:** Store successful lookups to reduce API calls

### Integration Opportunities
1. **Email Templates:** Use owner names in personalized emails
2. **CRM Sync:** Export owner data to external CRMs
3. **Analytics:** Track success rates by industry/location
4. **Notifications:** Alert when high-value owners are found
