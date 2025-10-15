import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/userSchema';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, action } = await request.json();

    // Validate input
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "verify" or "reject"' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (action === 'verify') {
      // Verify user
      user.verified = true;
      await user.save();

      return NextResponse.json(
        { 
          message: 'User verified successfully',
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            verified: user.verified,
            admin: user.admin
          }
        },
        { status: 200 }
      );
    } else if (action === 'reject') {
      // Delete user
      await User.findByIdAndDelete(userId);

      return NextResponse.json(
        { message: 'User rejected and deleted successfully' },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get all unverified users
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const unverifiedUsers = await User.find({ verified: false }).select('-password');

    return NextResponse.json(
      { 
        users: unverifiedUsers,
        count: unverifiedUsers.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get unverified users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 