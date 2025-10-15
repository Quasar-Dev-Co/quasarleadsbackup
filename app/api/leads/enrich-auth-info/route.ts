import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { leadId } = body || {};

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    // Explicitly select needed fields (company + ownership to resolve user key)
    const leadDoc = await Lead.findById(leadId)
      .select('company assignedTo leadsCreatedBy')
      .lean() as { company?: string; assignedTo?: string; leadsCreatedBy?: string } | null;
    if (!leadDoc) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }
    if (!leadDoc.company || typeof leadDoc.company !== 'string') {
      return NextResponse.json({ success: false, error: 'Lead has no company name to enrich' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const userId = (leadDoc.assignedTo as any) || (leadDoc.leadsCreatedBy as any) || '';
    const resp = await fetch(`${appUrl}/api/internal/enrich-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: leadDoc.company, userId })
    });

    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json({ success: false, error: `Enrichment failed: ${err}` }, { status: 502 });
    }

    const data = await resp.json();
    const enriched = data?.lead;
    if (!enriched) {
      return NextResponse.json({ success: false, error: 'No enrichment data returned' }, { status: 500 });
    }

    const updated = await Lead.findByIdAndUpdate(
      leadId,
      {
        $set: {
          authInformation: {
            company_name: enriched.company_name || '',
            company_email: enriched.company_email || '',
            owner_name: enriched.owner_name || '',
            owner_email: enriched.owner_email || '',
            manager_name: enriched.manager_name || '',
            manager_email: enriched.manager_email || '',
            hr_name: enriched.hr_name || '',
            hr_email: enriched.hr_email || '',
            executive_name: enriched.executive_name || '',
            executive_email: enriched.executive_email || ''
          },
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to enrich author info' }, { status: 500 });
  }
}


