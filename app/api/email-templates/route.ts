import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import EmailTemplate from '@/models/emailTemplateSchema';

interface EmailTemplateData {
  id?: string;
  stage: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  isActive: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
  timing?: {
    delay: number;
    unit: 'minutes' | 'hours' | 'days';
    description: string;
  };
}

// GET - Fetch all email templates
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required to fetch email templates'
      }, { status: 400 });
    }
    
    const templates = await EmailTemplate.find({ userId }).sort({ stage: 1 });
    
    // Convert to plain objects and add id field
    const cleanTemplates = templates.map((template) => ({
      id: template._id.toString(),
      stage: template.stage,
      subject: template.subject,
      contentPrompt: template.contentPrompt || '',
      emailSignature: template.emailSignature || '',
      mediaLinks: template.mediaLinks || '',
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      isActive: template.isActive,
      variables: template.variables,
      timing: template.timing,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    }));
    
    console.log(`📧 Retrieved ${cleanTemplates.length} email templates`);
    
    return NextResponse.json({
      success: true,
      templates: cleanTemplates
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching email templates:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch email templates'
    }, { status: 500 });
  }
}

// POST - Save email template
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      stage, 
      subject, 
      contentPrompt, 
      emailSignature, 
      mediaLinks,
      htmlContent, 
      textContent, 
      isActive, 
      variables, 
      timing, 
      userId 
    } = body;
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required to save email template'
      }, { status: 400 });
    }
    
    // Validate required fields - now we need either contentPrompt (new) or htmlContent (legacy)
    if (!stage || !subject) {
      return NextResponse.json({
        success: false,
        error: 'Stage and subject are required'
      }, { status: 400 });
    }
    
    if (!contentPrompt && !htmlContent) {
      return NextResponse.json({
        success: false,
        error: 'Either contentPrompt (new system) or htmlContent (legacy) is required'
      }, { status: 400 });
    }
    
    const templateData = {
      stage,
      subject,
      contentPrompt: contentPrompt || '',
      emailSignature: emailSignature || '',
      mediaLinks: mediaLinks || '',
      htmlContent: htmlContent || '', // Keep for backwards compatibility
      textContent: textContent || '',
      isActive: isActive !== undefined ? isActive : true,
      variables: variables || [],
      userId,
      timing: timing || { delay: 7, unit: 'days', description: 'Send after 7 days' }
    };
    
    // Update existing template or create new one
    // First check if a template with this stage already exists for this user
    const existingTemplate = await EmailTemplate.findOne({ stage, userId });
    
    let result;
    if (existingTemplate) {
      // Update existing template for this user
      result = await EmailTemplate.findByIdAndUpdate(
        existingTemplate._id,
        templateData,
        { new: true, runValidators: true }
      );
      console.log(`📧 Updated existing email template for stage: ${stage} for user: ${userId}`);
    } else {
      // Create new template for this user (multiple users can have same stage names)
      result = await EmailTemplate.create(templateData);
      console.log(`📧 Created new email template for stage: ${stage} for user: ${userId}`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Email template for ${stage} saved successfully`,
      template: {
        id: result._id.toString(),
        stage: result.stage,
        subject: result.subject,
        htmlContent: result.htmlContent,
        textContent: result.textContent,
        isActive: result.isActive,
        variables: result.variables,
        timing: result.timing,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error saving email template:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to save email template'
    }, { status: 500 });
  }
}

// PUT - Update specific template
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { id, stage, subject, htmlContent, textContent, isActive, variables, timing, userId } = body;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required to update email template'
      }, { status: 400 });
    }
    
    if (!id && !stage) {
      return NextResponse.json({
        success: false,
        error: 'Template ID or stage is required'
      }, { status: 400 });
    }
    
    const updateData: any = {};
    if (subject) updateData.subject = subject;
    if (htmlContent) updateData.htmlContent = htmlContent;
    if (textContent !== undefined) updateData.textContent = textContent;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (variables) updateData.variables = variables;
    if (timing) updateData.timing = timing;
    
    const filter = id ? { _id: id, userId } : { stage, userId };
    const result = await EmailTemplate.findOneAndUpdate(
      filter, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }
    
    console.log(`📧 Updated email template: ${stage || id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Email template updated successfully',
      template: {
        id: result._id.toString(),
        stage: result.stage,
        subject: result.subject,
        htmlContent: result.htmlContent,
        textContent: result.textContent,
        isActive: result.isActive,
        variables: result.variables,
        timing: result.timing,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error updating email template:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update email template'
    }, { status: 500 });
  }
}

// DELETE - Delete email template
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required to delete email template'
      }, { status: 400 });
    }
    
    if (!stage && !id) {
      return NextResponse.json({
        success: false,
        error: 'Stage or ID parameter is required'
      }, { status: 400 });
    }
    
    const filter = id ? { _id: id, userId } : { stage, userId };
    const result = await EmailTemplate.findOneAndDelete(filter);
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }
    
    console.log(`📧 Deleted email template: ${stage || id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error deleting email template:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete email template'
    }, { status: 500 });
  }
} 