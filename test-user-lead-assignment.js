const mongoose = require('mongoose');
const Lead = require('./models/leadSchema').default;

// Test script to verify user lead assignment
async function testUserLeadAssignment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quasarleads');
    console.log('✅ Connected to MongoDB');

    // Create a test lead with user assignment
    const testLead = new Lead({
      name: 'Test User Lead',
      company: 'Test Company',
      email: 'test@example.com',
      location: 'Test Location',
      status: 'active',
      assignedTo: 'quasar-admin', // This should be the current user's ID
      source: 'test',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testLead.save();
    console.log('✅ Test lead created with user assignment');

    // Fetch the lead to verify assignment
    const savedLead = await Lead.findOne({ email: 'test@example.com' });
    console.log('📋 Lead details:');
    console.log(`   Name: ${savedLead.name}`);
    console.log(`   Company: ${savedLead.company}`);
    console.log(`   Assigned To: ${savedLead.assignedTo}`);
    console.log(`   Created At: ${savedLead.createdAt}`);

    // Check if assignment is working
    if (savedLead.assignedTo === 'quasar-admin') {
      console.log('✅ SUCCESS: Lead is properly assigned to user!');
    } else {
      console.log('❌ FAILED: Lead is not assigned to user');
    }

    // Clean up - delete test lead
    await Lead.deleteOne({ email: 'test@example.com' });
    console.log('🧹 Test lead cleaned up');

    // Check existing leads for user assignment
    const allLeads = await Lead.find({}).limit(5);
    console.log('\n📊 Sample of existing leads:');
    allLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} (${lead.company}) - Assigned to: ${lead.assignedTo || 'Not assigned'}`);
    });

    // Count leads by assignment
    const assignedLeads = await Lead.countDocuments({ assignedTo: 'quasar-admin' });
    const unassignedLeads = await Lead.countDocuments({ assignedTo: { $exists: false } });
    
    console.log('\n📈 Lead Assignment Statistics:');
    console.log(`   Assigned to quasar-admin: ${assignedLeads}`);
    console.log(`   Unassigned leads: ${unassignedLeads}`);

  } catch (error) {
    console.error('❌ Error testing user lead assignment:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testUserLeadAssignment(); 