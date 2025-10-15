import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SearchJob from '@/models/searchJobSchema';

export async function POST(request: NextRequest) {
	try {
		await dbConnect();
		const body = await request.json();
		const { services, locations, userId } = body || {};

		if (!userId) {
			return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
		}
		if (!services || !locations) {
			return NextResponse.json({ success: false, error: 'services and locations are required' }, { status: 400 });
		}

		// Parse services and locations
		const servicesList: string[] = typeof services === 'string' 
			? services.split(',').map(s => s.trim()).filter(Boolean)
			: Array.isArray(services) ? services : [services];
		
		const locationsList: string[] = typeof locations === 'string' 
			? locations.split(',').map(l => l.trim()).filter(Boolean)
			: Array.isArray(locations) ? locations : [locations];

		// Create job for each service×location combination
		const jobs = [];
		for (const service of servicesList) {
			for (const location of locationsList) {
				jobs.push({
					service: service.trim(),
					location: location.trim(),
					userId,
					status: 'pending'
				});
			}
		}

		// Insert all jobs
		const insertedJobs = await SearchJob.insertMany(jobs);
		const totalCombinations = servicesList.length * locationsList.length;

		return NextResponse.json({ 
			success: true, 
			jobsCreated: insertedJobs.length,
			totalCombinations,
			estimatedTime: `${totalCombinations * 5} minutes`,
			message: `Created ${totalCombinations} search jobs. Each will process in ~5 minutes via cron.`
		});
	} catch (error: any) {
		console.error('Search job creation error:', error);
		return NextResponse.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
	}
}


