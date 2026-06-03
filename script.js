// Import Firebase Analytics
import {
    trackPageView,
    trackVoiceGeneration,
    trackVoicePreview,
    trackAudioDownload,
    trackLanguageSwitch,
    trackThemeToggle,
    trackFileImport,
    trackVoiceSearch,
    trackMobileMenuToggle
} from '/firebase-analytics.js';

// Global state
const state = {
    currentVoices: [],
    filteredVoices: [],
    selectedVoice: null,
    currentAudio: null,
    currentAudioUrl: null,
    isGenerating: false,
    isDarkMode: false
};

// DOM Elements
const elements = {
    // Header
    themeToggle: document.getElementById('theme-toggle'),
    uiLanguage: document.getElementById('ui-language'),

    // Mobile menu
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    mobileMenu: document.getElementById('mobile-menu'),
    mobileThemeToggle: document.getElementById('mobile-theme-toggle'),
    mobileUiLanguage: document.getElementById('mobile-ui-language'),

    // Sidebar controls - RESTORE ORIGINAL WORKING STRUCTURE
    voiceLanguage: document.getElementById('voice-language'),
    ttsEngine: document.getElementById('tts-engine'),
    genderButtons: document.querySelectorAll('.gender-btn'),
    voiceSearch: document.getElementById('voice-search'),
    voiceList: document.getElementById('voice-list'),
    speedRange: document.getElementById('speed-range'),
    speedValue: document.getElementById('speed-value'),
    pitchRange: document.getElementById('pitch-range'),
    pitchValue: document.getElementById('pitch-value'),
    autoplayCheckbox: document.getElementById('autoplay'),

    // Main content
    textInput: document.getElementById('text-input'),
    charCount: document.getElementById('char-count'),
    fileInput: document.getElementById('file-input'),
    messageArea: document.getElementById('message-area'),
    messageIcon: document.querySelector('.message-icon'),
    messageText: document.querySelector('.message-text'),
    previewBtn: document.getElementById('preview-btn'),
    generateBtn: document.getElementById('generate-btn'),
    resultsSection: document.getElementById('results-section'),
    audioPlayer: document.getElementById('audio-player'),
    downloadBtn: document.getElementById('download-btn'),

    // Voice Settings
    settingsIconBtn: document.getElementById('settings-icon-btn'),
    settingsDropdown: document.getElementById('settings-dropdown')
};

// Voice cache to avoid repeated API calls
const VOICE_CACHE = {};

// Initialize Application - RESTORE ORIGINAL SIMPLE VERSION
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setLanguageFromURL();
    loadVoicesForLanguage();

    // Track page view
    const currentPath = window.location.pathname;
    const language = currentPath.match(/^\/([a-z]{2})\//) ? currentPath.match(/^\/([a-z]{2})\//)[1] : 'en';

    // Firebase Analytics
    trackPageView(`Text to Speech ${language.toUpperCase()}`, language);

    // Google Analytics gtag
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', {
            page_title: `Text to Speech ${language.toUpperCase()}`,
            page_language: language
        });
    }
});

function initializeApp() {
    // Set initial values - RESTORE ORIGINAL SIMPLE VERSION
    updateCharacterCount();
    updateSliderValues();

    // Load saved preferences
    loadPreferences();

    // Apply initial theme
    applyTheme();
}

// Language Selector Functions
function handleLanguageChange() {
    console.log('🌍 Language changed');
    updateSelectedLanguageDisplay();
    loadVoicesForLanguage();
}

function updateSelectedLanguageDisplay() {
    const select = elements.voiceLanguage;
    const selectedOption = select?.options[select.selectedIndex];

    if (selectedOption && elements.selectedLanguage) {
        // Get flag from option text (extract country code)
        const languageCode = selectedOption.value;
        const languageName = selectedOption.text;

        // Extract flag code from language code (e.g., en-US -> us)
        const flagCode = languageCode.split('-')[1]?.toLowerCase() || 'us';

        const flagImg = elements.selectedLanguage.querySelector('.flag-icon');
        const nameSpan = elements.selectedLanguage.querySelector('.language-name');

        if (flagImg) {
            flagImg.src = `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/${flagCode}.svg`;
            flagImg.alt = languageName;
        }

        if (nameSpan) {
            nameSpan.textContent = languageName.split('(')[0].trim(); // Remove country part
        }

        console.log(`🏳️ Updated language display: ${languageName} (${flagCode})`);
    }
}

function setupEventListeners() {
    // Header controls
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.uiLanguage.addEventListener('change', handleUILanguageChange);

    // Mobile menu controls
    elements.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    elements.mobileThemeToggle.addEventListener('click', toggleTheme);
    elements.mobileUiLanguage.addEventListener('change', handleUILanguageChange);

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.mobileMenu.contains(e.target) && !elements.mobileMenuToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });

    // Sidebar controls - RESTORE ORIGINAL EVENT LISTENERS
    elements.voiceLanguage.addEventListener('change', loadVoicesForLanguage);
    elements.ttsEngine.addEventListener('change', handleEngineChange);
    elements.genderButtons.forEach(btn => {
        btn.addEventListener('click', handleGenderFilter);
    });
    elements.voiceSearch.addEventListener('input', handleVoiceSearch);
    elements.speedRange.addEventListener('input', updateSliderValues);
    elements.pitchRange.addEventListener('input', updateSliderValues);

    // Text input
    elements.textInput.addEventListener('input', () => {
        updateCharacterCount();
        updateButtonStates();
    });

    // File import
    // Import file functionality removed from UI
    elements.fileInput.addEventListener('change', handleFileImport);

    // Action buttons
    elements.previewBtn.addEventListener('click', handlePreview);
    elements.generateBtn.addEventListener('click', handleGenerate);
    elements.downloadBtn.addEventListener('click', handleDownload);
}

// Theme Management
function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    applyTheme();
    syncMobileThemeToggle();
    savePreferences();

    // Track theme toggle
    trackThemeToggle(state.isDarkMode ? 'dark' : 'light');
}

function applyTheme() {
    const body = document.body;
    const icon = elements.themeToggle.querySelector('i');

    if (state.isDarkMode) {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
        icon.className = 'fas fa-sun';
    } else {
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
        icon.className = 'fas fa-moon';
    }
}

