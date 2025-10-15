const mongoose = require('mongoose');
require('dotenv').config();

// Job Queue Schema
const jobQueueSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['lead-collection', 'google-ads-check', 'email-sequence'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    index: true
  },
  services: [{
    type: String,
    required: true
  }],
  locations: [{
    type: String,
    required: true
  }],
  leadQuantity: {
    type: Number,
    required: true
  },
  userId: {
    type: String,
    trim: true,
    index: true
  },
  // ... other fields
}, {
  timestamps: true
});

const JobQueue = mongoose.model('JobQueue', jobQueueSchema);

async function checkJobUserId() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the most recent job
    console.log('\n🧪 Looking for recent jobs...');
    
    const recentJobs = await JobQueue.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (recentJobs.length === 0) {
      console.log('❌ No jobs found');
      return;
    }

    console.log('✅ Found recent jobs:');
    recentJobs.forEach((job, index) => {
      console.log(`\n${index + 1}. Job ID: ${job.jobId}`);
      console.log(`   Type: ${job.type}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Services: ${job.services?.join(', ')}`);
      console.log(`   Locations: ${job.locations?.join(', ')}`);
      console.log(`   Lead Quantity: ${job.leadQuantity}`);
      console.log(`   User ID: ${job.userId || 'NOT SET'}`);
      console.log(`   Created: ${job.createdAt}`);
    });

    // Check for jobs with user ID
    const jobsWithUserId = recentJobs.filter(job => job.userId);
    console.log(`\n📈 Jobs with user ID: ${jobsWithUserId.length}/${recentJobs.length}`);

    if (jobsWithUserId.length > 0) {
      console.log('✅ SUCCESS: Some jobs have user ID!');
    } else {
      console.log('❌ No jobs found with user ID');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
checkJobUserId(); 