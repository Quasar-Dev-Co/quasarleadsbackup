import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import EmailTemplate from '@/models/emailTemplateSchema';

type IncomingTemplate = {
  stage: string;
  subject: string;
  // Old format
  htmlContent?: string;
  textContent?: string;
  // New modular format
  contentPrompt?: string;
  emailSignature?: string;
  mediaLinks?: string;
  // Common fields
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

    // Validate and normalize - accept both old and new formats
    const ops = (templates as IncomingTemplate[])
      .filter(t => {
        // Template must have stage and subject
        if (!t || !t.stage || !t.subject) return false;
        // Must have either old format (htmlContent) OR new format (contentPrompt)
        return !!(t.htmlContent || t.contentPrompt);
      })
      .map(t => {
        const updateData: any = {
          subject: t.subject,
          isActive: t.isActive !== undefined ? t.isActive : true,
          variables: Array.isArray(t.variables) ? t.variables : [],
          timing: t.timing || { delay: 7, unit: 'days', description: 'Send after 7 days' },
          userId
        };

        // Handle new modular format
        if (t.contentPrompt !== undefined) {
          updateData.contentPrompt = t.contentPrompt;
        }
        if (t.emailSignature !== undefined) {
          updateData.emailSignature = t.emailSignature;
        }
        if (t.mediaLinks !== undefined) {
          updateData.mediaLinks = t.mediaLinks;
        }

        // Handle old format (backward compatibility)
        if (t.htmlContent !== undefined) {
          updateData.htmlContent = t.htmlContent;
        }
        if (t.textContent !== undefined) {
          updateData.textContent = t.textContent;
        }

        return {
          updateOne: {
            filter: { stage: t.stage, userId },
            update: { $set: updateData },
            upsert: true
          }
        };
      });

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