// Voice Management
async function loadVoicesForLanguage() {
    const selectedLanguage = elements.voiceLanguage?.value;
    const selectedEngine = elements.ttsEngine?.value || 'auto';

    // Show loading state
    elements.voiceList.innerHTML = `
        <div class="voice-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading voices...</span>
        </div>
    `;

    try {
        // Create cache key that includes both language and engine
        const cacheKey = `${selectedLanguage}_${selectedEngine}`;

        // Check cache first
        if (VOICE_CACHE[cacheKey]) {
            state.currentVoices = VOICE_CACHE[cacheKey];
        } else {
            // Fetch voices from server API with engine parameter
            const response = await fetch(`/api/voices/${selectedLanguage}?engine=${selectedEngine}`);
            const data = await response.json();

            if (data.success) {
                state.currentVoices = data.voices || [];
                // Cache the result
                VOICE_CACHE[cacheKey] = state.currentVoices;
            } else {
                throw new Error(data.message || 'Failed to load voices');
            }
        }

        state.filteredVoices = [...state.currentVoices];

        // Reset filters
        resetFilters();

        // Auto-select first voice or load saved preference for this language
        const savedPreferences = getSavedPreferences();
        const savedVoiceForLanguage = savedPreferences.voicesByLanguage?.[selectedLanguage];

        if (savedVoiceForLanguage && state.filteredVoices.find(v => v.id === savedVoiceForLanguage)) {
            // Load saved voice for this language
            state.selectedVoice = state.filteredVoices.find(v => v.id === savedVoiceForLanguage);
            console.log(`🎤 Loaded saved voice: ${state.selectedVoice.name} for ${selectedLanguage}`);
        } else if (state.filteredVoices.length > 0) {
            // Auto-select first voice if no saved preference
            state.selectedVoice = state.filteredVoices[0];
            console.log(`🎤 Auto-selected first voice: ${state.selectedVoice.name} for ${selectedLanguage}`);

            // Save this auto-selection as preference
            if (selectedLanguage) {
                saveVoicePreferenceByLanguage(selectedLanguage, state.selectedVoice.id);
            }
        } else {
            state.selectedVoice = null;
        }

        // Render voices with selection
        renderVoiceList();
        updateButtonStates();

    } catch (error) {
        console.error('Error loading voices:', error);
        elements.voiceList.innerHTML = `
            <div class="voice-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>Error loading voices: ${error.message}</span>
            </div>
        `;
    }
}

function handleEngineChange() {
    console.log(`🎛️ TTS Engine changed to: ${elements.ttsEngine.value}`);

    // Clear cache for current language since engine changed
    const selectedLanguage = elements.voiceLanguage?.value;
    if (selectedLanguage) {
        // Clear all cache entries for this language (all engines)
        Object.keys(VOICE_CACHE).forEach(key => {
            if (key.startsWith(selectedLanguage + '_')) {
                delete VOICE_CACHE[key];
            }
        });
    }

    // Reload voices with new engine
    loadVoicesForLanguage();

    // Save preference
    savePreferences();
}

function resetFilters() {
    // Reset gender filter
    elements.genderButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.gender === 'all') {
            btn.classList.add('active');
        }
    });

    // Reset search
    elements.voiceSearch.value = '';
}

function handleGenderFilter(event) {
    const selectedGender = event.target.dataset.gender;

    // Update active button
    elements.genderButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Filter voices
    filterVoices();
}

function handleVoiceSearch() {
    filterVoices();
}

function filterVoices() {
    const activeGender = document.querySelector('.gender-btn.active').dataset.gender;
    const searchTerm = elements.voiceSearch.value.toLowerCase();

    state.filteredVoices = state.currentVoices.filter(voice => {
        const matchesGender = activeGender === 'all' || voice.gender === activeGender;
        const matchesSearch = voice.name.toLowerCase().includes(searchTerm) ||
                            voice.country.toLowerCase().includes(searchTerm) ||
                            voice.locale.toLowerCase().includes(searchTerm);

        return matchesGender && matchesSearch;
    });

    renderVoiceList();
}

function renderVoiceList() {
    const container = elements.voiceList;

    if (state.filteredVoices.length === 0) {
        container.innerHTML = `
            <div class="voice-loading">
                <i class="fas fa-search"></i>
                <span>No voices found</span>
            </div>
        `;
        return;
    }

    // Check if we should show engine tags
    const selectedEngine = elements.ttsEngine?.value || 'auto';
    const uniqueEngines = [...new Set(state.filteredVoices.map(voice => voice.engine))];

    // Show engine tags when:
    // 1. Manual engine selection (not auto)
    // 2. Mixed engines
    // 3. Non-Azure single engine in auto mode
    const showEngineTags = selectedEngine !== 'auto' ||
                          uniqueEngines.length > 1 ||
                          (uniqueEngines.length === 1 && uniqueEngines[0] !== 'azure');

    const voicesHTML = state.filteredVoices.map(voice => {
        // Generate avatar based on voice name
        const avatarSeed = voice.name.replace(/\s+/g, '').toLowerCase();
        const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${avatarSeed}&backgroundColor=e0e7ff`;

        // Generate subtitle based on voice characteristics
        const subtitles = {
            'Ava': 'Analysis & Commentary',
            'Andrew': 'Professional & Business',
            'Emma': 'Storytelling',
            'Brian': 'News & Documentary',
            'Christopher': 'Storytelling',
            'William': 'Storytelling',
            'Billy Joe': 'Vlogs & Personal Content',
            'John Luke': 'Analysis & Commentary',
            'Jenny': 'Professional & Friendly',
            'Michelle': 'Educational Content'
        };

        const subtitle = subtitles[voice.name] || 'Natural Voice';

        return `
            <div class="voice-item ${state.selectedVoice?.id === voice.id ? 'selected' : ''}"
                 data-voice-id="${voice.id}">
                <img class="voice-avatar" src="${avatarUrl}" alt="${voice.name}" loading="lazy" />
                <div class="voice-info">
                    <div class="voice-name">${voice.name}</div>
                    <div class="voice-subtitle">${subtitle}</div>
                    <div class="voice-details">
                        <span>${voice.gender}</span>
                        <span>${voice.locale.split('-')[0].toUpperCase()}</span>
                    </div>
                </div>
                <button class="voice-preview" data-voice-id="${voice.id}" title="Preview voice">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;
    }).join('');

    container.innerHTML = voicesHTML;

    // Add event listeners
    container.querySelectorAll('.voice-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('voice-preview')) {
                handleVoiceSelection(e.currentTarget.dataset.voiceId);
            }
        });
    });

    container.querySelectorAll('.voice-preview').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleVoicePreview(btn.dataset.voiceId);
        });
    });

    // Auto-select first voice if none selected
    if (!state.selectedVoice && state.filteredVoices.length > 0) {
        handleVoiceSelection(state.filteredVoices[0].id);
    }
}

