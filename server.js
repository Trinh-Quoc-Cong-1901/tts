const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const gtts = require('node-gtts');
const AzureTTS = require('./azure-tts-integration');
const TextChunker = require('./text-chunker');
const AudioMerger = require('./audio-merger');

// Load environment variables
require('dotenv').config();

// Load processed Azure voices data
const voicesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'processed-voices.json'), 'utf8'));

// Load SEO content for all languages
const seoContent = {};
const supportedLanguages = ['en', 'vi', 'ko', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'hi', 'ru', 'pt'];

// Load all language files
supportedLanguages.forEach(lang => {
    try {
        const filePath = path.join(__dirname, 'text-to-speech', `${lang}.json`);
        if (fs.existsSync(filePath)) {
            seoContent[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`📝 Loaded SEO content for: ${lang}`);
        }
    } catch (error) {
        console.warn(`⚠️  Failed to load ${lang}.json:`, error.message);
    }
});

// Fallback to English if language not found
function getSEOContent(language) {
    return seoContent[language] || seoContent['en'] || {
        seo: {
            title: "Free Text to Speech Online - AI Voice Generator",
            description: "Convert text to speech online free with AI voices."
        },
        content: { form: { h1: "Text to Speech", placeholder: "Enter text...", button: "Generate" }, sections: [] }
    };
}

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

// Simple rate limiting to prevent abuse
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, { requests: [], lastCleanup: now });
    }

    const clientData = rateLimitMap.get(clientIP);

    // Clean old requests (older than 1 minute)
    clientData.requests = clientData.requests.filter(time => now - time < 60000);

    // Allow max 20 requests per minute for regular, 5 for long text
    const isLongEndpoint = req.path.includes('generate-long');
    const maxRequests = isLongEndpoint ? 5 : 20;

    if (clientData.requests.length >= maxRequests) {
        return res.status(429).json({
            success: false,
            message: `Rate limit exceeded. Max ${maxRequests} requests per minute for ${isLongEndpoint ? 'long text' : 'regular'} processing.`
        });
    }

    clientData.requests.push(now);
    next();
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/tts', rateLimit); // Apply rate limiting to TTS endpoints only
// Serve static files but exclude index.html to allow custom rendering
app.use(express.static('.', { index: false }));

// Function to generate SEO HTML content
function generateSEOHTML(sections) {
    if (!sections || sections.length === 0) return '';

    return sections.map(section => {
        let html = `<section class="seo-section">`;

        if (section.h2) {
            html += `<h2>${section.h2}</h2>`;
        }

        if (section.p) {
            section.p.forEach(paragraph => {
                html += `<p>${paragraph}</p>`;
            });
        }

        if (section.ul) {
            html += '<ul>';
            section.ul.forEach(item => {
                html += '<li>';
                if (item.h3) html += `<h3>${item.h3}</h3>`;
                if (item.p) item.p.forEach(p => html += `<p>${p}</p>`);
                html += '</li>';
            });
            html += '</ul>';
        }

        if (section.ol) {
            html += '<ol>';
            section.ol.forEach(item => {
                html += '<li>';
                if (item.h3) html += `<h3>${item.h3}</h3>`;
                if (item.p) item.p.forEach(p => html += `<p>${p}</p>`);
                html += '</li>';
            });
            html += '</ol>';
        }

        html += '</section>';
        return html;
    }).join('');
}

// Function to render HTML with SEO content
function renderHTMLWithSEO(language = 'en') {
    const content = getSEOContent(language);
    const baseHTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    // Generate SEO content HTML
    const seoHTML = `
    <div id="seo-content" class="seo-content">
        ${generateSEOHTML(content.content.sections)}
    </div>`;

    // Replace title and meta tags
    let finalHTML = baseHTML
        .replace(/<title>.*?<\/title>/, `<title>${content.seo.title}</title>`)
        .replace(/name="description" content=".*?"/, `name="description" content="${content.seo.description}"`)
        .replace(/property="og:title" content=".*?"/, `property="og:title" content="${content.seo.ogTitle || content.seo.title}"`)
        .replace(/property="og:description" content=".*?"/, `property="og:description" content="${content.seo.ogDescription || content.seo.description}"`);

    // Add canonical URL
    const canonicalUrl = language === 'en' ? 'https://text-to-speech.space/' : `https://text-to-speech.space/${language}/`;
    const canonicalLink = `<link rel="canonical" href="${canonicalUrl}">`;

    // Add hreflang links
    const hreflangLinks = supportedLanguages.map(lang => {
        const url = lang === 'en' ? 'https://text-to-speech.space/' : `https://text-to-speech.space/${lang}/`;
        return `<link rel="alternate" hreflang="${lang}" href="${url}">`;
    }).join('\n    ');

    // Add x-default hreflang
    const defaultHreflang = `<link rel="alternate" hreflang="x-default" href="https://text-to-speech.space/">`;

    finalHTML = finalHTML.replace('</head>', `    ${canonicalLink}\n    ${hreflangLinks}\n    ${defaultHreflang}\n</head>`);

    // Update form elements with translated text
    if (content.content.form.h1) {
        finalHTML = finalHTML.replace(/<h1>Free text to speech<\/h1>/, `<h1>${content.content.form.h1}</h1>`);
    }

    if (content.content.form.placeholder) {
        finalHTML = finalHTML.replace(/placeholder="Enter your text here..."/, `placeholder="${content.content.form.placeholder}"`);
    }

    // Set correct language option as selected
    if (language !== 'en') {
        finalHTML = finalHTML.replace(
            `<option value="${language}">`,
            `<option value="${language}" selected>`
        );
    }

    // Insert SEO content before closing </main> tag
    finalHTML = finalHTML.replace('</main>', `${seoHTML}\n</main>`);

    return finalHTML;
}

