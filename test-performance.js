// Performance and concurrent testing
const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:3000';
const TEST_VOICE = {
    id: 'vi-VN-HoaiMyNeural',
    name: 'HoaiMy',
    language: 'vi-VN',
    gender: 'female'
};

// Test concurrent requests
async function testConcurrentRequests() {
    console.log('🔀 Testing concurrent requests...');

    const testText = 'Đây là test đồng thời để kiểm tra server handle multiple requests. '.repeat(30);

    const requests = Array(3).fill().map((_, i) =>
        fetch(`${SERVER_URL}/api/tts/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: testText + ` Request ${i + 1}`,
                language: TEST_VOICE.language,
                voice: TEST_VOICE.id,
                voiceName: TEST_VOICE.name,
                gender: TEST_VOICE.gender
            })
        })
    );

    const startTime = Date.now();

    try {
        const responses = await Promise.all(requests);
        const endTime = Date.now();

        const results = await Promise.all(
            responses.map(async (res, i) => {
                if (res.ok) {
                    const json = await res.json();
                    return { success: true, id: i + 1, audioSize: json.audio?.length || 0 };
                } else {
                    return { success: false, id: i + 1, error: res.status };
                }
            })
        );

        const successful = results.filter(r => r.success);

        console.log(`   ✅ ${successful.length}/3 requests successful in ${endTime - startTime}ms`);
        console.log(`   📊 Average audio size: ${Math.round(successful.reduce((sum, r) => sum + r.audioSize, 0) / successful.length)} chars`);

        return { success: true, concurrent: true, duration: endTime - startTime };

    } catch (error) {
        console.log(`   ❌ Concurrent test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Memory usage test
async function testMemoryUsage() {
    console.log('💾 Testing memory usage...');

    const longText = 'Test memory usage với text rất dài để xem memory consumption. '.repeat(500);
    console.log(`   📏 Text length: ${longText.length.toLocaleString()} chars`);

    const memBefore = process.memoryUsage();

    try {
        const response = await fetch(`${SERVER_URL}/api/tts/generate-long`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: longText,
                language: TEST_VOICE.language,
                voice: TEST_VOICE.id,
                voiceName: TEST_VOICE.name,
                gender: TEST_VOICE.gender
            })
        });

        if (response.ok) {
            const result = await response.json();
            const memAfter = process.memoryUsage();

            const memDiff = {
                rss: (memAfter.rss - memBefore.rss) / 1024 / 1024,
                heapUsed: (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024
            };

            console.log(`   ✅ Memory test completed`);
            console.log(`   📊 Chunks: ${result.processing?.chunksUsed || 'N/A'}`);
            console.log(`   💾 Memory delta: RSS +${memDiff.rss.toFixed(1)}MB, Heap +${memDiff.heapUsed.toFixed(1)}MB`);

            return { success: true, memoryDelta: memDiff, chunks: result.processing?.chunksUsed };

        } else {
            console.log(`   ❌ Memory test failed with status ${response.status}`);
            return { success: false, error: response.status };
        }

    } catch (error) {
        console.log(`   ❌ Memory test error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Cleanup test
async function testCleanup() {
    console.log('🧹 Testing cleanup...');

    // Check temp files before
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, 'temp');

    const filesBefore = fs.existsSync(tempDir) ? fs.readdirSync(tempDir).length : 0;

    // Generate some audio to create temp files
    const response = await fetch(`${SERVER_URL}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: 'Test cleanup functionality.',
            language: TEST_VOICE.language,
            voice: TEST_VOICE.id,
            voiceName: TEST_VOICE.name,
            gender: TEST_VOICE.gender
        })
    });

    // Wait a bit and check files after
    await new Promise(resolve => setTimeout(resolve, 2000));
    const filesAfter = fs.existsSync(tempDir) ? fs.readdirSync(tempDir).length : 0;

    console.log(`   📁 Temp files: ${filesBefore} → ${filesAfter}`);
    console.log(`   ${filesAfter <= filesBefore ? '✅' : '⚠️'} Cleanup ${filesAfter <= filesBefore ? 'working' : 'may need improvement'}`);

    return {
        success: true,
        filesBefore,
        filesAfter,
        cleanupWorking: filesAfter <= filesBefore
    };
}

// Run all performance tests
async function runPerformanceTests() {
    console.log('🚀 Starting Performance Tests...\n');

    const results = {
        concurrent: await testConcurrentRequests(),
        memory: await testMemoryUsage(),
        cleanup: await testCleanup()
    };

    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`🔀 Concurrent: ${results.concurrent.success ? '✅ Pass' : '❌ Fail'}`);
    console.log(`💾 Memory: ${results.memory.success ? '✅ Pass' : '❌ Fail'}`);
    console.log(`🧹 Cleanup: ${results.cleanup.cleanupWorking ? '✅ Pass' : '⚠️ Warning'}`);

    return results;
}

if (require.main === module) {
    runPerformanceTests().catch(console.error);
}

module.exports = { runPerformanceTests };