function handleVoiceSelection(voiceId) {
    state.selectedVoice = state.filteredVoices.find(v => v.id === voiceId);

    // Save voice preference for current language
    const selectedLanguage = elements.voiceLanguage?.value;
    if (selectedLanguage) {
        saveVoicePreferenceByLanguage(selectedLanguage, voiceId);
    }

    if (selectedLanguage && state.selectedVoice) {
        console.log(`🎤 Voice selected: ${state.selectedVoice.name} for ${selectedLanguage}`);
    }

    renderVoiceList();
    updateButtonStates();
}

async function handleVoicePreview(voiceId) {
    const voice = state.filteredVoices.find(v => v.id === voiceId);
    if (!voice) return;

    const sampleText = getSampleTextForLanguage(elements.voiceLanguage.value);

    try {
        showMessage('info', 'Generating preview...');

        const audioData = await generateTTS(sampleText, voice, true);

        if (audioData) {
            playAudio(audioData.audio);
            hideMessage();
        }
    } catch (error) {
        console.error('Preview error:', error);
        showMessage('error', 'Preview failed. Please try again.');
    }
}

function getSampleTextForLanguage(language) {
    const samples = {
        "af-ZA": "Hallo, dit is 'n voorskou van my stem.",
        "sq-AL": "Përshendetje, ky është një paraparje e zërit tim.",
        "am-ET": "ሰላም፣ ይህ የድምጼ ቅድመ እይታ ነው።",
        "ar-DZ": "مرحبا، هذه معاينة لصوتي.",
        "ar-BH": "مرحبا، هذه معاينة لصوتي.",
        "ar-EG": "مرحبا، هذه معاينة لصوتي.",
        "ar-IQ": "مرحبا، هذه معاينة لصوتي.",
        "ar-JO": "مرحبا، هذه معاينة لصوتي.",
        "ar-KW": "مرحبا، هذه معاينة لصوتي.",
        "ar-LB": "مرحبا، هذه معاينة لصوتي.",
        "ar-LY": "مرحبا، هذه معاينة لصوتي.",
        "ar-MA": "مرحبا، هذه معاينة لصوتي.",
        "ar-OM": "مرحبا، هذه معاينة لصوتي.",
        "ar-QA": "مرحبا، هذه معاينة لصوتي.",
        "ar-SA": "مرحبا، هذه معاينة لصوتي.",
        "ar-SY": "مرحبا، هذه معاينة لصوتي.",
        "ar-TN": "مرحبا، هذه معاينة لصوتي.",
        "ar-AE": "مرحبا، هذه معاينة لصوتي.",
        "ar-YE": "مرحبا، هذه معاينة لصوتي.",
        "az-AZ": "Salam, bu mənim səsimin önizləməsidir.",
        "bn-BD": "হ্যালো, এটি আমার কণ্ঠস্বরের একটি প্রিভিউ।",
        "bn-IN": "হ্যালো, এটি আমার কণ্ঠস্বরের একটি প্রিভিউ।",
        "bs-BA": "Zdravo, ovo je pregled mog glasa.",
        "bg-BG": "Здравейте, това е предварителен преглед на моя глас.",
        "my-MM": "မင်္ဂလာပါ၊ ဤသည်ကျွန်တော့်အသံ၏အကြိုကြည့်ရှုမှုဖြစ်သည်။",
        "ca-ES": "Hola, aquesta és una previsualització de la meva veu.",
        "zh-HK": "你好，這是我聲音的預覽。",
        "zh-CN": "你好，这是我声音的预览。",
        "zh-CN-liaoning": "你好，这是我声音的预览。",
        "zh-TW": "你好，這是我聲音的預覽。",
        "zh-CN-shaanxi": "你好，这是我声音的预览。",
        "hr-HR": "Zdravo, ovo je pregled mog glasa.",
        "cs-CZ": "Ahoj, toto je náhled mého hlasu.",
        "da-DK": "Hej, dette er en forhåndsvisning af min stemme.",
        "nl-BE": "Hallo, dit is een voorbeeld van mijn stem.",
        "nl-NL": "Hallo, dit is een voorbeeld van mijn stem.",
        "en-AU": "Hello, this is a preview of my voice.",
        "en-CA": "Hello, this is a preview of my voice.",
        "en-HK": "Hello, this is a preview of my voice.",
        "en-IN": "Hello, this is a preview of my voice.",
        "en-IE": "Hello, this is a preview of my voice.",
        "en-KE": "Hello, this is a preview of my voice.",
        "en-NZ": "Hello, this is a preview of my voice.",
        "en-NG": "Hello, this is a preview of my voice.",
        "en-PH": "Hello, this is a preview of my voice.",
        "en-SG": "Hello, this is a preview of my voice.",
        "en-ZA": "Hello, this is a preview of my voice.",
        "en-TZ": "Hello, this is a preview of my voice.",
        "en-GB": "Hello, this is a preview of my voice.",
        "en-US": "Hello, this is a preview of my voice.",
        "et-EE": "Tere, see on minu hääle eelvaade.",
        "fil-PH": "Kumusta, ito ay isang preview ng aking boses.",
        "fi-FI": "Hei, tämä on esikatselu äänestäni.",
        "fr-BE": "Bonjour, ceci est un aperçu de ma voix.",
        "fr-CA": "Bonjour, ceci est un aperçu de ma voix.",
        "fr-FR": "Bonjour, ceci est un aperçu de ma voix.",
        "fr-CH": "Bonjour, ceci est un aperçu de ma voix.",
        "gl-ES": "Ola, esta é unha vista previa da miña voz.",
        "ka-GE": "გამარჯობა, ეს არის ჩემი ხმის წინასწარი ნახვა.",
        "de-AT": "Hallo, das ist eine Vorschau meiner Stimme.",
        "de-DE": "Hallo, das ist eine Vorschau meiner Stimme.",
        "de-CH": "Hallo, das ist eine Vorschau meiner Stimme.",
        "el-GR": "Γεια σας, αυτή είναι μια προεπισκόπηση της φωνής μου.",
        "gu-IN": "નમસ્તે, આ મારા અવાજનું પૂર્વાવલોકન છે.",
        "he-IL": "שלום, זה תצוגה מקדימה של הקול שלי.",
        "hi-IN": "नमस्ते, यह मेरी आवाज़ का पूर्वावलोकन है।",
        "hu-HU": "Helló, ez a hangom előnézete.",
        "is-IS": "Halló, þetta er forskoðun á röddinni minni.",
        "id-ID": "Halo, ini adalah pratinjau suara saya.",
        "iu-Latn-CA": "Hello, this is a preview of my voice.",
        "iu-Cans-CA": "ᐊᐃᓐ, ᐅᓇ ᓂᐱᖓᐅᒐ.",
        "ga-IE": "Dia duit, is réamhamharc é seo ar mo ghuth.",
        "it-IT": "Ciao, questa è un'anteprima della mia voce.",
        "ja-JP": "こんにちは、これは私の声のプレビューです。",
        "jv-ID": "Halo, iki pratinjau swara kula.",
        "kn-IN": "ನಮಸ್ಕಾರ, ಇದು ನನ್ನ ಧ್ವನಿಯ ಮುನ್ನೋಟವಾಗಿದೆ.",
        "kk-KZ": "Сәлеметсіз бе, бұл менің дауысымның алдын ала көрінісі.",
        "km-KH": "ជម្រាបសួរ នេះគឺជាការមើលជាមុននៃសំឡេងរបស់ខ្ញុំ។",
        "ko-KR": "안녕하세요, 이것은 제 목소리의 미리보기입니다.",
        "lo-LA": "ສະບາຍດີ, ນີ້ແມ່ນການສະແດງຕົວຢ່າງສຽງຂອງຂ້ອຍ.",
        "lv-LV": "Sveiki, šis ir manas balss priekšskatījums.",
        "lt-LT": "Labas, tai mano balso peržiūra.",
        "mk-MK": "Здраво, ова е преглед на мојот глас.",
        "ms-MY": "Hello, ini adalah pratonton suara saya.",
        "ml-IN": "ഹലോ, ഇത് എന്റെ ശബ്ദത്തിന്റെ പ്രിവ്യൂ ആണ്.",
        "mt-MT": "Bonġu, dan huwa dehra tal-vuċi tiegħi.",
        "mr-IN": "नमस्कार, हे माझ्या आवाजाचे पूर्वावलोकन आहे.",
        "mn-MN": "Сайн байна уу, энэ бол миний дуу хоолойн урьдчилан харах юм.",
        "ne-NP": "नमस्ते, यो मेरो आवाजको पूर्वावलोकन हो।",
        "nb-NO": "Hei, dette er en forhåndsvisning av stemmen min.",
        "ps-AF": "سلام ، دا زما د غږ مخکینۍ کتنه ده.",
        "fa-IR": "سلام، این پیش نمایش صدای من است.",
        "pl-PL": "Cześć, to jest podgląd mojego głosu.",
        "pt-BR": "Olá, esta é uma prévia da minha voz.",
        "pt-PT": "Olá, esta é uma pré-visualização da minha voz.",
        "ro-RO": "Salut, aceasta este o previzualizare a vocii mele.",
        "ru-RU": "Привет, это превью моего голоса.",
        "sr-RS": "Здраво, ово је преглед мог гласа.",
        "si-LK": "ආයුබෝවන්, මෙය මගේ කඬේ පූර්ව දර්ශනයකි.",
        "sk-SK": "Ahoj, toto je náhľad môjho hlasu.",
        "sl-SI": "Pozdravljeni, to je predogled mojega glasu.",
        "so-SO": "Hello, kani waa muuqaal ahaan codkayga.",
        "es-AR": "Hola, esta es una vista previa de mi voz.",
        "es-BO": "Hola, esta es una vista previa de mi voz.",
        "es-CL": "Hola, esta es una vista previa de mi voz.",
        "es-CO": "Hola, esta es una vista previa de mi voz.",
        "es-ES": "Hola, esta es una vista previa de mi voz.",
        "es-CR": "Hola, esta es una vista previa de mi voz.",
        "es-CU": "Hola, esta es una vista previa de mi voz.",
        "es-DO": "Hola, esta es una vista previa de mi voz.",
        "es-EC": "Hola, esta es una vista previa de mi voz.",
        "es-SV": "Hola, esta es una vista previa de mi voz.",
        "es-GQ": "Hola, esta es una vista previa de mi voz.",
        "es-GT": "Hola, esta es una vista previa de mi voz.",
        "es-HN": "Hola, esta es una vista previa de mi voz.",
        "es-MX": "Hola, esta es una vista previa de mi voz.",
        "es-NI": "Hola, esta es una vista previa de mi voz.",
        "es-PA": "Hola, esta es una vista previa de mi voz.",
        "es-PY": "Hola, esta es una vista previa de mi voz.",
        "es-PE": "Hola, esta es una vista previa de mi voz.",
        "es-PR": "Hola, esta es una vista previa de mi voz.",
        "es-US": "Hola, esta es una vista previa de mi voz.",
        "es-UY": "Hola, esta es una vista previa de mi voz.",
        "es-VE": "Hola, esta es una vista previa de mi voz.",
        "su-ID": "Halo, ieu téh tinulis sora abdi.",
        "sw-KE": "Hujambo, hii ni onyesho la awali la sauti yangu.",
        "sw-TZ": "Hujambo, hii ni onyesho la awali la sauti yangu.",
        "sv-SE": "Hej, det här är en förhandstitt på min röst.",
        "ta-IN": "வணக்கம், இது என் குரலின் முன்னோட்டமாகும்.",
        "ta-MY": "வணக்கம், இது என் குரலின் முன்னோட்டமாகும்.",
        "ta-SG": "வணக்கம், இது என் குரலின் முன்னோட்டமாகும்.",
        "ta-LK": "வணக்கம், இது என் குரலின் முன்னோட்டமாகும்.",
        "te-IN": "హలో, ఇది నా వాయిస్ యొక్క ప్రివ్యూ.",
        "th-TH": "สวัสดี นี่คือตัวอย่างเสียงของฉัน",
        "tr-TR": "Merhaba, bu benim sesimin önizlemesi.",
        "uk-UA": "Привіт, це попередній перегляд мого голосу.",
        "ur-IN": "ہیلو، یہ میری آواز کا پیش منظر ہے۔",
        "ur-PK": "ہیلو، یہ میری آواز کا پیش منظر ہے۔",
        "uz-UZ": "Salom, bu mening ovozimning oldindan ko'rinishi.",
        "vi-VN": "Xin chào, đây là mẫu giọng nói của tôi.",
        "cy-GB": "Helo, dyma ragflas o fy llais.",
        "zu-ZA": "Sawubona, lena yisibonelo sezwi lami."
    };

    return samples[language] || samples['en-US'];
}

