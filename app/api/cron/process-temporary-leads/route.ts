import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TemporaryLead from '@/models/temporaryLeadSchema';
import Lead from '@/models/leadSchema';

export const runtime = 'nodejs';

type Enriched = {
	company_name: string;
	company_email?: string | null;
	owner_name?: string | null;
	owner_email?: string | null;
	manager_name?: string | null;
	manager_email?: string | null;
	hr_name?: string | null;
	hr_email?: string | null;
	executive_name?: string | null;
	executive_email?: string | null;
};

// GET endpoint now uses batch processing with batchSize=5 for cost efficiency
export async function GET(request: NextRequest) {
	// Default to processing 5 leads for GET (cron job), but allow override via query param
	const searchParams = request.nextUrl.searchParams;
	const batchSize = parseInt(searchParams.get('batchSize') || '5', 10);
	const userId = searchParams.get('userId') || '';
	
	// Convert GET to POST-style processing
	const mockBody = { batchSize, userId };
	const mockRequest = {
		...request,
		json: () => Promise.resolve(mockBody),
		nextUrl: { searchParams }
	} as NextRequest;
	
	return POST(mockRequest);
}

// Batch enrichment endpoint: process N temporary leads at a time (default 10)
export async function POST(request: NextRequest) {
	try {
		await dbConnect();

		const body = await request.json().catch(() => ({} as any));
		const batchSizeRaw = body?.batchSize ?? request.nextUrl.searchParams.get('batchSize');
		const requestUserId = body?.userId ?? request.nextUrl.searchParams.get('userId') ?? '';
		const batchSize = Math.max(1, Math.min(50, parseInt(String(batchSizeRaw || '10'), 10) || 10));

		// CRITICAL FIX: Process leads per user to get correct OpenAI key
		// If no userId provided, pick the first user with pending leads
		let query: any = { isAuthCheck: false };
		
		if (requestUserId) {
			query.userId = requestUserId;
		} else {
			// Find first user with pending leads
			const firstLead = await TemporaryLead.findOne({ isAuthCheck: false }).sort({ createdAt: 1 });
			if (!firstLead) {
				return NextResponse.json({ success: true, message: 'No pending temporary leads', remaining: 0 });
			}
			query.userId = firstLead.userId;
			console.log(`🔍 Processing leads for user: ${firstLead.userId}`);
		}

		// Fetch a batch of pending temporary leads FOR THIS USER ONLY
		const temps = await TemporaryLead.find(query).sort({ createdAt: 1 }).limit(batchSize);
		if (!temps || temps.length === 0) {
			const remaining = await TemporaryLead.countDocuments({ isAuthCheck: false });
			return NextResponse.json({ success: true, message: 'No pending temporary leads for this user', remaining });
		}
		
		// Use the userId from the temp leads
		const userId = temps[0].userId;
		console.log(`📦 Processing batch of ${temps.length} leads for user: ${userId}`);

		const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
		let processed = 0;
		let skipped = 0;
		let failed = 0;
		let duplicatesFound = 0;
		const details: Array<{ company: string; status: 'processed' | 'skipped' | 'failed'; reason?: string }>= [];

		// 🔍 DUPLICATE PREVENTION: Check for existing leads BEFORE OpenAI processing
		console.log(`🔍 Checking for duplicates among ${temps.length} leads...`);
		
		const duplicateChecks = await Promise.all(
			temps.map(async (temp) => {
				// Escape regex special characters for safe matching
				const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const companyRegex = new RegExp(`^${escapeRegex(temp.company)}$`, 'i');
				const locationRegex = new RegExp(`^${escapeRegex(temp.location)}$`, 'i');
				
				const existing = await Lead.findOne({
					company: { $regex: companyRegex },
					location: { $regex: locationRegex }
				});
				
				return { temp, isDuplicate: !!existing };
			})
		);
		
		// Filter out duplicates - only process NEW leads
		const newLeads = duplicateChecks.filter(check => !check.isDuplicate).map(check => check.temp);
		duplicatesFound = duplicateChecks.length - newLeads.length;
		
		console.log(`✅ Duplicate check complete: ${newLeads.length} new leads, ${duplicatesFound} duplicates skipped`);
		
		// Mark duplicates as processed to avoid reprocessing
		if (duplicatesFound > 0) {
			const duplicateIds = duplicateChecks.filter(check => check.isDuplicate).map(check => check.temp._id);
			await TemporaryLead.updateMany({ _id: { $in: duplicateIds } }, { $set: { isAuthCheck: true } });
			console.log(`🔒 Marked ${duplicatesFound} duplicates as checked`);
		}
		
		// Calculate coin savings
		const oldSystemCoins = temps.length; // Old system: 1 call per lead
		const coinsUsed = newLeads.length > 0 ? 1 : 0; // New system: 1 call per batch (or 0 if all duplicates)
		const coinsSaved = oldSystemCoins - coinsUsed;
		const savingsPercent = oldSystemCoins > 0 ? Math.round((coinsSaved / oldSystemCoins) * 100) : 0;
		
		console.log(`💰 Cost savings: ${coinsSaved} coins saved (${savingsPercent}% reduction)`);
		
		// Handle case where ALL leads are duplicates
		if (newLeads.length === 0) {
			console.log(`⚠️ All ${temps.length} leads were duplicates - no OpenAI call needed!`);
			
			return NextResponse.json({
				success: true,
				message: `All ${temps.length} leads were duplicates - saved ${coinsSaved} OpenAI coins!`,
				stats: {
					requested: temps.length,
					processed: 0,
					skipped: 0,
					failed: 0,
					duplicatesFound,
					remaining: await TemporaryLead.countDocuments({ isAuthCheck: false }),
					coinsUsed: 0,
					oldSystemCoins,
					coinsSaved,
					savingsPercent,
					batchSize
				},
				details: duplicateChecks.filter(c => c.isDuplicate).map(c => ({
					company: c.temp.company,
					status: 'skipped' as const,
					reason: 'Duplicate - already exists in database'
				}))
			});
		}

		// Single OpenAI call for NEW leads only
		const batchPayload = {
			items: newLeads.map((t, idx) => ({ index: idx, company: t.company })),
			userId
		};
		const batchResp = await fetch(`${appUrl}/api/internal/enrich-company-batch`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(batchPayload)
		});
		if (!batchResp.ok) {
			const errText = await batchResp.text();
			return NextResponse.json({ success: false, error: `Batch enrichment failed: ${errText}` }, { status: 502 });
		}
		const batchData = await batchResp.json();
		const results: Array<any> = Array.isArray(batchData?.results) ? batchData.results : [];

		// Mark all as checked to avoid reprocessing
		await TemporaryLead.updateMany({ _id: { $in: temps.map(t => t._id) } }, { $set: { isAuthCheck: true } });

		// Merge results back to NEW leads by index
		for (const t of newLeads) {
			try {
				const idx = newLeads.indexOf(t);
				const enriched = results.find(r => Number(r.index) === idx) as Enriched | undefined;
				if (!enriched) {
					failed++;
					details.push({ company: t.company, status: 'failed', reason: 'No result from batch' });
					continue;
				}
				const companyEmail = (enriched.company_email || '').trim();
				const ownerName = (enriched.owner_name || '').trim();
				if (!companyEmail || !ownerName) {
					skipped++;
					details.push({ company: t.company, status: 'skipped', reason: 'Missing required fields (company_email or owner_name)' });
					continue;
				}

				await Lead.create({
					name: t.name,
					company: enriched.company_name || t.company,
					location: t.location,
					website: t.website,
					email: companyEmail,
					phone: t.phone,
					linkedinProfile: t.linkedinProfile,
					status: 'active',
					googleAds: !!t.googleAds,
					googleAdsChecked: true,
					organicRanking: t.organicRanking,
					source: 'serp-api',
					address: t.address,
					rating: t.rating,
					reviews: t.reviews,
					authInformation: {
						company_name: enriched.company_name || '',
						company_email: companyEmail,
						owner_name: ownerName,
						owner_email: enriched.owner_email || '',
						manager_name: enriched.manager_name || '',
						manager_email: enriched.manager_email || '',
						hr_name: enriched.hr_name || '',
						hr_email: enriched.hr_email || '',
						executive_name: enriched.executive_name || '',
						executive_email: enriched.executive_email || ''
					},
					assignedTo: t.userId,
					leadsCreatedBy: t.userId,
				});

				processed++;
				details.push({ company: t.company, status: 'processed' });
			} catch (err: any) {
				failed++;
				details.push({ company: t.company, status: 'failed', reason: err?.message || 'Unexpected error' });
			}
		}

		const remaining = await TemporaryLead.countDocuments({ isAuthCheck: false });

		return NextResponse.json({
			success: true,
			message: `✅ Batch processed ${newLeads.length} new leads (${duplicatesFound} duplicates skipped) in ${coinsUsed} OpenAI call - saved ${coinsSaved} coins (${savingsPercent}% savings)`,
			stats: {
				requested: temps.length,
				processed,
				skipped,
				failed,
				duplicatesFound,
				newLeadsProcessed: newLeads.length,
				remaining,
				coinsUsed,
				oldSystemCoins,
				coinsSaved,
				savingsPercent,
				batchSize
			},
			details
		});
	} catch (error: any) {
		console.error('process-temporary-leads batch error:', error);
		return NextResponse.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
	}
}


