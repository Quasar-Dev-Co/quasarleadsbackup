import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/userSchema';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get all users without passwords
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

    return NextResponse.json(
      { users },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 