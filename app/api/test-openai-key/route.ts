import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const credentials = (user as any)?.credentials || {};
    const openaiKey = credentials.OPENAI_API_KEY;
    
    return NextResponse.json({
      success: true,
      debug: {
        userFound: !!user,
        hasCredentials: !!credentials,
        credentialKeys: Object.keys(credentials),
        hasOpenAIKey: !!openaiKey,
        openaiKeyType: typeof openaiKey,
        openaiKeyLength: openaiKey ? openaiKey.length : 0,
        openaiKeyPreview: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'null'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Test failed',
      stack: error.stack 
    }, { status: 500 });
  }
}
