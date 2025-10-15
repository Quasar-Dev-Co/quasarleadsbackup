const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Test booking creation with user ID
async function testBookingWithUserId() {
  try {
    console.log('\n🧪 Testing booking creation with user ID...');
    
    // Test user ID
    const testUserId = '6894ec696cbf2dda14db1b96';
    
    // Test booking data
    const testBookingData = {
      companyName: 'Test Company',
      companyEmail: 'test@example.com',
      clientName: 'John Doe',
      position: 'Manager',
      memberCount: '2',
      meetingPlatform: 'zoom',
      preferredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      preferredTime: '10:00 AM',
      timezone: 'UTC+00:00 (Greenwich Mean Time)',
      additionalNotes: 'Test booking with user ID',
      userId: testUserId,
      status: 'pending',
      source: 'test_script'
    };
    
    // Create booking via API
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBookingData),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Booking created successfully with user ID');
      console.log('📋 Booking ID:', result.booking.id);
      console.log('👤 User ID:', testUserId);
      
      // Test retrieving bookings for this user
      console.log('\n🔍 Testing booking retrieval for user...');
      const getResponse = await fetch(`http://localhost:3000/api/bookings?userId=${testUserId}`);
      const getResult = await getResponse.json();
      
      if (getResult.success) {
        console.log('✅ Successfully retrieved bookings for user');
        console.log('📊 Total bookings for user:', getResult.data.bookings.length);
        
        // Check if the created booking is in the results
        const createdBooking = getResult.data.bookings.find(b => b._id === result.booking.id);
        if (createdBooking) {
          console.log('✅ Created booking found in user\'s booking list');
          console.log('🔗 User ID in booking:', createdBooking.userId);
        } else {
          console.log('❌ Created booking not found in user\'s booking list');
        }
      } else {
        console.log('❌ Failed to retrieve bookings for user:', getResult.error);
      }
      
    } else {
      console.log('❌ Failed to create booking:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Test client booking page with user ID
async function testClientBookingPage() {
  try {
    console.log('\n🌐 Testing client booking page with user ID...');
    
    const testUserId = '6894ec696cbf2dda14db1b96';
    const clientBookingUrl = `http://localhost:3000/clientbooking/${testUserId}`;
    
    console.log('🔗 Client booking URL:', clientBookingUrl);
    console.log('📝 This URL should be sent to clients for booking');
    console.log('👤 When client fills the form, booking will be associated with user ID:', testUserId);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting booking user ID tests...\n');
  
  await connectDB();
  await testBookingWithUserId();
  await testClientBookingPage();
  
  console.log('\n✅ All tests completed!');
  process.exit(0);
}

// Run tests
runTests().catch(console.error);

