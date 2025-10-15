import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SearchJob from '@/models/searchJobSchema';
import TemporaryLead from '@/models/temporaryLeadSchema';

export const runtime = 'nodejs';

type SerpResult = {
	name?: string;
	title?: string;
	company?: string;
	location?: string;
	website?: string;
	email?: string;
	phone?: string;
	linkedin?: string;
	address?: string;
	rating?: string;
	reviews?: string;
	googleAds?: boolean;
	organicRanking?: number;
};

export async function GET(_req: NextRequest) {
	try {
		await dbConnect();
		
		// Pick the oldest pending search job
		const job = await SearchJob.findOne({ status: 'pending' }).sort({ createdAt: 1 });
		if (!job) {
			return NextResponse.json({ success: true, message: 'No pending search jobs' });
		}

		console.log(`🔍 Processing search job: ${job.service} in ${job.location}`);
		
		// Mark as processing
		await SearchJob.updateOne({ _id: job._id }, { 
			$set: { 
				status: 'processing', 
				startedAt: new Date(),
				progress: 10 
			} 
		});

		try {
			// Get SERPAPI key from environment (for now, user credentials can be added later)
			const serpKey: string | undefined = process.env.SERPAPI_KEY;
			
			if (!serpKey) {
				console.error('❌ SERPAPI_KEY environment variable not set!');
				console.log('💡 Create a .env.local file with: SERPAPI_KEY=your_key_here');
				throw new Error('Missing SERPAPI_KEY environment variable - check console for setup instructions');
			}

			console.log(`🔍 Processing: ${job.service} in ${job.location}`);

			// Update progress
			await SearchJob.updateOne({ _id: job._id }, { $set: { progress: 30 } });

			// Call SerpAPI (Google Maps) for this specific service+location
			const params = new URLSearchParams({
				engine: 'google_maps',
				q: `${job.service} ${job.location}`,
				api_key: serpKey,
				hl: 'en'
			});
			
			const resp = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
			if (!resp.ok) {
				throw new Error(`SerpAPI request failed: ${resp.status}`);
			}
			
			const data = await resp.json();
			console.log(`📊 SerpAPI response for "${job.service} ${job.location}":`, {
				hasPlacesResults: !!data?.places_results,
				placesCount: data?.places_results?.length || 0,
				hasLocalResults: !!data?.local_results,
				localCount: data?.local_results?.length || 0
			});
			
			// Update progress
			await SearchJob.updateOne({ _id: job._id }, { $set: { progress: 60 } });

			// Parse results from places_results or local_results
			const placesResults = data?.places_results || data?.local_results || [];
			const results: SerpResult[] = Array.isArray(placesResults) ? placesResults.map((p: any, idx: number) => ({
				name: p.title,
				company: p.title,
				location: p?.address || job.location,
				website: p?.links?.website,
				phone: p?.phone,
				address: p?.address,
				rating: p?.rating?.toString?.(),
				reviews: p?.reviews?.toString?.(),
				googleAds: !!p?.ads || !!p?.sponsored,
				organicRanking: idx + 1
			})) : [];

			// Save to TemporaryLead with isAuthCheck: false
			const ops = results.slice(0, 50).map((r) => ({
				updateOne: {
					filter: { company: r.company || r.name, location: r.location, userId: job.userId },
					update: {
						$setOnInsert: { isAuthCheck: false, userId: job.userId }, // Key: false so cron can process
						$set: {
							name: r.name || r.company || 'Unknown',
							company: r.company || r.name || 'Unknown',
							location: r.location || job.location,
							website: r.website,
							email: r.email,
							phone: r.phone,
							linkedinProfile: r.linkedin,
							googleAds: !!r.googleAds,
							googleAdsChecked: true,
							organicRanking: r.organicRanking,
							source: 'serp-api',
							address: r.address,
							rating: r.rating,
							reviews: r.reviews,
						}
					},
					upsert: true
				}
			}));

			if (ops.length > 0) {
				const writeResult = await TemporaryLead.bulkWrite(ops, { ordered: false });
				console.log(`💾 Saved ${ops.length} leads to TemporaryLead collection:`, {
					upserted: writeResult.upsertedCount,
					modified: writeResult.modifiedCount,
					matched: writeResult.matchedCount
				});
			} else {
				console.log(`⚠️ No leads to save for ${job.service} in ${job.location}`);
			}

			// Mark job as completed
			await SearchJob.updateOne({ _id: job._id }, { 
				$set: { 
					status: 'completed',
					progress: 100,
					leadsFound: results.length,
					completedAt: new Date()
				} 
			});

			console.log(`✅ Search job completed: ${job.service} in ${job.location} - Found ${results.length} leads`);
			
			return NextResponse.json({ 
				success: true, 
				processed: `${job.service} in ${job.location}`,
				leadsFound: results.length 
			});

		} catch (error: any) {
			console.error('Search job processing error:', error);
			
			// Mark job as failed
			await SearchJob.updateOne({ _id: job._id }, { 
				$set: { 
					status: 'failed',
					errorMessage: error.message,
					completedAt: new Date()
				} 
			});
			
			return NextResponse.json({ 
				success: false, 
				error: error.message,
				job: `${job.service} in ${job.location}`
			}, { status: 500 });
		}

	} catch (error: any) {
		console.error('Process search jobs error:', error);
		return NextResponse.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
	}
}
