// Debug script to check production server components
console.log('🔍 Production Server Debug\n');

async function debugProduction() {
    try {
        console.log('1. Testing TextChunker...');
        const TextChunker = require('./text-chunker');
        const chunker = new TextChunker();
        const testText = 'Test text. '.repeat(1000); // ~10,000 chars
        const chunks = chunker.chunkText(testText);
        console.log(`   ✅ TextChunker: ${chunks.length} chunks created`);

    } catch (error) {
        console.log(`   ❌ TextChunker Error: ${error.message}`);
    }

    try {
        console.log('\n2. Testing FFmpeg dependencies...');
        const ffmpegStatic = require('ffmpeg-static');
        const ffmpeg = require('fluent-ffmpeg');

        console.log(`   ✅ ffmpeg-static: ${ffmpegStatic}`);

        // Test if ffmpeg binary works
        ffmpeg.setFfmpegPath(ffmpegStatic);
        console.log('   ✅ fluent-ffmpeg: OK');

    } catch (error) {
        console.log(`   ❌ FFmpeg Error: ${error.message}`);
    }

    try {
        console.log('\n3. Testing AudioMerger...');
        const AudioMerger = require('./audio-merger');
        const merger = new AudioMerger();

        // Test validation (no actual audio processing)
        const testChunks = [
            { buffer: Buffer.from('test1'), index: 0 },
            { buffer: Buffer.from('test2'), index: 1 }
        ];
        const validation = merger.validateAudioChunks(testChunks);
        console.log(`   ✅ AudioMerger validation: ${validation.isValid}`);

    } catch (error) {
        console.log(`   ❌ AudioMerger Error: ${error.message}`);
    }

    try {
        console.log('\n4. Testing temp directory...');
        const fs = require('fs');
        const path = require('path');

        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Test write permission
        const testFile = path.join(tempDir, 'test.txt');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        console.log('   ✅ Temp directory: Write permissions OK');

    } catch (error) {
        console.log(`   ❌ Temp directory Error: ${error.message}`);
    }

    try {
        console.log('\n5. Testing Azure TTS...');
        const AzureTTS = require('./azure-tts-integration');

        if (process.env.AZURE_TTS_SUBSCRIPTION_KEY) {
            console.log('   ✅ Azure credentials: Available');
        } else {
            console.log('   ⚠️  Azure credentials: Missing (will use Google TTS)');
        }

    } catch (error) {
        console.log(`   ❌ Azure TTS Error: ${error.message}`);
    }

    try {
        console.log('\n6. Testing Google TTS fallback...');
        const gtts = require('node-gtts');
        const gTTSInstance = gtts('en');
        console.log('   ✅ Google TTS: Available');

    } catch (error) {
        console.log(`   ❌ Google TTS Error: ${error.message}`);
    }

    console.log('\n7. Environment info:');
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   CPU: ${process.arch}`);
    console.log(`   Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log(`   Working Dir: ${process.cwd()}`);

    console.log('\n📊 Debug Complete!');
}

debugProduction().catch(console.error);