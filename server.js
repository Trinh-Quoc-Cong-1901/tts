const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const gtts = require('node-gtts');
const AzureTTS = require('./azure-tts-integration');

// Load environment variables
require('dotenv').config();

// Load processed Azure voices data
const voicesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'processed-voices.json'), 'utf8'));

// Initialize Azure TTS if credentials are provided
let azureTTS = null;
if (process.env.AZURE_TTS_SUBSCRIPTION_KEY && process.env.USE_AZURE_TTS === 'true') {
    azureTTS = new AzureTTS(
        process.env.AZURE_TTS_SUBSCRIPTION_KEY,
        process.env.AZURE_TTS_REGION || 'eastus'
    );
    console.log('✅ Azure TTS initialized');
} else {
    console.log('ℹ️  Using Google TTS (node-gtts) - Add Azure credentials for real Azure voices');
}

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

// Enhanced TTS endpoint with multiple voice support
app.post('/api/tts/generate', async (req, res) => {
    try {
        const {
            text,
            language = 'en-US',
            voice,
            voiceName,
            gender,
            speed = 0,
            pitch = 0,
            isPreview = false
        } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        if (text.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Text too long (max 5000 characters)'
            });
        }

        const timestamp = Date.now();
        const outputPath = path.join(__dirname, 'temp', `audio_${timestamp}.mp3`);

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        console.log(`Generating TTS: ${language}, Voice: ${voiceName}, Text length: ${text.length}`);

        if (azureTTS && voice) {
            // Use Azure TTS with real voice
            try {
                console.log(`Using Azure TTS with voice: ${voice}`);
                const audioBuffer = await azureTTS.generateSpeech(text, voice, speed, pitch);

                // Save to temp file
                fs.writeFileSync(outputPath, audioBuffer);

                const audioBase64 = audioBuffer.toString('base64');

                // Generate filename
                const filename = isPreview
                    ? `preview_${voiceName}_${timestamp}.mp3`
                    : `tts_${voiceName}_${timestamp}.mp3`;

                // Clean up temp file after a delay
                setTimeout(() => {
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                    }
                }, 30000);

                res.json({
                    success: true,
                    audio: audioBase64,
                    contentType: 'audio/mpeg',
                    filename,
                    voiceUsed: {
                        id: voice,
                        name: voiceName,
                        language,
                        gender
                    },
                    settings: {
                        speed,
                        pitch,
                        isPreview
                    },
                    engine: 'Azure TTS'
                });

            } catch (azureError) {
                console.error('Azure TTS Error:', azureError);
                // Fall back to Google TTS
                await generateWithGoogleTTS();
            }
        } else {
            // Use Google TTS as fallback
            await generateWithGoogleTTS();
        }

        async function generateWithGoogleTTS() {
            // Extract base language code for gTTS
            const langCode = extractLanguageCode(language);
            console.log(`Using Google TTS fallback with language: ${langCode}`);

            // Create gTTS instance
            const gTTSInstance = gtts(langCode);

            // Generate speech
            gTTSInstance.save(outputPath, text, function() {
                if (!fs.existsSync(outputPath)) {
                    return res.status(500).json({
                        success: false,
                        message: 'Audio file not generated'
                    });
                }

                try {
                    // Read the file and send as base64
                    const audioBuffer = fs.readFileSync(outputPath);
                    const audioBase64 = audioBuffer.toString('base64');

                    // Generate filename
                    const filename = isPreview
                        ? `preview_${voiceName}_${timestamp}.mp3`
                        : `tts_${voiceName}_${timestamp}.mp3`;

                    // Clean up temp file after a delay
                    setTimeout(() => {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                    }, 30000);

                    res.json({
                        success: true,
                        audio: audioBase64,
                        contentType: 'audio/mpeg',
                        filename,
                        voiceUsed: {
                            id: voice,
                            name: voiceName,
                            language,
                            gender
                        },
                        settings: {
                            speed,
                            pitch,
                            isPreview
                        },
                        engine: 'Google TTS (Fallback)'
                    });

                } catch (readError) {
                    console.error('Error reading audio file:', readError);
                    res.status(500).json({
                        success: false,
                        message: 'Error processing audio file'
                    });
                }
            });
        }

    } catch (error) {
        console.error('TTS Generation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Helper function to extract language code for gTTS
function extractLanguageCode(language) {
    const langMap = {
        'en-US': 'en',
        'en-GB': 'en',
        'en-AU': 'en',
        'vi-VN': 'vi',
        'es-ES': 'es',
        'es-MX': 'es',
        'fr-FR': 'fr',
        'fr-CA': 'fr',
        'de-DE': 'de',
        'it-IT': 'it',
        'pt-BR': 'pt',
        'pt-PT': 'pt',
        'ru-RU': 'ru',
        'ja-JP': 'ja',
        'ko-KR': 'ko',
        'zh-CN': 'zh-cn',
        'zh-TW': 'zh-tw',
        'ar-SA': 'ar',
        'hi-IN': 'hi',
        'th-TH': 'th',
        'nl-NL': 'nl',
        'sv-SE': 'sv',
        'da-DK': 'da',
        'no-NO': 'no',
        'fi-FI': 'fi',
        'pl-PL': 'pl',
        'cs-CZ': 'cs',
        'sk-SK': 'sk',
        'hu-HU': 'hu',
        'ro-RO': 'ro',
        'bg-BG': 'bg',
        'hr-HR': 'hr',
        'sl-SI': 'sl',
        'et-EE': 'et',
        'lv-LV': 'lv',
        'lt-LT': 'lt',
        'mt-MT': 'mt',
        'tr-TR': 'tr',
        'he-IL': 'iw',
        'fa-IR': 'fa',
        'ur-PK': 'ur',
        'bn-BD': 'bn',
        'ta-IN': 'ta',
        'te-IN': 'te',
        'ml-IN': 'ml',
        'kn-IN': 'kn',
        'gu-IN': 'gu',
        'mr-IN': 'mr',
        'pa-IN': 'pa'
    };

    return langMap[language] || 'en';
}

// Get available voices for a language
app.get('/api/voices/:language', (req, res) => {
    const language = req.params.language;

    // Voice database matching frontend
    const voices = getVoicesForLanguage(language);

    res.json({
        success: true,
        language,
        voices
    });
});

// Get all supported languages
app.get('/api/languages', (req, res) => {
    res.json({
        success: true,
        languages: voicesData.languages
    });
});

// Helper function to get voices for a language
function getVoicesForLanguage(language) {
    return voicesData.voiceDatabase[language] || [];
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Text-to-Speech server running on http://localhost:${PORT}`);
    console.log(`📝 Frontend available at http://localhost:${PORT}`);
});