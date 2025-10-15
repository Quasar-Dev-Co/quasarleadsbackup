const mongoose = require('mongoose');
require('dotenv').config();

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  admin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function checkUserPassword() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the user
    console.log('\n🧪 Looking for user with email: info.pravas.cs@gmail.com');
    
    const user = await User.findOne({ email: 'info.pravas.cs@gmail.com' }).lean();

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Password hash:', user.password);
    console.log('Admin:', user.admin);
    console.log('Verified:', user.verified);
    console.log('Created:', user.createdAt);

    // Test different passwords
    console.log('\n🧪 Testing password: quasarseo1234');
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare('quasarseo1234', user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('\n🧪 Testing password: password');
      const isMatch2 = await bcrypt.compare('password', user.password);
      console.log('Password match:', isMatch2);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkUserPassword(); 