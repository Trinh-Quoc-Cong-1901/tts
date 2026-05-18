const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const gtts = require('node-gtts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Google TTS endpoint (using node-gtts for MP3 generation)
app.post('/api/google-tts', async (req, res) => {
    try {
        const { text, voice = 'vi', rate = 1.0 } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (text.length > 5000) {
            return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
        }

        const timestamp = Date.now();
        const outputPath = path.join(__dirname, 'temp', `audio_${timestamp}.mp3`);

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Determine language code
        let langCode = 'vi'; // Default Vietnamese
        if (voice.includes('en-US') || voice.includes('english')) {
            langCode = 'en';
        }

        // Create gTTS instance with speed adjustment (note: gTTS doesn't support speed natively)
        const gTTSInstance = gtts(langCode);

        // Generate speech
        gTTSInstance.save(outputPath, text, function() {
            if (!fs.existsSync(outputPath)) {
                return res.status(500).json({ error: 'Audio file not generated' });
            }

            // Read the file and send as base64
            const audioBuffer = fs.readFileSync(outputPath);
            const audioBase64 = audioBuffer.toString('base64');

            // Clean up temp file after a delay (to allow download)
            setTimeout(() => {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            }, 30000); // 30 seconds

            res.json({
                success: true,
                audio: audioBase64,
                contentType: 'audio/mpeg',
                filename: `tts_audio_${timestamp}.mp3`
            });
        });

    } catch (error) {
        console.error('Google TTS Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get available Edge voices
app.get('/api/edge-voices', (req, res) => {
    exec('npx edge-tts --list-voices', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to get voices' });
        }

        try {
            const voices = stdout
                .split('\n')
                .filter(line => line.includes('vi-VN') || line.includes('en-US'))
                .slice(0, 10); // Limit to first 10 voices

            res.json({ voices });
        } catch (e) {
            res.json({
                voices: [
                    'vi-VN-HoaiMyNeural',
                    'vi-VN-NamMinhNeural',
                    'en-US-AriaNeural',
                    'en-US-GuyNeural'
                ]
            });
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Text-to-Speech server running on http://localhost:${PORT}`);
    console.log(`📝 Frontend available at http://localhost:${PORT}`);
});