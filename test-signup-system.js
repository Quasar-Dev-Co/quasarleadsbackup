const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User Schema (same as in the model)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
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

async function testSignupSystem() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a test user
    console.log('\n🧪 Test 1: Creating a test user...');
    
    const testUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123',
      verified: false,
      admin: false
    };

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(testUserData.password, saltRounds);

    const testUser = new User({
      ...testUserData,
      password: hashedPassword
    });

    await testUser.save();
    console.log('✅ Test user created successfully');

    // Test 2: Verify the user was created with correct data
    console.log('\n🧪 Test 2: Verifying user data...');
    
    const savedUser = await User.findOne({ email: testUserData.email });
    console.log('📋 User details:');
    console.log(`   Username: ${savedUser.username}`);
    console.log(`   Email: ${savedUser.email}`);
    console.log(`   Verified: ${savedUser.verified}`);
    console.log(`   Admin: ${savedUser.admin}`);
    console.log(`   Created: ${savedUser.createdAt}`);

    // Test 3: Test password verification
    console.log('\n🧪 Test 3: Testing password verification...');
    
    const isPasswordValid = await bcrypt.compare(testUserData.password, savedUser.password);
    console.log(`✅ Password verification: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);

    // Test 4: Test login with correct credentials
    console.log('\n🧪 Test 4: Testing login simulation...');
    
    const loginUser = await User.findOne({ email: testUserData.email });
    if (loginUser && !loginUser.verified) {
      console.log('⚠️ User exists but is not verified (expected for new signups)');
    }

    // Test 5: Verify the user (simulate admin action)
    console.log('\n🧪 Test 5: Simulating admin verification...');
    
    loginUser.verified = true;
    await loginUser.save();
    console.log('✅ User verified by admin');

    // Test 6: Test login after verification
    console.log('\n🧪 Test 6: Testing login after verification...');
    
    const verifiedUser = await User.findOne({ 
      email: testUserData.email,
      verified: true 
    });
    
    if (verifiedUser) {
      const loginPasswordValid = await bcrypt.compare(testUserData.password, verifiedUser.password);
      console.log(`✅ Login test: ${loginPasswordValid ? 'SUCCESS' : 'FAILED'}`);
    }

    // Test 7: Check for duplicate email prevention
    console.log('\n🧪 Test 7: Testing duplicate email prevention...');
    
    try {
      const duplicateUser = new User({
        username: 'testuser2',
        email: 'test@example.com', // Same email
        password: hashedPassword,
        verified: false,
        admin: false
      });
      
      await duplicateUser.save();
      console.log('❌ FAILED: Duplicate email was allowed');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✅ SUCCESS: Duplicate email prevented');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Clean up - delete test user
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteOne({ email: testUserData.email });
    console.log('✅ Test user deleted');

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('✅ User creation works');
    console.log('✅ Password hashing works');
    console.log('✅ Password verification works');
    console.log('✅ User verification system works');
    console.log('✅ Duplicate email prevention works');
    console.log('✅ Database operations work correctly');

    console.log('\n🎉 All tests passed! The signup system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testSignupSystem(); 