// Quick test for production API endpoints
const https = require('https');

async function testProductionAPI() {
    console.log('🧪 Testing Production API...\n');

    // Test 1: Check if generate-long endpoint exists
    console.log('1. Testing /api/tts/generate-long endpoint...');
    try {
        const result = await makeRequest('https://text-to-speech.space/api/tts/generate-long', {
            text: 'Short test to check if endpoint exists',
            language: 'en-US',
            voice: 'en-US-AriaNeural',
            voiceName: 'Aria',
            gender: 'female'
        });

        if (result.statusCode === 404) {
            console.log('❌ Endpoint not found (404)');
            console.log('   → Issue: Backend not deployed or PM2 not restarted');
        } else if (result.statusCode === 500) {
            console.log('⚠️  Endpoint exists but has internal error');
            console.log('   → Issue: Dependencies missing (ffmpeg-static, fluent-ffmpeg)');
        } else if (result.statusCode === 200) {
            console.log('✅ Endpoint working correctly');
        } else {
            console.log(`⚠️  Unexpected status: ${result.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Network error: ${error.message}`);
    }

    // Test 2: Check regular endpoint
    console.log('\n2. Testing /api/tts/generate endpoint...');
    try {
        const result = await makeRequest('https://text-to-speech.space/api/tts/generate', {
            text: 'Short test',
            language: 'en-US',
            voice: 'en-US-AriaNeural',
            voiceName: 'Aria',
            gender: 'female'
        });

        if (result.statusCode === 200) {
            console.log('✅ Regular endpoint working');
        } else {
            console.log(`❌ Regular endpoint issue: ${result.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Regular endpoint error: ${error.message}`);
    }

    console.log('\n📊 Diagnosis:');
    console.log('- If both endpoints fail → Server down');
    console.log('- If only generate-long fails → New code not deployed');
    console.log('- If generate-long returns 500 → Dependencies missing');
    console.log('- If both work → Frontend caching issue');
}

function makeRequest(url, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: responseData
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Run test
testProductionAPI().catch(console.error);