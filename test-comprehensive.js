// Comprehensive Testing Suite for Text-to-Speech System
const fetch = require('node-fetch');

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_VOICE = {
    id: 'vi-VN-HoaiMyNeural',
    name: 'HoaiMy',
    language: 'vi-VN',
    gender: 'female'
};

// Test cases
const testCases = [
    {
        name: 'Short text (100 chars)',
        text: 'Đây là test ngắn để kiểm tra TTS cơ bản. Nó có khoảng 100 ký tự để test endpoint thường.',
        expectedEndpoint: 'regular',
        expectedChunks: 1
    },
    {
        name: 'Medium text (3000 chars)',
        text: 'Đây là đoạn văn dài hơn để kiểm tra hệ thống. '.repeat(60) + 'Kết thúc test medium.',
        expectedEndpoint: 'regular',
        expectedChunks: 1
    },
    {
        name: 'Long text (7000+ chars)',
        text: 'Đây là câu đầu tiên trong văn bản dài để test chunking system. '.repeat(120) + 'Kết thúc test long.',
        expectedEndpoint: 'long',
        expectedChunks: 2
    },
    {
        name: 'Very long text (15000+ chars)',
        text: 'Đây là test rất dài với nhiều câu để kiểm tra khả năng xử lý của hệ thống. '.repeat(200) + 'Cuối cùng.',
        expectedEndpoint: 'long',
        expectedChunks: 3
    }
];

// Special character and format tests
const specialTests = [
    {
        name: 'Mixed punctuation',
        text: 'Test với dấu câu: dấu chấm. Dấu chấm than! Dấu hỏi? Dấu hai chấm: và dấu chấm phẩy; đây là test. '.repeat(50),
        expectedChunks: 2
    },
    {
        name: 'Multiple paragraphs',
        text: 'Đoạn một với nội dung dài.\n\nĐoạn hai là đoạn mới.\n\nĐoạn ba tiếp tục nội dung. '.repeat(50),
        expectedChunks: 2
    },
    {
        name: 'Mixed languages',
        text: 'Vietnamese text với English mixed in. Đây là test đa ngôn ngữ. English sentence here. Tiếng Việt tiếp theo. '.repeat(50),
        expectedChunks: 2
    }
];

// Error test cases
const errorTests = [
    {
        name: 'Empty text',
        text: '',
        shouldFail: true
    },
    {
        name: 'Only spaces',
        text: '   ',
        shouldFail: true
    }
];

// Test runner
async function runTest(testCase, endpoint = 'auto') {
    const useEndpoint = endpoint === 'auto'
        ? (testCase.text.length > 5000 ? 'generate-long' : 'generate')
        : endpoint;

    console.log(`\n🔬 Testing: ${testCase.name}`);
    console.log(`   Length: ${testCase.text.length.toLocaleString()} chars`);
    console.log(`   Endpoint: /api/tts/${useEndpoint}`);

    const startTime = Date.now();

    try {
        const response = await fetch(`${SERVER_URL}/api/tts/${useEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: testCase.text,
                language: TEST_VOICE.language,
                voice: TEST_VOICE.id,
                voiceName: TEST_VOICE.name,
                gender: TEST_VOICE.gender
            })
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (testCase.shouldFail) {
            if (!response.ok) {
                console.log(`   ✅ Correctly failed (${response.status})`);
                return { success: true, duration, status: response.status };
            } else {
                console.log(`   ❌ Should have failed but didn't`);
                return { success: false, duration, error: 'Expected failure' };
            }
        }

        if (!response.ok) {
            const error = await response.json();
            console.log(`   ❌ Failed: ${error.message}`);
            return { success: false, duration, error: error.message };
        }

        const result = await response.json();

        // Analyze results
        const audioSizeMB = result.audio ? (result.audio.length * 0.75 / (1024 * 1024)).toFixed(1) : 0; // Base64 to bytes

        console.log(`   ✅ Success in ${duration}ms`);
        console.log(`   📁 Audio size: ~${audioSizeMB}MB`);

        if (result.processing) {
            console.log(`   📊 Chunks: ${result.processing.chunksUsed} (expected: ${testCase.expectedChunks || 'N/A'})`);
            console.log(`   🔧 Methods: ${result.processing.chunkingMethods.join(', ')}`);
            console.log(`   💾 Final size: ${(result.processing.finalAudioSize / (1024 * 1024)).toFixed(1)}MB`);
        }

        return {
            success: true,
            duration,
            audioSize: audioSizeMB,
            processing: result.processing,
            engine: result.engine
        };

    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`   ❌ Network error: ${error.message}`);
        return { success: false, duration, error: error.message };
    }
}

// Performance analysis
function analyzeResults(results) {
    console.log('\n📈 PERFORMANCE ANALYSIS:');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        const maxDuration = Math.max(...successful.map(r => r.duration));
        const minDuration = Math.min(...successful.map(r => r.duration));

        console.log(`⏱️  Average duration: ${Math.round(avgDuration)}ms`);
        console.log(`⏱️  Min duration: ${minDuration}ms`);
        console.log(`⏱️  Max duration: ${maxDuration}ms`);
    }

    if (failed.length > 0) {
        console.log(`\n❌ Failed tests:`);
        failed.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.error}`);
        });
    }
}

// Main test execution
async function runAllTests() {
    console.log('🚀 Starting Comprehensive TTS Testing...\n');

    const results = [];

    // Test different lengths
    console.log('📏 TESTING DIFFERENT TEXT LENGTHS:');
    for (const testCase of testCases) {
        const result = await runTest(testCase);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between tests
    }

    // Test special cases
    console.log('\n🎭 TESTING SPECIAL CASES:');
    for (const testCase of specialTests) {
        const result = await runTest(testCase);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test error cases
    console.log('\n💥 TESTING ERROR CASES:');
    for (const testCase of errorTests) {
        const result = await runTest(testCase);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Analyze and report
    analyzeResults(results);

    console.log('\n✨ Testing completed!');
}

// Run tests if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runTest, runAllTests };