// UI Updates
function updateCharacterCount() {
    const text = elements.textInput.value;
    const charCount = text.length;
    const lineCount = text.split('\n').length;

    // Basic character count display
    let displayText = `${charCount.toLocaleString()} characters (${lineCount} lines)`;

    // Add chunk information for long text
    // Remove chunk information display
    // if (charCount > 5000) {
    //     const estimatedChunks = Math.ceil(charCount / 4500);
    //     displayText += ` → Will be split into ${estimatedChunks} chunks`;
    // }

    elements.charCount.textContent = displayText;

    // Enhanced color coding for long text support
    if (charCount > 5000) {
        elements.charCount.style.color = 'var(--accent-primary)'; // Blue for long text (supported)
    } else if (charCount > 4000) {
        elements.charCount.style.color = 'var(--error-color)'; // Red for approaching limit
    } else if (charCount > 3000) {
        elements.charCount.style.color = 'var(--warning-color)'; // Orange for warning
    } else {
        elements.charCount.style.color = 'var(--text-muted)'; // Gray for normal
    }
}

function updateSliderValues() {
    const speed = elements.speedRange.value;
    const pitch = elements.pitchRange.value;

    elements.speedValue.textContent = `${speed}%`;
    elements.pitchValue.textContent = `${pitch}%`;
}

