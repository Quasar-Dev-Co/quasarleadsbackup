import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SearchJob from '@/models/searchJobSchema';
import TemporaryLead from '@/models/temporaryLeadSchema';
import Lead from '@/models/leadSchema';

export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		
		// Step 1: Check current state
		const searchJobs = await SearchJob.countDocuments();
		const searchPending = await SearchJob.countDocuments({ status: 'pending' });
		const searchCompleted = await SearchJob.countDocuments({ status: 'completed' });
		
		const tempCount = await TemporaryLead.countDocuments();
		const tempPending = await TemporaryLead.countDocuments({ isAuthCheck: false });
		const tempProcessed = await TemporaryLead.countDocuments({ isAuthCheck: true });
		const mainLeads = await Lead.countDocuments({ source: 'serp-api' });
		
		// Step 2: Get recent examples
		const recentSearchJobs = await SearchJob.find().sort({ createdAt: -1 }).limit(3).lean();
		const recentTemp = await TemporaryLead.find().sort({ createdAt: -1 }).limit(3).lean();
		const recentMain = await Lead.find({ source: 'serp-api' }).sort({ createdAt: -1 }).limit(3).lean();
		
		return NextResponse.json({
			success: true,
			statistics: {
				searchJobs: {
					total: searchJobs,
					pending: searchPending,
					completed: searchCompleted
				},
				temporaryLeads: {
					total: tempCount,
					pendingAuth: tempPending,
					processed: tempProcessed
				},
				mainLeads: {
					fromSerpApi: mainLeads
				}
			},
			examples: {
				recentSearchJobs: recentSearchJobs,
				recentTemporary: recentTemp,
				recentMain: recentMain
			},
			instructions: {
				step1: "POST /api/temporary-leads/search with {services, locations, userId} - Creates search jobs",
				step2: "GET /api/cron/process-search-jobs - Processes 1 search job (SerpAPI call)",
				step3: "GET /api/cron/process-temporary-leads - Processes 5 leads in 1 batch (1 OpenAI call for 5 leads)",
				step4: "Check this endpoint again to see results",
				note: "In production: search jobs process every 5 minutes, auth checks every minute"
			}
		});
	} catch (error: any) {
		return NextResponse.json({ success: false, error: error.message }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, userId } = body;
		
		if (action === 'test-search') {
			// Test the search flow (creates jobs)
			const searchResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/temporary-leads/search`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					services: 'web design,plumber',
					locations: 'Austin,Dallas',
					userId: userId || 'test-user'
				})
			});
			const searchData = await searchResp.json();
			
			return NextResponse.json({
				success: true,
				searchResult: searchData,
				message: 'Search jobs created. Use test-search-process to process them.'
			});
		}
		
		if (action === 'test-search-process') {
			// Test the search job processing
			const processResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/process-search-jobs`);
			const processData = await processResp.json();
			
			return NextResponse.json({
				success: true,
				processResult: processData,
				message: 'Search job processed. Check database for temporary leads.'
			});
		}
		
		if (action === 'test-auth-process') {
			// Test the auth check processing (OpenAI enrichment)
			const processResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/process-temporary-leads`);
			const processData = await processResp.json();
			
			return NextResponse.json({
				success: true,
				processResult: processData,
				message: 'Auth check processed. Check database for enriched leads in main collection.'
			});
		}
		
		return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
	} catch (error: any) {
		return NextResponse.json({ success: false, error: error.message }, { status: 500 });
	}
}
