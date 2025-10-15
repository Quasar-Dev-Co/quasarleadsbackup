import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/userSchema';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get user ID from the request headers or query params
    // For now, we'll use a simple approach - you might want to implement proper JWT tokens later
    const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Find user by ID
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(), // Convert ObjectId to string and map to 'id'
        _id: user._id,
        username: user.username,
        email: user.email,
        verified: user.verified,
        admin: user.admin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 