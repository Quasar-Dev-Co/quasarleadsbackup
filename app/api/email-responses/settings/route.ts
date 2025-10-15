import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

// AI Settings Schema - PER USER
const aiSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Link to specific user
  isEnabled: { type: Boolean, default: true },
  autoSendThreshold: { type: Number, default: 85 },
  defaultTone: { 
    type: String, 
    enum: ['professional', 'friendly', 'casual', 'formal'], 
    default: 'professional' 
  },
  includeCompanyInfo: { type: Boolean, default: true },
  maxResponseLength: { type: Number, default: 300 },
  customInstructions: { type: String, default: '' },
  responsePrompt: { type: String, default: `You are a calm, engaged entrepreneur who truly listens to potential clients. Respond to incoming emails with warmth and genuine attention, without any sales pressure. Your goal is to create real connection and trust.

CORE PRINCIPLES:
- Use short, warm sentences
- Avoid any form of pushy or commercial language
- Respond with genuine attention to what someone says
- Show understanding and recognition
- Make it clear you're there to help and brainstorm, not to sell
- Sound like a real entrepreneur, not a robot
- Create space for feeling, vulnerability, and trust

STRICT STRUCTURE (Follow this format EXACTLY):
1. Begin with warm acknowledgment of their message
2. Ask ONE open, soft follow-up question like:
   - "What caught your attention the most in what I shared?"
   - "Where are you currently focusing your efforts with your online visibility?"
   - "What's on your mind when it comes to your growth or marketing strategies right now?"
3. If it feels natural, suggest a casual Zoom call:
   "Maybe it would be helpful to take a look at this together. I'd love to offer some ideas in a casual Zoom call, no pressure at all."
4. End with a friendly, open tone:
   - "No rush — just let me know what feels right for you."
   - "I look forward to hearing from you when you're ready."
   - "Feel free to just drop me an email whenever you're ready to continue the conversation."

IMPORTANT:
- If the client asks for an appointment or booking, give ONLY this link: https://testqlagain.vercel.app/clientbooking
- NEVER ask for dates or times for appointments
- Just send the link without further instructions
- Always end with "Warmly, Team QuasarSEO"

Follow this format PERFECTLY. No exceptions. Be warm, human, and inviting without any sales pressure.` },
  companyName: { type: String, default: 'QuasarSEO' },
  senderName: { type: String, default: 'Team QuasarSEO' },
  senderEmail: { type: String, default: 'info@quasarseo.nl' },
  signature: { type: String, default: 'Warmly,\nTeam QuasarSEO' }
}, {
  timestamps: true
});

// Create model (use existing if already exists)
const AISettings = mongoose.models.AISettings || mongoose.model('AISettings', aiSettingsSchema);

/**
 * GET: Fetches AI settings configuration for authenticated user.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    // Get userId from Authorization header
    const authHeader = request.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User authentication required'
      }, { status: 401 });
    }
    
    // Get user-specific settings
    let settings = await AISettings.findOne({ userId: userId }).lean();
    
    // If no settings exist for this user, create default ones
    if (!settings) {
      const newSettings = new AISettings({ userId: userId });
      await newSettings.save();
      settings = await AISettings.findOne({ userId: userId }).lean();
    }
    
    if (!settings) {
      throw new Error('Failed to create or retrieve user settings');
    }
    
    return NextResponse.json({
      success: true,
      settings: {
        isEnabled: (settings as any).isEnabled,
        autoSendThreshold: (settings as any).autoSendThreshold,
        defaultTone: (settings as any).defaultTone,
        includeCompanyInfo: (settings as any).includeCompanyInfo,
        maxResponseLength: (settings as any).maxResponseLength,
        customInstructions: (settings as any).customInstructions,
        responsePrompt: (settings as any).responsePrompt,
        companyName: (settings as any).companyName,
        senderName: (settings as any).senderName,
        senderEmail: (settings as any).senderEmail,
        signature: (settings as any).signature
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching AI settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch AI settings'
    }, { status: 500 });
  }
}

/**
 * POST: Updates AI settings configuration for authenticated user.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    
    // Get userId from Authorization header
    const authHeader = request.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User authentication required'
      }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      isEnabled,
      autoSendThreshold,
      defaultTone,
      includeCompanyInfo,
      maxResponseLength,
      customInstructions,
      responsePrompt,
      companyName,
      senderName,
      senderEmail,
      signature
    } = body;
    
    // Validation
    if (autoSendThreshold < 0 || autoSendThreshold > 100) {
      return NextResponse.json({
        success: false,
        error: 'Auto-send threshold must be between 0 and 100'
      }, { status: 400 });
    }
    
    if (maxResponseLength < 50 || maxResponseLength > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Max response length must be between 50 and 1000'
      }, { status: 400 });
    }
    
    // Update or create settings for this specific user
    const updatedSettings = await AISettings.findOneAndUpdate(
      { userId: userId },
      {
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        autoSendThreshold: autoSendThreshold || 85,
        defaultTone: defaultTone || 'professional',
        includeCompanyInfo: includeCompanyInfo !== undefined ? includeCompanyInfo : true,
        maxResponseLength: maxResponseLength || 300,
        customInstructions: customInstructions || '',
        responsePrompt: responsePrompt || `You are a calm, engaged entrepreneur who truly listens to potential clients. Respond to incoming emails with warmth and genuine attention, without any sales pressure. Your goal is to create real connection and trust.

CORE PRINCIPLES:
- Use short, warm sentences
- Avoid any form of pushy or commercial language
- Respond with genuine attention to what someone says
- Show understanding and recognition
- Make it clear you're there to help and brainstorm, not to sell
- Sound like a real entrepreneur, not a robot
- Create space for feeling, vulnerability, and trust

STRICT STRUCTURE (Follow this format EXACTLY):
1. Begin with warm acknowledgment of their message
2. Ask ONE open, soft follow-up question like:
   - "What caught your attention the most in what I shared?"
   - "Where are you currently focusing your efforts with your online visibility?"
   - "What's on your mind when it comes to your growth or marketing strategies right now?"
3. If it feels natural, suggest a casual Zoom call:
   "Maybe it would be helpful to take a look at this together. I'd love to offer some ideas in a casual Zoom call, no pressure at all."
4. End with a friendly, open tone:
   - "No rush — just let me know what feels right for you."
   - "I look forward to hearing from you when you're ready."
   - "Feel free to just drop me an email whenever you're ready to continue the conversation."

IMPORTANT:
- If the client asks for an appointment or booking, give ONLY this link: https://testqlagain.vercel.app/clientbooking
- NEVER ask for dates or times for appointments
- Just send the link without further instructions
- Always end with "Warmly, Team QuasarSEO"

Follow this format PERFECTLY. No exceptions. Be warm, human, and inviting without any sales pressure.`,
        companyName: companyName || 'QuasarSEO',
        senderName: senderName || 'Team QuasarSEO',
        senderEmail: senderEmail || 'info@quasarseo.nl',
        signature: signature || 'Warmly,\nTeam QuasarSEO'
      },
      { 
        new: true,
        upsert: true // Create if doesn't exist
      }
    );
    
    console.log(`✅ AI settings updated successfully for user: ${userId}`);
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'AI settings updated successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error updating AI settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update AI settings'
    }, { status: 500 });
  }
} 