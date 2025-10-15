import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/userSchema';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { newEmail, currentPassword } = await request.json();

    if (!newEmail || !currentPassword) {
      return NextResponse.json(
        { success: false, error: 'New email and current password are required' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    const userId = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const normalizedEmail = String(newEmail).trim().toLowerCase();
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // If email is unchanged
    if (user.email.toLowerCase() === normalizedEmail) {
      return NextResponse.json(
        { success: false, error: 'New email must be different from current email' },
        { status: 400 }
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Ensure email is not already taken by another user
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email is already in use' },
        { status: 409 }
      );
    }

    user.email = normalizedEmail;
    await user.save();

    const { password: _pw, ...userWithoutPassword } = user.toObject();

    return NextResponse.json({ success: true, message: 'Email updated successfully', user: userWithoutPassword });
  } catch (error) {
    console.error('Change email error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


