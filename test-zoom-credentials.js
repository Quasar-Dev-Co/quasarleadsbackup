import { zoomService } from './lib/zoomService';

async function testZoomIntegration() {
    try {
        console.log('🔍 Testing Zoom integration...');
        
        // Test creating a meeting
        const meeting = await zoomService.createMeeting(
            'Test Meeting - QuasarLeads',
            new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            60,
            'UTC'
        );
        
        console.log('\n✅ Meeting created successfully!');
        console.log('Meeting details:');
        console.log('----------------');
        console.log(`Meeting ID: ${meeting.id}`);
        console.log(`Join URL: ${meeting.join_url}`);
        console.log(`Password: ${meeting.password}`);
        console.log(`Start Time: ${meeting.start_time}`);
        
    } catch (error) {
        console.error('\n❌ Error testing Zoom integration:', error.message);
        if (error.message.includes('authenticate')) {
            console.log('\n⚠️ Possible missing or invalid credentials!');
            console.log('Please check your .env file has these variables:');
            console.log('ZOOM_ACCOUNT_ID=your_account_id');
            console.log('ZOOM_CLIENT_ID=your_client_id');
            console.log('ZOOM_CLIENT_SECRET=your_client_secret');
            
            // Check current environment variables
            console.log('\nCurrent environment variables:');
            console.log('ZOOM_ACCOUNT_ID:', process.env.ZOOM_ACCOUNT_ID || 'not set');
            console.log('ZOOM_CLIENT_ID:', process.env.ZOOM_CLIENT_ID || 'not set');
            console.log('ZOOM_CLIENT_SECRET:', process.env.ZOOM_CLIENT_SECRET ? 'set but hidden' : 'not set');
        }
    }
}

testZoomIntegration(); 