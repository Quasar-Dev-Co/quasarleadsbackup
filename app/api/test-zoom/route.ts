import { NextRequest, NextResponse } from 'next/server';
import { zoomService } from '@/lib/zoomService';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Testing Zoom integration via API...');
        
        // Test creating a meeting
        const meeting = await zoomService.createMeeting(
            'Test Meeting - QuasarLeads',
            new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            60,
            'UTC'
        );
        
        return NextResponse.json({
            success: true,
            message: 'Zoom meeting created successfully!',
            meeting: {
                id: meeting.id,
                join_url: meeting.join_url,
                password: meeting.password,
                start_time: meeting.start_time
            },
            environment: {
                accountId: process.env.ZOOM_ACCOUNT_ID ? 'set' : 'not set',
                clientId: process.env.ZOOM_CLIENT_ID ? 'set' : 'not set',
                clientSecret: process.env.ZOOM_CLIENT_SECRET ? 'set' : 'not set'
            }
        });
        
    } catch (error: any) {
        console.error('❌ Error testing Zoom integration:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            environment: {
                accountId: process.env.ZOOM_ACCOUNT_ID ? 'set' : 'not set',
                clientId: process.env.ZOOM_CLIENT_ID ? 'set' : 'not set',
                clientSecret: process.env.ZOOM_CLIENT_SECRET ? 'set' : 'not set'
            }
        }, { status: 500 });
    }
} 