function updateButtonStates() {
    const hasText = elements.textInput.value.trim().length > 0;
    const hasVoice = state.selectedVoice !== null;
    const canAct = hasText && hasVoice && !state.isGenerating;

    elements.previewBtn.disabled = !canAct;
    elements.generateBtn.disabled = !canAct;
}

function setGeneratingState(isGenerating, customMessage = null) {
    state.isGenerating = isGenerating;

    const buttons = [elements.previewBtn, elements.generateBtn];

    buttons.forEach(btn => {
        const icon = btn.querySelector('i');

        if (isGenerating) {
            // Chỉ thay đổi icon, giữ nguyên text
            icon.className = 'fas fa-spinner fa-spin';
        } else {
            // Restore icon, text giữ nguyên
            icon.className = btn.id === 'preview-btn' ? 'fas fa-play' : 'fas fa-bolt';
        }
    });

    updateButtonStates();
}

// Message System
function showMessage(type, text) {
    const icons = {
        error: 'fas fa-exclamation-circle',
        success: 'fas fa-check-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    elements.messageArea.className = `message-area ${type}`;
    elements.messageIcon.className = icons[type];
    elements.messageText.textContent = text;
    elements.messageArea.classList.remove('hidden');
}

function hideMessage() {
    elements.messageArea.classList.add('hidden');
}

// File Import
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await readFileAsText(file);
        elements.textInput.value = text;
        updateCharacterCount();
        updateButtonStates();

        showMessage('success', `File "${file.name}" imported successfully.`);
        setTimeout(hideMessage, 3000);
    } catch (error) {
        showMessage('error', 'Failed to read file. Please try again.');
    }

    // Reset file input
    event.target.value = '';
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Audio Generation
async function handlePreview() {
    const text = elements.textInput.value.trim();
    if (!text || !state.selectedVoice) return;

    const previewText = text.length > 200 ? text.substring(0, 200) + '...' : text;

    // Track voice preview
    trackVoicePreview(
        elements.voiceLanguage.value,
        state.selectedVoice.name,
        state.selectedVoice.gender
    );

    setGeneratingState(true);
    hideMessage();

    try {
        const audioData = await generateTTS(previewText, state.selectedVoice, true);

        if (audioData) {
            playAudio(audioData.audio);
            showMessage('success', 'Preview generated successfully.');
        }
    } catch (error) {
        console.error('Preview error:', error);
        const errorMessage = handleTTSError(error, text.length, true);
        showMessage('error', errorMessage);
    } finally {
        setGeneratingState(false);
        setTimeout(hideMessage, 3000);
    }
}

async function handleGenerate() {
    const text = elements.textInput.value.trim();
    if (!text || !state.selectedVoice) return;

    // Track voice generation
    trackVoiceGeneration(
        elements.voiceLanguage.value,
        state.selectedVoice.name,
        state.selectedVoice.gender,
        text.length
    );

    setGeneratingState(true);
    hideMessage();

    try {
        const audioData = await generateTTS(text, state.selectedVoice, false);

        if (audioData) {
            displayResults(audioData);
            showMessage('success', 'Audio generated successfully.');
        }
    } catch (error) {
        console.error('Generation error:', error);
        const errorMessage = handleTTSError(error, text.length, false);
        showMessage('error', errorMessage);
    } finally {
        setGeneratingState(false);
        setTimeout(hideMessage, 3000);
    }
}

async function generateTTS(text, voice, isPreview = false) {
    const language = elements.voiceLanguage.value;
    const engine = elements.ttsEngine.value;
    const speed = parseInt(elements.speedRange.value);
    const pitch = parseInt(elements.pitchRange.value);

    const isLongText = text.length > 5000 && !isPreview; // Don't use long endpoint for previews
    const endpoint = isLongText ? '/api/tts/generate-long' : '/api/tts/generate';

    // Show appropriate loading message
    if (isLongText) {
        showMessage('info', `Processing ${text.length.toLocaleString()} characters...`);
    }

    const requestData = {
        text,
        language,
        voice: voice.id,
        voiceName: voice.name,
        gender: voice.gender,
        speed,
        pitch,
        isPreview,
        engine
    };

    console.log(`Using ${isLongText ? 'long text' : 'regular'} TTS endpoint for ${text.length} characters`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'TTS generation failed');
    }

    const result = await response.json();

    // Show success message with processing info for long text
    if (isLongText && result.processing) {
        const { finalAudioSize } = result.processing;
        const sizeMB = (finalAudioSize / (1024 * 1024)).toFixed(1);
        showMessage('success', `✅ Audio generated → Final: ${sizeMB}MB MP3`);
    }

    return result;
}

