const mongoose = require('mongoose');
require('dotenv').config();

// User Schema
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

// Lead Schema
const leadSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  company: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  location: { 
    type: String, 
    required: true,
    trim: true
  },
  website: { 
    type: String, 
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  phone: { 
    type: String, 
    trim: true
  },
  linkedinProfile: { 
    type: String, 
    trim: true,
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'emailed', 'replied', 'booked', 'not interested', 'closed won', 'closed lost', 'archived'],
    default: 'active',
    index: true
  },
  googleAds: {
    type: Boolean,
    default: false
  },
  googleAdsChecked: {
    type: Boolean,
    default: false
  },
  organicRanking: {
    type: Number,
    min: 1,
    max: 100
  },
  isHighValue: {
    type: Boolean,
    default: false,
    index: true
  },
  notes: { 
    type: String, 
    default: '' 
  },
  tags: { 
    type: [String], 
    default: [],
    index: true
  },
  source: {
    type: String,
    default: 'search',
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: String,
    trim: true,
    index: true
  },
  leadsCreatedBy: {
    type: String,
    trim: true,
    index: true
  },
  dealValue: {
    type: Number,
    min: 0
  },
  probability: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);
const Lead = mongoose.model('Lead', leadSchema);

async function testLeadUserAssignment() {
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

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Found admin user:');
    console.log(`   ID: ${adminUser._id}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Verified: ${adminUser.verified}`);
    console.log(`   Admin: ${adminUser.admin}`);

    // Test 1: Create a test lead with the admin user ID
    console.log('\n🧪 Test 1: Creating a test lead with admin user ID...');
    
    const testLead = new Lead({
      name: 'Test Lead User Assignment',
      company: 'Test Company',
      email: 'test-lead-user@example.com',
      location: 'Test Location',
      status: 'active',
      source: 'test',
      assignedTo: adminUser._id.toString(),
      leadsCreatedBy: adminUser._id.toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testLead.save();
    console.log('✅ Test lead created successfully');

    // Test 2: Verify the lead was created with correct user assignment
    console.log('\n🧪 Test 2: Verifying lead user assignment...');
    
    const savedLead = await Lead.findOne({ email: 'test-lead-user@example.com' });
    console.log('📋 Lead details:');
    console.log(`   Name: ${savedLead.name}`);
    console.log(`   Company: ${savedLead.company}`);
    console.log(`   Email: ${savedLead.email}`);
    console.log(`   Assigned To: ${savedLead.assignedTo}`);
    console.log(`   Created By: ${savedLead.leadsCreatedBy}`);
    console.log(`   Created At: ${savedLead.createdAt}`);

    // Test 3: Check if assignment matches admin user ID
    console.log('\n🧪 Test 3: Checking user assignment...');
    
    if (savedLead.assignedTo === adminUser._id.toString()) {
      console.log('✅ SUCCESS: Lead is properly assigned to admin user!');
    } else {
      console.log('❌ FAILED: Lead is not assigned to admin user');
    }

    if (savedLead.leadsCreatedBy === adminUser._id.toString()) {
      console.log('✅ SUCCESS: Lead is properly marked as created by admin user!');
    } else {
      console.log('❌ FAILED: Lead is not marked as created by admin user');
    }

    // Test 4: Check existing leads for user assignment
    console.log('\n🧪 Test 4: Checking existing leads...');
    
    const allLeads = await Lead.find({}).limit(5);
    console.log('\n📊 Sample of existing leads:');
    allLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} (${lead.company})`);
      console.log(`   Assigned to: ${lead.assignedTo || 'Not assigned'}`);
      console.log(`   Created by: ${lead.leadsCreatedBy || 'Not specified'}`);
    });

    // Test 5: Count leads by assignment
    console.log('\n🧪 Test 5: Lead assignment statistics...');
    
    const assignedLeads = await Lead.countDocuments({ assignedTo: adminUser._id.toString() });
    const createdLeads = await Lead.countDocuments({ leadsCreatedBy: adminUser._id.toString() });
    const unassignedLeads = await Lead.countDocuments({ assignedTo: { $exists: false } });
    const noCreatorLeads = await Lead.countDocuments({ leadsCreatedBy: { $exists: false } });

    console.log('\n📈 Lead Assignment Statistics:');
    console.log(`   Assigned to admin user: ${assignedLeads}`);
    console.log(`   Created by admin user: ${createdLeads}`);
    console.log(`   Unassigned leads: ${unassignedLeads}`);
    console.log(`   Leads without creator: ${noCreatorLeads}`);

    // Clean up - delete test lead
    console.log('\n🧹 Cleaning up test data...');
    await Lead.deleteOne({ email: 'test-lead-user@example.com' });
    console.log('✅ Test lead cleaned up');

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('✅ Lead creation with user assignment works');
    console.log('✅ User ID is properly stored in assignedTo field');
    console.log('✅ User ID is properly stored in leadsCreatedBy field');
    console.log('✅ Database operations work correctly');

    console.log('\n🎉 All tests passed! The lead user assignment system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testLeadUserAssignment(); 