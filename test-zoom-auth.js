require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testZoomAuth() {
    const accountId = process.env.ZOOM_ACCOUNT_ID?.trim();
    const clientId = process.env.ZOOM_CLIENT_ID?.trim();
    const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();

    console.log('Testing Zoom credentials:');
    console.log('Account ID:', accountId ? `${accountId.substring(0, 5)}...` : 'not found');
    console.log('Account ID length:', accountId?.length);
    console.log('Client ID:', clientId ? `${clientId.substring(0, 5)}...` : 'not found');
    console.log('Client ID length:', clientId?.length);
    console.log('Client Secret:', clientSecret ? `${clientSecret.substring(0, 5)}...` : 'not found');
    console.log('Client Secret length:', clientSecret?.length);

    // Create the authorization string
    const credentials = `${clientId}:${clientSecret}`;
    const authString = Buffer.from(credentials).toString('base64');
    
    console.log('\nRequest preparation:');
    console.log('Raw credentials length:', credentials.length);
    console.log('Base64 auth string length:', authString.length);
    
    // Create form data
    const params = new URLSearchParams();
    params.append('grant_type', 'account_credentials');
    params.append('account_id', accountId);

    console.log('\nRequest details:');
    console.log('URL:', 'https://zoom.us/oauth/token');
    console.log('Form data:', params.toString());

    try {
        // First try with axios defaults
        const response = await axios({
            method: 'POST',
            url: 'https://zoom.us/oauth/token',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            data: params
        });

        console.log('\nSuccess! Access token received');
        console.log('Token type:', response.data.token_type);
        console.log('Expires in:', response.data.expires_in, 'seconds');
    } catch (error) {
        console.error('\nError testing Zoom authentication:');
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            
            // Let's try a second attempt with fetch
            console.log('\nTrying alternative approach with fetch...');
            try {
                const fetchResponse = await fetch('https://zoom.us/oauth/token', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authString}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params.toString()
                });
                
                const data = await fetchResponse.json();
                if (fetchResponse.ok) {
                    console.log('Success with fetch!');
                    console.log(data);
                } else {
                    console.error('Fetch also failed:');
                    console.error('Status:', fetchResponse.status);
                    console.error('Data:', data);
                }
            } catch (fetchError) {
                console.error('Fetch attempt failed:', fetchError);
            }
        } else if (error.request) {
            console.error('No response received');
            console.error('Request:', error.request);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testZoomAuth(); 