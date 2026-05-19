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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
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