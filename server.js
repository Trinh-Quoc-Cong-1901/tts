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

        // Extract base language code for gTTS
        const langCode = extractLanguageCode(language);

        console.log(`Generating TTS: ${langCode}, Voice: ${voiceName}, Text length: ${text.length}`);

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
                    }
                });

            } catch (readError) {
                console.error('Error reading audio file:', readError);
                res.status(500).json({
                    success: false,
                    message: 'Error processing audio file'
                });
            }
        });

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
    const languages = [
        { code: 'en-US', name: 'English (United States)', flag: '🇺🇸' },
        { code: 'en-GB', name: 'English (United Kingdom)', flag: '🇬🇧' },
        { code: 'en-AU', name: 'English (Australia)', flag: '🇦🇺' },
        { code: 'vi-VN', name: 'Tiếng Việt (Vietnam)', flag: '🇻🇳' },
        { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' },
        { code: 'es-MX', name: 'Español (México)', flag: '🇲🇽' },
        { code: 'fr-FR', name: 'Français (France)', flag: '🇫🇷' },
        { code: 'de-DE', name: 'Deutsch (Deutschland)', flag: '🇩🇪' },
        { code: 'it-IT', name: 'Italiano (Italia)', flag: '🇮🇹' },
        { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
        { code: 'ru-RU', name: 'Русский (Россия)', flag: '🇷🇺' },
        { code: 'ja-JP', name: '日本語 (日本)', flag: '🇯🇵' },
        { code: 'ko-KR', name: '한국어 (대한민국)', flag: '🇰🇷' },
        { code: 'zh-CN', name: '中文 (中国)', flag: '🇨🇳' },
        { code: 'ar-SA', name: 'العربية (السعودية)', flag: '🇸🇦' },
        { code: 'hi-IN', name: 'हिन्दी (भारत)', flag: '🇮🇳' }
    ];

    res.json({
        success: true,
        languages
    });
});

// Helper function to get voices for a language
function getVoicesForLanguage(language) {
    const voiceDatabase = {
        'en-US': [
            { id: 'en-US-1', name: 'Abigail', gender: 'female', country: 'US', accent: 'General American' },
            { id: 'en-US-2', name: 'Ana', gender: 'female', country: 'US', accent: 'General American' },
            { id: 'en-US-3', name: 'Andrew', gender: 'male', country: 'US', accent: 'General American' },
            { id: 'en-US-4', name: 'Aria', gender: 'female', country: 'US', accent: 'General American' },
            { id: 'en-US-5', name: 'Davis', gender: 'male', country: 'US', accent: 'General American' },
            { id: 'en-US-6', name: 'Emma', gender: 'female', country: 'US', accent: 'General American' },
            { id: 'en-US-7', name: 'Jenny', gender: 'female', country: 'US', accent: 'General American' },
            { id: 'en-US-8', name: 'Guy', gender: 'male', country: 'US', accent: 'General American' }
        ],
        'en-GB': [
            { id: 'en-GB-1', name: 'Libby', gender: 'female', country: 'GB', accent: 'British' },
            { id: 'en-GB-2', name: 'Ryan', gender: 'male', country: 'GB', accent: 'British' },
            { id: 'en-GB-3', name: 'Sonia', gender: 'female', country: 'GB', accent: 'British' }
        ],
        'vi-VN': [
            { id: 'vi-VN-1', name: 'Hoài My', gender: 'female', country: 'VN', accent: 'Northern' },
            { id: 'vi-VN-2', name: 'Nam Minh', gender: 'male', country: 'VN', accent: 'Northern' },
            { id: 'vi-VN-3', name: 'Thu Minh', gender: 'female', country: 'VN', accent: 'Southern' }
        ],
        'es-ES': [
            { id: 'es-ES-1', name: 'Elvira', gender: 'female', country: 'ES', accent: 'Castilian' },
            { id: 'es-ES-2', name: 'Saul', gender: 'male', country: 'ES', accent: 'Castilian' }
        ],
        'fr-FR': [
            { id: 'fr-FR-1', name: 'Denise', gender: 'female', country: 'FR', accent: 'Parisian' },
            { id: 'fr-FR-2', name: 'Henri', gender: 'male', country: 'FR', accent: 'Parisian' }
        ],
        'de-DE': [
            { id: 'de-DE-1', name: 'Amala', gender: 'female', country: 'DE', accent: 'Standard German' },
            { id: 'de-DE-2', name: 'Conrad', gender: 'male', country: 'DE', accent: 'Standard German' }
        ],
        'it-IT': [
            { id: 'it-IT-1', name: 'Elsa', gender: 'female', country: 'IT', accent: 'Standard Italian' },
            { id: 'it-IT-2', name: 'Diego', gender: 'male', country: 'IT', accent: 'Standard Italian' }
        ],
        'pt-BR': [
            { id: 'pt-BR-1', name: 'Francisca', gender: 'female', country: 'BR', accent: 'Brazilian' },
            { id: 'pt-BR-2', name: 'Antonio', gender: 'male', country: 'BR', accent: 'Brazilian' }
        ],
        'ru-RU': [
            { id: 'ru-RU-1', name: 'Svetlana', gender: 'female', country: 'RU', accent: 'Moscow' },
            { id: 'ru-RU-2', name: 'Dmitry', gender: 'male', country: 'RU', accent: 'Moscow' }
        ],
        'ja-JP': [
            { id: 'ja-JP-1', name: 'Ayumi', gender: 'female', country: 'JP', accent: 'Tokyo' },
            { id: 'ja-JP-2', name: 'Kei', gender: 'male', country: 'JP', accent: 'Tokyo' }
        ],
        'ko-KR': [
            { id: 'ko-KR-1', name: 'Sun-Hi', gender: 'female', country: 'KR', accent: 'Seoul' },
            { id: 'ko-KR-2', name: 'InJoon', gender: 'male', country: 'KR', accent: 'Seoul' }
        ],
        'zh-CN': [
            { id: 'zh-CN-1', name: 'Xiaoxiao', gender: 'female', country: 'CN', accent: 'Mandarin' },
            { id: 'zh-CN-2', name: 'Yunxi', gender: 'male', country: 'CN', accent: 'Mandarin' }
        ],
        'ar-SA': [
            { id: 'ar-SA-1', name: 'Zariyah', gender: 'female', country: 'SA', accent: 'Saudi' },
            { id: 'ar-SA-2', name: 'Hamed', gender: 'male', country: 'SA', accent: 'Saudi' }
        ],
        'hi-IN': [
            { id: 'hi-IN-1', name: 'Swara', gender: 'female', country: 'IN', accent: 'Hindi' },
            { id: 'hi-IN-2', name: 'Madhur', gender: 'male', country: 'IN', accent: 'Hindi' }
        ]
    };

    return voiceDatabase[language] || [];
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Text-to-Speech server running on http://localhost:${PORT}`);
    console.log(`📝 Frontend available at http://localhost:${PORT}`);
});