const mongoose = require('mongoose');
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

async function testUserDataFetch() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    console.log('\n🧪 Looking for admin user...');
    
    const adminUser = await User.findOne({ 
      email: 'info.pravas.cs@gmail.com' 
    }).select('-password');

    if (adminUser) {
      console.log('✅ Found admin user:');
      console.log(`   ID: ${adminUser._id}`);
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Verified: ${adminUser.verified}`);
      console.log(`   Admin: ${adminUser.admin}`);
      console.log(`   Created: ${adminUser.createdAt}`);
      console.log(`   Updated: ${adminUser.updatedAt}`);

      // Test the API endpoint simulation
      console.log('\n🧪 Testing API endpoint simulation...');
      
      const userData = {
        _id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
        verified: adminUser.verified,
        admin: adminUser.admin,
        createdAt: adminUser.createdAt,
        updatedAt: adminUser.updatedAt
      };

      console.log('📋 User data that should be returned by API:');
      console.log(JSON.stringify(userData, null, 2));

      // Check if the user should show as admin and verified
      if (userData.admin && userData.verified) {
        console.log('\n✅ SUCCESS: User is properly configured as admin and verified!');
        console.log('   This should show correctly in the Account Settings page.');
      } else {
        console.log('\n⚠️ WARNING: User is not properly configured:');
        if (!userData.admin) console.log('   - User is not an admin');
        if (!userData.verified) console.log('   - User is not verified');
      }

    } else {
      console.log('❌ Admin user not found');
      
      // List all users
      console.log('\n📊 All users in database:');
      const allUsers = await User.find({}).select('-password');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email}) - Admin: ${user.admin}, Verified: ${user.verified}`);
      });
    }

    // Test the /api/auth/me endpoint simulation
    console.log('\n🧪 Testing /api/auth/me endpoint simulation...');
    
    if (adminUser) {
      const mockApiResponse = {
        success: true,
        user: {
          _id: adminUser._id,
          username: adminUser.username,
          email: adminUser.email,
          verified: adminUser.verified,
          admin: adminUser.admin,
          createdAt: adminUser.createdAt,
          updatedAt: adminUser.updatedAt
        }
      };

      console.log('📋 Mock API response:');
      console.log(JSON.stringify(mockApiResponse, null, 2));

      // This is what the frontend should receive
      const frontendUserData = mockApiResponse.user;
      console.log('\n📋 Frontend user data:');
      console.log(`   Username: ${frontendUserData.username}`);
      console.log(`   Email: ${frontendUserData.email}`);
      console.log(`   Verified: ${frontendUserData.verified}`);
      console.log(`   Admin: ${frontendUserData.admin}`);

      if (frontendUserData.admin && frontendUserData.verified) {
        console.log('\n🎉 PERFECT! The frontend should now show:');
        console.log('   ✅ Admin badge');
        console.log('   ✅ Verified badge');
        console.log('   ✅ No "Unverified" status');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testUserDataFetch(); 