function playAudio(audioBase64) {
    // Stop current audio if playing
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }

    // Create new audio
    const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    state.currentAudio = audio;

    audio.play().catch(error => {
        console.warn('Autoplay prevented:', error);
    });

    // Cleanup
    audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        state.currentAudio = null;
    };
}

function displayResults(audioData) {
    // Clean up previous audio
    if (state.currentAudioUrl) {
        URL.revokeObjectURL(state.currentAudioUrl);
    }

    // Create audio blob
    const audioBlob = base64ToBlob(audioData.audio, 'audio/mpeg');
    state.currentAudioUrl = URL.createObjectURL(audioBlob);

    // Store for download
    state.currentAudio = audioBlob;

    // Update audio player
    elements.audioPlayer.src = state.currentAudioUrl;
    elements.audioPlayer.load();

    // Show results section
    elements.resultsSection.classList.remove('hidden');

    // Scroll to results
    elements.resultsSection.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });

    // Auto-play if enabled
    if (elements.autoplayCheckbox.checked) {
        setTimeout(() => {
            elements.audioPlayer.play().catch(error => {
                console.warn('Autoplay prevented:', error);
            });
        }, 500);
    }
}

function handleDownload() {
    if (!state.currentAudio || !state.currentAudioUrl) {
        showMessage('error', 'No audio to download. Please generate audio first.');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const voiceName = state.selectedVoice?.name || 'voice';
    const filename = `tts_${voiceName}_${timestamp}.mp3`;

    const downloadLink = document.createElement('a');
    downloadLink.href = state.currentAudioUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Track audio download
    trackAudioDownload('mp3', voiceName, elements.voiceLanguage.value);

    showMessage('success', `Downloaded: ${filename}`);
    setTimeout(hideMessage, 3000);
}

// Utility Functions
function base64ToBlob(base64, type) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
}