// Multi-language routes
app.get('/', (req, res) => {
    const html = renderHTMLWithSEO('en');
    res.send(html);
});

app.get('/:lang/', (req, res) => {
    const lang = req.params.lang;

    // Check if language is supported
    if (!supportedLanguages.includes(lang)) {
        return res.redirect('/');
    }

    const html = renderHTMLWithSEO(lang);
    res.send(html);
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
                message: `Text too long for regular processing (${text.length} characters). Please use the long text processing feature for texts over 5000 characters.`
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

// Initialize text chunker and audio merger
const textChunker = new TextChunker(4500); // 4500 chars per chunk
const audioMerger = new AudioMerger();

// Cleanup old temp files on startup
function cleanupOldTempFiles() {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) return;

    const files = fs.readdirSync(tempDir);
    const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago

    let cleaned = 0;
    files.forEach(file => {
        const filePath = path.join(tempDir, file);
        try {
            const stats = fs.statSync(filePath);
            if (stats.mtime.getTime() < cutoffTime) {
                fs.unlinkSync(filePath);
                cleaned++;
            }
        } catch (error) {
            // File already deleted or inaccessible, ignore
        }
    });

    if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} old temp files`);
    }
}

// Run cleanup on startup
cleanupOldTempFiles();

// Schedule periodic cleanup every 30 minutes
setInterval(cleanupOldTempFiles, 30 * 60 * 1000);

// Enhanced TTS endpoint for long text processing
app.post('/api/tts/generate-long', async (req, res) => {
    try {
        const {
            text,
            language = 'en-US',
            voice,
            voiceName,
            gender,
            speed = 0,
            pitch = 0
        } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        // For short text, redirect to regular endpoint
        if (text.length <= 5000) {
            console.log('Text is short, using regular TTS endpoint');
            return handleRegularTTS(req, res);
        }

        console.log(`Starting long text TTS: ${text.length} characters`);

        // Analyze text and create chunks
        const analysis = textChunker.analyzeText(text);
        console.log('Text analysis:', analysis);

        const chunks = textChunker.chunkText(text);
        console.log(`Created ${chunks.length} chunks for processing`);

        // Simple validation for chunks
        if (!chunks || chunks.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Text chunking failed: No chunks generated'
            });
        }

        // Set response headers for streaming (if needed)
        res.setHeader('Content-Type', 'application/json');

        // Process each chunk to generate audio
        const audioChunks = [];
        const totalChunks = chunks.length;

        console.log(`Generating audio for ${totalChunks} chunks...`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Processing chunk ${i + 1}/${totalChunks} (${chunk.length} chars, method: ${chunk.splitMethod})`);

            try {
                // Generate audio for this chunk using existing TTS logic
                const audioBuffer = await generateAudioForChunk(
                    chunk.text,
                    language,
                    voice,
                    voiceName,
                    gender,
                    speed,
                    pitch
                );

                audioChunks.push({
                    buffer: audioBuffer,
                    index: chunk.index,
                    chunkInfo: {
                        length: chunk.length,
                        splitMethod: chunk.splitMethod
                    }
                });

                console.log(`  Chunk ${i + 1} completed: ${audioBuffer.length} bytes`);

            } catch (error) {
                console.error(`Error generating audio for chunk ${i + 1}:`, error);
                return res.status(500).json({
                    success: false,
                    message: `Audio generation failed at chunk ${i + 1}: ${error.message}`
                });
            }
        }

        // Validate audio chunks before merging
        const audioValidation = audioMerger.validateAudioChunks(audioChunks);
        if (!audioValidation.isValid) {
            return res.status(500).json({
                success: false,
                message: 'Audio validation failed: ' + audioValidation.issues.join(', ')
            });
        }

        console.log(`Merging ${audioChunks.length} audio chunks...`);
        console.log('Audio statistics:', audioValidation.statistics);

        // Merge all audio chunks
        const mergedAudioBuffer = await audioMerger.mergeAudioBuffers(audioChunks, {
            audioCodec: 'libmp3lame',
            bitrate: '128k',
            sampleRate: 24000
        });

        console.log(`Audio merging completed: ${mergedAudioBuffer.length} bytes`);

        // Convert to base64 for response
        const audioBase64 = mergedAudioBuffer.toString('base64');

        // Generate filename
        const timestamp = Date.now();
        const filename = `tts_long_${voiceName}_${timestamp}.mp3`;

        // Send response
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
                pitch
            },
            processing: {
                originalLength: text.length,
                chunksUsed: chunks.length,
                chunkingMethods: chunks.map(c => c.splitMethod),
                audioStatistics: audioValidation.statistics,
                finalAudioSize: mergedAudioBuffer.length
            },
            engine: azureTTS ? 'Azure TTS' : 'Google TTS (Fallback)'
        });

    } catch (error) {
        console.error('Long TTS Generation Error:', error);
        res.status(500).json({
            success: false,
            message: `Long text processing failed: ${error.message}`
        });
    }
});

