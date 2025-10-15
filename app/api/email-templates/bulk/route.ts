import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import EmailTemplate from '@/models/emailTemplateSchema';

type IncomingTemplate = {
  stage: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  isActive?: boolean;
  variables?: string[];
  timing?: { delay: number; unit: 'minutes' | 'hours' | 'days'; description: string };
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { userId, templates } = body || {};

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }
    if (!Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json({ success: false, error: 'templates array is required' }, { status: 400 });
    }

    // Validate and normalize
    const ops = (templates as IncomingTemplate[])
      .filter(t => t && t.stage && t.subject && t.htmlContent)
      .map(t => ({
        updateOne: {
          filter: { stage: t.stage, userId },
          update: {
            $set: {
              subject: t.subject,
              htmlContent: t.htmlContent,
              textContent: t.textContent || '',
              isActive: t.isActive !== undefined ? t.isActive : true,
              variables: Array.isArray(t.variables) ? t.variables : [],
              timing: t.timing || { delay: 7, unit: 'days', description: 'Send after 7 days' },
              userId
            }
          },
          upsert: true
        }
      }));

    if (ops.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid templates to import' }, { status: 400 });
    }

    const result = await EmailTemplate.bulkWrite(ops, { ordered: false });

    return NextResponse.json({
      success: true,
      message: 'Templates imported successfully',
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      matched: result.matchedCount || 0
    });
  } catch (error: any) {
    console.error('bulk import error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to import templates' }, { status: 500 });
  }
}