function handleUILanguageChange() {
    const selectedLanguage = elements.uiLanguage.value;
    const currentPath = window.location.pathname;

    // Get current language for tracking
    const currentLanguage = currentPath.match(/^\/([a-z]{2})\//) ? currentPath.match(/^\/([a-z]{2})\//)[1] : 'en';

    // Save language preference
    savePreferences();

    // Build new URL based on selected language
    let newUrl = '';

    if (selectedLanguage === 'en') {
        // English is the default language (root)
        newUrl = '/';
    } else {
        // Other languages use /:lang/ format
        newUrl = `/${selectedLanguage}/`;
    }

    // Only redirect if we're not already on the correct page
    if (currentPath !== newUrl) {
        // Track language switch
        trackLanguageSwitch(currentLanguage, selectedLanguage);

        console.log(`🌍 Switching language to ${selectedLanguage}: ${newUrl}`);
        window.location.href = newUrl;
    }
}

function setLanguageFromURL() {
    const currentPath = window.location.pathname;
    let detectedLanguage = 'en'; // default

    // Extract language from URL path
    const pathMatch = currentPath.match(/^\/([a-z]{2})\//);
    if (pathMatch) {
        detectedLanguage = pathMatch[1];
    }

    // Set the language selector to match current page
    if (elements.uiLanguage) {
        elements.uiLanguage.value = detectedLanguage;
        console.log(`🌍 Detected language from URL: ${detectedLanguage}`);
    }

    // Also set mobile language selector
    if (elements.mobileUiLanguage) {
        elements.mobileUiLanguage.value = detectedLanguage;
    }
}

// Mobile Menu Functions
function toggleMobileMenu() {
    const isOpen = elements.mobileMenu.classList.contains('active');

    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    elements.mobileMenu.classList.add('active');
    elements.mobileMenuToggle.classList.add('active');

    // Sync mobile theme toggle with main theme toggle
    syncMobileThemeToggle();

    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';

    // Track mobile menu open
    trackMobileMenuToggle('open');
}

function closeMobileMenu() {
    elements.mobileMenu.classList.remove('active');
    elements.mobileMenuToggle.classList.remove('active');

    // Restore body scroll
    document.body.style.overflow = '';

    // Track mobile menu close
    trackMobileMenuToggle('close');
}

function syncMobileThemeToggle() {
    const isDark = state.isDarkMode;
    const mobileIcon = elements.mobileThemeToggle.querySelector('i');
    const mobileText = elements.mobileThemeToggle.querySelector('span');

    if (isDark) {
        mobileIcon.className = 'fas fa-sun';
        mobileText.textContent = 'Light Mode';
    } else {
        mobileIcon.className = 'fas fa-moon';
        mobileText.textContent = 'Dark Mode';
    }
}

// Preferences Management
function savePreferences() {
    const preferences = {
        isDarkMode: state.isDarkMode,
        selectedLanguage: elements.voiceLanguage.value,
        selectedVoiceId: state.selectedVoice?.id,
        speed: elements.speedRange.value,
        pitch: elements.pitchRange.value,
        autoplay: elements.autoplayCheckbox.checked,
        uiLanguage: elements.uiLanguage.value,
        voicesByLanguage: getSavedPreferences().voicesByLanguage || {}
    };

    localStorage.setItem('tts-preferences', JSON.stringify(preferences));
}

function saveVoicePreferenceByLanguage(language, voiceId) {
    const preferences = getSavedPreferences();

    if (!preferences.voicesByLanguage) {
        preferences.voicesByLanguage = {};
    }

    preferences.voicesByLanguage[language] = voiceId;

    // Update global preferences and save
    preferences.selectedLanguage = language;
    preferences.selectedVoiceId = voiceId;

    localStorage.setItem('tts-preferences', JSON.stringify(preferences));
}

function getSavedPreferences() {
    try {
        const saved = localStorage.getItem('tts-preferences');
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn('Failed to parse saved preferences:', error);
        return {};
    }
}

function loadPreferences() {
    try {
        const saved = localStorage.getItem('tts-preferences');
        if (!saved) return;

        const preferences = JSON.parse(saved);

        // Apply preferences
        state.isDarkMode = preferences.isDarkMode || false;

        if (preferences.selectedLanguage) {
            elements.voiceLanguage.value = preferences.selectedLanguage;
        }

        if (preferences.speed !== undefined) {
            elements.speedRange.value = preferences.speed;
        }

        if (preferences.pitch !== undefined) {
            elements.pitchRange.value = preferences.pitch;
        }

        if (preferences.autoplay !== undefined) {
            elements.autoplayCheckbox.checked = preferences.autoplay;
        }

        if (preferences.uiLanguage) {
            elements.uiLanguage.value = preferences.uiLanguage;
        }

        // Load voices for saved language and select saved voice
        if (preferences.selectedLanguage) {
            loadVoicesForLanguage();

            if (preferences.selectedVoiceId) {
                setTimeout(() => {
                    handleVoiceSelection(preferences.selectedVoiceId);
                }, 100);
            }
        }

    } catch (error) {
        console.warn('Failed to load preferences:', error);
    }
}

// Save preferences when values change
document.addEventListener('change', () => {
    setTimeout(savePreferences, 100);
});

// Smart error message handling
function handleTTSError(error, textLength, isPreview) {
    const errorMessage = error.message || error;

    // Handle specific error cases with helpful suggestions
    if (errorMessage.includes('Text too long for regular processing')) {
        if (isPreview) {
            return 'Preview is limited to shorter text. For long text, use the Generate button which supports unlimited length.';
        } else {
            return `Text is ${textLength.toLocaleString()} characters. The system will automatically process long texts - please try again.`;
        }
    }

    if (errorMessage.includes('Text chunking failed')) {
        return `Failed to process long text (${textLength.toLocaleString()} chars). Please check your text formatting and try again.`;
    }

    if (errorMessage.includes('Audio merging failed')) {
        return 'Long text processing completed but audio merging failed. Please try again or contact support.';
    }

    if (errorMessage.includes('Failed to generate speech')) {
        return 'Voice synthesis failed. Please check your internet connection and try again.';
    }

    if (errorMessage.includes('Network')) {
        return 'Network error occurred. Please check your connection and try again.';
    }

    // Default fallback with context
    const operation = isPreview ? 'Preview' : 'Generation';
    const lengthInfo = textLength > 5000 ? ` (${textLength.toLocaleString()} characters)` : '';

    return `${operation} failed${lengthInfo}. ${errorMessage}`;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (state.currentAudioUrl) {
        URL.revokeObjectURL(state.currentAudioUrl);
    }

    if (state.currentAudio) {
        state.currentAudio.pause();
    }
});

// Email URL Helper - Desktop: Gmail Web, Mobile: Email App
function getEmailUrl(to, subject, body) {
    // Detect mobile device
    const isMobile = window.innerWidth <= 768 ||
                     /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    if (isMobile) {
        // Mobile: Use mailto (opens email app)
        return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    } else {
        // Desktop: Use Gmail web compose
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodedSubject}&body=${encodedBody}`;
    }
}

// Support Widget Functionality
class SupportWidget {
    constructor() {
        this.supportToggle = document.getElementById('support-toggle');
        this.supportPanel = document.getElementById('support-panel');
        this.closeBtn = document.getElementById('close-support');
        this.sendBtn = document.getElementById('send-support-email');
        this.messageTextarea = document.getElementById('support-message');
        this.validationTooltip = document.getElementById('validation-tooltip');
        this.isOpen = false;

        this.init();

        // Check for pending success popup on page load/focus
        this.checkAndShowSuccessPopup();

        // Check when user returns to tab
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    this.checkAndShowSuccessPopup();
                }, 1000); // Delay to let user settle
            }
        });

        // Check on window focus
        window.addEventListener('focus', () => {
            setTimeout(() => {
                this.checkAndShowSuccessPopup();
            }, 1000);
        });
    }

    init() {
        // Toggle panel
        this.supportToggle.addEventListener('click', () => {
            this.togglePanel();
        });

        // Close panel
        this.closeBtn.addEventListener('click', () => {
            this.closePanel();
        });

        // Send email with validation
        this.sendBtn.addEventListener('click', () => {
            this.handleSendEmail();
        });

        // Hide validation tooltip when typing
        this.messageTextarea.addEventListener('input', () => {
            this.hideValidation();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!document.querySelector('.support-widget').contains(e.target) && this.isOpen) {
                this.closePanel();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closePanel();
            }
        });
    }

    togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        this.supportPanel.classList.add('open');
        this.isOpen = true;

        // Track analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'support_widget_open', {
                event_category: 'engagement',
                event_label: 'support_widget'
            });
        }
    }

    closePanel() {
        this.supportPanel.classList.remove('open');
        this.isOpen = false;

        // Reset success state and restore original content
        if (this.isSuccessState && this.originalSupportContent) {
            const supportContent = this.supportPanel.querySelector('.support-content');
            supportContent.innerHTML = this.originalSupportContent;

            // Re-initialize references and event listeners
            this.messageTextarea = document.getElementById('support-message');
            this.sendBtn = document.getElementById('send-support-email');
            this.validationTooltip = document.getElementById('validation-tooltip');

            // Clear form and re-attach listeners
            this.messageTextarea.value = '';
            this.reAttachFormListeners();

            this.isSuccessState = false;
            this.originalSupportContent = null;
        }
    }

    reAttachFormListeners() {
        // Re-attach send email listener
        this.sendBtn.addEventListener('click', () => {
            this.handleSendEmail();
        });

        // Re-attach validation hide listener
        this.messageTextarea.addEventListener('input', () => {
            this.hideValidation();
        });
    }

    openEmailClient() {
        const subject = 'Support Request - Text-to-Speech.space';
        const body = `[Please describe your question or issue here]

Thank you for your assistance!`;

        const emailUrl = getEmailUrl('trinhquoccongldb1@gmail.com', subject, body);

        // Try to open email client/web
        try {
            window.open(emailUrl, '_blank');

            // Track analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'support_email_click', {
                    event_category: 'engagement',
                    event_label: 'email_support'
                });
            }

            // Show success message
            this.showSuccessMessage();
        } catch (error) {
            console.warn('Could not open email client:', error);
            this.showFallbackOptions();
        }
    }

    showSuccessMessage() {
        const originalContent = this.emailBtn.innerHTML;
        this.emailBtn.innerHTML = '<i class="fas fa-check"></i> Email Client Opening...';
        this.emailBtn.style.background = '#10b981';

        setTimeout(() => {
            this.emailBtn.innerHTML = originalContent;
            this.emailBtn.style.background = '';
            this.closePanel();
        }, 2000);
    }

    showFallbackOptions() {
        const content = this.supportPanel.querySelector('.support-content');
        content.innerHTML = `
            <p>Email client could not be opened automatically.</p>
            <div class="fallback-options">
                <p><strong>Please contact us manually:</strong></p>
                <p>
                    <i class="fas fa-envelope"></i>
                    <a href="mailto:trinhquoccongldb1@gmail.com" style="color: var(--primary-color);">
                        trinhquoccongldb1@gmail.com
                    </a>
                </p>
                <button class="email-btn" onclick="navigator.clipboard.writeText('trinhquoccongldb1@gmail.com').then(() => alert('Email copied to clipboard!'))">
                    <i class="fas fa-copy"></i>
                    Copy Email
                </button>
            </div>
        `;
    }

    handleSendEmail() {
        const message = this.messageTextarea.value.trim();

        if (!message) {
            this.showValidation();
            this.messageTextarea.focus();
            return;
        }

        this.hideValidation();
        this.openEmailClientWithMessage(message);
    }

    showValidation() {
        this.validationTooltip.style.display = 'block';
        this.messageTextarea.style.borderColor = '#ef4444';
    }

    hideValidation() {
        this.validationTooltip.style.display = 'none';
        this.messageTextarea.style.borderColor = '';
    }

    openEmailClientWithMessage(userMessage) {
        const subject = 'Support Request - Text-to-Speech.space';
        const body = `${userMessage}

Thank you for your assistance!`;

        const emailUrl = getEmailUrl('trinhquoccongldb1@gmail.com', subject, body);

        // Try to open email client/web
        try {
            window.open(emailUrl, '_blank');

            // Track analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'support_email_send', {
                    event_category: 'engagement',
                    event_label: 'email_support_with_message'
                });
            }

            // Show success and clear form
            this.showSendSuccess();
        } catch (error) {
            console.warn('Could not open email client:', error);
            this.showFallbackOptions();
        }
    }

    showSendSuccess() {
        // Mark that email was sent - will show popup when user returns
        localStorage.setItem('emailSent', 'true');
        localStorage.setItem('emailSentTime', Date.now().toString());

        // Close support panel immediately
        this.closePanel();
    }

    checkAndShowSuccessPopup() {
        const emailSent = localStorage.getItem('emailSent');
        const emailSentTime = localStorage.getItem('emailSentTime');

        if (emailSent === 'true') {
            // Check if not too old (within 5 minutes)
            const now = Date.now();
            const sentTime = parseInt(emailSentTime);
            if (now - sentTime < 300000) { // 5 minutes
                this.showSuccessPopup();
            }

            // Clear the flag
            localStorage.removeItem('emailSent');
            localStorage.removeItem('emailSentTime');
        }
    }

    showSuccessPopup() {
        // Prevent duplicate popups
        const existingPopup = document.querySelector('.success-popup-overlay');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create overlay popup
        const popup = document.createElement('div');
        popup.className = 'success-popup-overlay';
        popup.innerHTML = `
            <div class="success-popup">
                <div class="success-message">
                    <div class="success-icon">
                        <div class="checkmark-circle">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                    <h2 class="success-title">Almost there!</h2>
                    <p class="success-text">After you <strong>send the email</strong>, we'll get back to you within <strong>24 hours</strong>.</p>
                    <button class="success-close-btn">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
        `;

        // Close button handler
        const closeBtn = popup.querySelector('.success-close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.remove();
        });

        // Close on outside click (click overlay, not popup content)
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });

        document.body.appendChild(popup);

        // Show with animation
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);
    }
}

// Initialize support widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SupportWidget();
});

// Voice Settings Logic
class VoiceSettings {
    constructor() {
        this.iconBtn = document.getElementById('settings-icon-btn');
        this.dropdown = document.getElementById('settings-dropdown');

        // Sliders
        this.speedSlider = document.getElementById('speed-slider');
        this.pitchSlider = document.getElementById('pitch-slider');
        this.volumeSlider = document.getElementById('volume-slider');

        // Display values (bên ngoài)
        this.speedDisplay = document.getElementById('speed-display');
        this.pitchDisplay = document.getElementById('pitch-display');
        this.volumeDisplay = document.getElementById('volume-display');

        this.isOpen = false;
        this.initEventListeners();
    }

    initEventListeners() {
        // Toggle dropdown
        this.iconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen &&
                !this.dropdown.contains(e.target) &&
                !this.iconBtn.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Slider events - cập nhật display values khi thay đổi
        this.speedSlider.addEventListener('input', () => this.updateSpeed());
        this.pitchSlider.addEventListener('input', () => this.updatePitch());
        this.volumeSlider.addEventListener('input', () => this.updateVolume());

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.iconBtn.classList.add('active');
        this.dropdown.classList.add('open');
        this.isOpen = true;
    }

    closeDropdown() {
        this.iconBtn.classList.remove('active');
        this.dropdown.classList.remove('open');
        this.isOpen = false;
    }

    updateSpeed() {
        const value = parseFloat(this.speedSlider.value);
        this.speedDisplay.textContent = value.toFixed(1) + 'x';

        // Update the actual speed control if exists
        if (elements.speedRange) {
            const speedPercent = ((value - 1) * 100); // Convert to percentage for original slider
            elements.speedRange.value = speedPercent;
            if (elements.speedValue) {
                elements.speedValue.textContent = value.toFixed(1) + 'x';
            }
        }
    }

    updatePitch() {
        const value = parseFloat(this.pitchSlider.value);
        this.pitchDisplay.textContent = value.toFixed(1) + 'x';

        // Update the actual pitch control if exists
        if (elements.pitchRange) {
            const pitchPercent = ((value - 1) * 100); // Convert to percentage for original slider
            elements.pitchRange.value = pitchPercent;
            if (elements.pitchValue) {
                elements.pitchValue.textContent = value.toFixed(1) + 'x';
            }
        }
    }

    updateVolume() {
        const value = parseInt(this.volumeSlider.value);
        this.volumeDisplay.textContent = value + '%';
    }
}

// Initialize voice settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new VoiceSettings();
});