// Helper function to generate audio for a single chunk
async function generateAudioForChunk(text, language, voice, voiceName, gender, speed, pitch) {
    const timestamp = Date.now();
    const outputPath = path.join(__dirname, 'temp', `chunk_audio_${timestamp}_${Math.random().toString(36).substring(7)}.mp3`);

    try {
        if (azureTTS && voice) {
            // Use Azure TTS
            console.log(`    Using Azure TTS for chunk`);
            const audioBuffer = await azureTTS.generateSpeech(text, voice, speed, pitch);
            return audioBuffer;

        } else {
            // Use Google TTS as fallback
            const langCode = extractLanguageCode(language);
            console.log(`    Using Google TTS fallback for chunk (${langCode})`);

            return new Promise((resolve, reject) => {
                const gTTSInstance = gtts(langCode);

                gTTSInstance.save(outputPath, text, function() {
                    if (!fs.existsSync(outputPath)) {
                        return reject(new Error('Audio file not generated by Google TTS'));
                    }

                    try {
                        const audioBuffer = fs.readFileSync(outputPath);

                        // Clean up temp file
                        setTimeout(() => {
                            if (fs.existsSync(outputPath)) {
                                fs.unlinkSync(outputPath);
                            }
                        }, 5000);

                        resolve(audioBuffer);

                    } catch (readError) {
                        reject(new Error('Error reading generated audio file'));
                    }
                });
            });
        }
    } catch (error) {
        // Clean up temp file on error
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        throw error;
    }
}

// Helper function to handle regular TTS (redirect to existing endpoint logic)
async function handleRegularTTS(req, res) {
    // This essentially duplicates the logic from the regular /api/tts/generate endpoint
    // We do this to avoid code duplication while maintaining the same interface
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

    if (text.length > 5000) {
        return res.status(400).json({
            success: false,
            message: `Text too long for regular processing (${text.length} characters). Long text processing is available for texts over 5000 characters.`
        });
    }

    const timestamp = Date.now();
    const outputPath = path.join(__dirname, 'temp', `audio_${timestamp}.mp3`);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log(`Generating regular TTS: ${language}, Voice: ${voiceName}, Text length: ${text.length}`);

    try {
        let audioBuffer;

        if (azureTTS && voice) {
            // Use Azure TTS
            console.log(`Using Azure TTS with voice: ${voice}`);
            audioBuffer = await azureTTS.generateSpeech(text, voice, speed, pitch);

        } else {
            // Use Google TTS as fallback
            const langCode = extractLanguageCode(language);
            console.log(`Using Google TTS fallback with language: ${langCode}`);

            audioBuffer = await new Promise((resolve, reject) => {
                const gTTSInstance = gtts(langCode);

                gTTSInstance.save(outputPath, text, function() {
                    if (!fs.existsSync(outputPath)) {
                        return reject(new Error('Audio file not generated'));
                    }

                    try {
                        const buffer = fs.readFileSync(outputPath);

                        // Clean up temp file
                        setTimeout(() => {
                            if (fs.existsSync(outputPath)) {
                                fs.unlinkSync(outputPath);
                            }
                        }, 30000);

                        resolve(buffer);

                    } catch (readError) {
                        reject(new Error('Error reading audio file'));
                    }
                });
            });
        }

        const audioBase64 = audioBuffer.toString('base64');
        const filename = isPreview
            ? `preview_${voiceName}_${timestamp}.mp3`
            : `tts_${voiceName}_${timestamp}.mp3`;

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
            engine: azureTTS ? 'Azure TTS' : 'Google TTS (Fallback)'
        });

    } catch (error) {
        console.error('Regular TTS Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'TTS generation failed'
        });
    }
}

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

// SEO Files
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Text-to-Speech server running on http://localhost:${PORT}`);
    console.log(`📝 Frontend available at http://localhost:${PORT}`);
});