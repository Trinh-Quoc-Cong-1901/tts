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

    // Sidebar controls
    voiceLanguage: document.getElementById('voice-language'),
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
    importBtn: document.getElementById('import-file'),
    fileInput: document.getElementById('file-input'),
    messageArea: document.getElementById('message-area'),
    messageIcon: document.querySelector('.message-icon'),
    messageText: document.querySelector('.message-text'),
    previewBtn: document.getElementById('preview-btn'),
    generateBtn: document.getElementById('generate-btn'),
    resultsSection: document.getElementById('results-section'),
    audioPlayer: document.getElementById('audio-player'),
    downloadBtn: document.getElementById('download-btn')
};

// Voice Database - Expanded with more languages and voices
const VOICE_DATABASE = {
    'en-US': [
        { id: 'en-US-1', name: 'Abigail', gender: 'female', country: 'US', accent: 'General American' },
        { id: 'en-US-2', name: 'Ana', gender: 'female', country: 'US', accent: 'General American' },
        { id: 'en-US-3', name: 'Andrew', gender: 'male', country: 'US', accent: 'General American' },
        { id: 'en-US-4', name: 'Aria', gender: 'female', country: 'US', accent: 'General American' },
        { id: 'en-US-5', name: 'Davis', gender: 'male', country: 'US', accent: 'General American' },
        { id: 'en-US-6', name: 'Emma', gender: 'female', country: 'US', accent: 'General American' },
        { id: 'en-US-7', name: 'Jenny', gender: 'female', country: 'US', accent: 'General American' },
        { id: 'en-US-8', name: 'Guy', gender: 'male', country: 'US', accent: 'General American' },
        { id: 'en-US-9', name: 'Jane', gender: 'female', country: 'US', accent: 'General American' },
        { id: 'en-US-10', name: 'Jason', gender: 'male', country: 'US', accent: 'General American' }
    ],
    'en-GB': [
        { id: 'en-GB-1', name: 'Libby', gender: 'female', country: 'GB', accent: 'British' },
        { id: 'en-GB-2', name: 'Maisie', gender: 'female', country: 'GB', accent: 'British' },
        { id: 'en-GB-3', name: 'Ryan', gender: 'male', country: 'GB', accent: 'British' },
        { id: 'en-GB-4', name: 'Sonia', gender: 'female', country: 'GB', accent: 'British' },
        { id: 'en-GB-5', name: 'Thomas', gender: 'male', country: 'GB', accent: 'British' }
    ],
    'en-AU': [
        { id: 'en-AU-1', name: 'Natasha', gender: 'female', country: 'AU', accent: 'Australian' },
        { id: 'en-AU-2', name: 'William', gender: 'male', country: 'AU', accent: 'Australian' },
        { id: 'en-AU-3', name: 'Olivia', gender: 'female', country: 'AU', accent: 'Australian' }
    ],
    'vi-VN': [
        { id: 'vi-VN-1', name: 'Hoài My', gender: 'female', country: 'VN', accent: 'Northern' },
        { id: 'vi-VN-2', name: 'Nam Minh', gender: 'male', country: 'VN', accent: 'Northern' },
        { id: 'vi-VN-3', name: 'Thu Minh', gender: 'female', country: 'VN', accent: 'Southern' },
        { id: 'vi-VN-4', name: 'Minh Khang', gender: 'male', country: 'VN', accent: 'Southern' }
    ],
    'es-ES': [
        { id: 'es-ES-1', name: 'Elvira', gender: 'female', country: 'ES', accent: 'Castilian' },
        { id: 'es-ES-2', name: 'Saul', gender: 'male', country: 'ES', accent: 'Castilian' },
        { id: 'es-ES-3', name: 'Triana', gender: 'female', country: 'ES', accent: 'Castilian' }
    ],
    'es-MX': [
        { id: 'es-MX-1', name: 'Dalia', gender: 'female', country: 'MX', accent: 'Mexican' },
        { id: 'es-MX-2', name: 'Jorge', gender: 'male', country: 'MX', accent: 'Mexican' },
        { id: 'es-MX-3', name: 'Larissa', gender: 'female', country: 'MX', accent: 'Mexican' }
    ],
    'fr-FR': [
        { id: 'fr-FR-1', name: 'Denise', gender: 'female', country: 'FR', accent: 'Parisian' },
        { id: 'fr-FR-2', name: 'Henri', gender: 'male', country: 'FR', accent: 'Parisian' },
        { id: 'fr-FR-3', name: 'Jacqueline', gender: 'female', country: 'FR', accent: 'Parisian' }
    ],
    'de-DE': [
        { id: 'de-DE-1', name: 'Amala', gender: 'female', country: 'DE', accent: 'Standard German' },
        { id: 'de-DE-2', name: 'Conrad', gender: 'male', country: 'DE', accent: 'Standard German' },
        { id: 'de-DE-3', name: 'Katja', gender: 'female', country: 'DE', accent: 'Standard German' }
    ],
    'it-IT': [
        { id: 'it-IT-1', name: 'Elsa', gender: 'female', country: 'IT', accent: 'Standard Italian' },
        { id: 'it-IT-2', name: 'Isabella', gender: 'female', country: 'IT', accent: 'Standard Italian' },
        { id: 'it-IT-3', name: 'Diego', gender: 'male', country: 'IT', accent: 'Standard Italian' }
    ],
    'pt-BR': [
        { id: 'pt-BR-1', name: 'Francisca', gender: 'female', country: 'BR', accent: 'Brazilian' },
        { id: 'pt-BR-2', name: 'Antonio', gender: 'male', country: 'BR', accent: 'Brazilian' },
        { id: 'pt-BR-3', name: 'Brenda', gender: 'female', country: 'BR', accent: 'Brazilian' }
    ],
    'ru-RU': [
        { id: 'ru-RU-1', name: 'Svetlana', gender: 'female', country: 'RU', accent: 'Moscow' },
        { id: 'ru-RU-2', name: 'Dmitry', gender: 'male', country: 'RU', accent: 'Moscow' }
    ],
    'ja-JP': [
        { id: 'ja-JP-1', name: 'Ayumi', gender: 'female', country: 'JP', accent: 'Tokyo' },
        { id: 'ja-JP-2', name: 'Ichiro', gender: 'male', country: 'JP', accent: 'Tokyo' },
        { id: 'ja-JP-3', name: 'Kei', gender: 'male', country: 'JP', accent: 'Tokyo' }
    ],
    'ko-KR': [
        { id: 'ko-KR-1', name: 'Sun-Hi', gender: 'female', country: 'KR', accent: 'Seoul' },
        { id: 'ko-KR-2', name: 'InJoon', gender: 'male', country: 'KR', accent: 'Seoul' }
    ],
    'zh-CN': [
        { id: 'zh-CN-1', name: 'Xiaoxiao', gender: 'female', country: 'CN', accent: 'Mandarin' },
        { id: 'zh-CN-2', name: 'Yunxi', gender: 'male', country: 'CN', accent: 'Mandarin' },
        { id: 'zh-CN-3', name: 'Xiaoyi', gender: 'female', country: 'CN', accent: 'Mandarin' }
    ],
    'ar-SA': [
        { id: 'ar-SA-1', name: 'Zariyah', gender: 'female', country: 'SA', accent: 'Saudi' },
        { id: 'ar-SA-2', name: 'Hamed', gender: 'male', country: 'SA', accent: 'Saudi' }
    ],
    'hi-IN': [
        { id: 'hi-IN-1', name: 'Swara', gender: 'female', country: 'IN', accent: 'Hindi' },
        { id: 'hi-IN-2', name: 'Madhur', gender: 'male', country: 'IN', accent: 'Hindi' }
    ]
    // Add more languages as needed...
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadVoicesForLanguage();
});

function initializeApp() {
    // Set initial values
    updateCharacterCount();
    updateSliderValues();

    // Load saved preferences
    loadPreferences();

    // Apply initial theme
    applyTheme();
}

function setupEventListeners() {
    // Header controls
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.uiLanguage.addEventListener('change', handleUILanguageChange);

    // Sidebar controls
    elements.voiceLanguage.addEventListener('change', loadVoicesForLanguage);
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
    elements.importBtn.addEventListener('click', () => elements.fileInput.click());
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
    savePreferences();
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
function loadVoicesForLanguage() {
    const selectedLanguage = elements.voiceLanguage.value;
    state.currentVoices = VOICE_DATABASE[selectedLanguage] || [];
    state.filteredVoices = [...state.currentVoices];
    state.selectedVoice = null;

    // Reset filters
    resetFilters();

    // Render voices
    renderVoiceList();
    updateButtonStates();
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
                            voice.accent.toLowerCase().includes(searchTerm);

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

    const voicesHTML = state.filteredVoices.map(voice => `
        <div class="voice-item ${state.selectedVoice?.id === voice.id ? 'selected' : ''}"
             data-voice-id="${voice.id}">
            <div class="voice-info">
                <div class="voice-name">${voice.name}</div>
                <div class="voice-details">
                    <span class="voice-gender ${voice.gender}">${voice.gender.charAt(0).toUpperCase() + voice.gender.slice(1)}</span>
                    <span>${voice.country}</span>
                    <span>${voice.accent}</span>
                </div>
            </div>
            <button class="voice-preview" data-voice-id="${voice.id}">
                Preview
            </button>
        </div>
    `).join('');

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
}

function handleVoiceSelection(voiceId) {
    state.selectedVoice = state.filteredVoices.find(v => v.id === voiceId);
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
        'en-US': 'Hello, this is a preview of my voice.',
        'en-GB': 'Hello, this is a preview of my voice.',
        'en-AU': 'Hello, this is a preview of my voice.',
        'vi-VN': 'Xin chào, đây là mẫu giọng nói của tôi.',
        'es-ES': 'Hola, esta es una vista previa de mi voz.',
        'es-MX': 'Hola, esta es una vista previa de mi voz.',
        'fr-FR': 'Bonjour, ceci est un aperçu de ma voix.',
        'de-DE': 'Hallo, das ist eine Vorschau meiner Stimme.',
        'it-IT': 'Ciao, questa è un\'anteprima della mia voce.',
        'pt-BR': 'Olá, esta é uma prévia da minha voz.',
        'ru-RU': 'Привет, это превью моего голоса.',
        'ja-JP': 'こんにちは、これは私の声のプレビューです。',
        'ko-KR': '안녕하세요, 이것은 제 목소리의 미리보기입니다.',
        'zh-CN': '你好，这是我声音的预览。',
        'ar-SA': 'مرحبا، هذه معاينة لصوتي.',
        'hi-IN': 'नमस्ते, यह मेरी आवाज़ का पूर्वावलोकन है।'
    };

    return samples[language] || samples['en-US'];
}

// UI Updates
function updateCharacterCount() {
    const text = elements.textInput.value;
    const charCount = text.length;
    const lineCount = text.split('\n').length;

    elements.charCount.textContent = `${charCount} characters (${lineCount} lines)`;

    // Color coding
    if (charCount > 4000) {
        elements.charCount.style.color = 'var(--error-color)';
    } else if (charCount > 3000) {
        elements.charCount.style.color = 'var(--warning-color)';
    } else {
        elements.charCount.style.color = 'var(--text-muted)';
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

function setGeneratingState(isGenerating) {
    state.isGenerating = isGenerating;

    const buttons = [elements.previewBtn, elements.generateBtn];
    buttons.forEach(btn => {
        const icon = btn.querySelector('i');
        const text = btn.querySelector('.btn-text') || btn.lastChild;

        if (isGenerating) {
            icon.className = 'fas fa-spinner fa-spin';
            if (text.textContent) {
                text.textContent = text.textContent.includes('Preview') ? 'Generating...' : 'Generating...';
            }
        } else {
            icon.className = btn.id === 'preview-btn' ? 'fas fa-play' : 'fas fa-bolt';
            if (text.textContent) {
                text.textContent = btn.id === 'preview-btn' ? 'Preview Audio' : 'Generate Audio';
            }
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
        showMessage('error', error.message || 'Preview failed. Please try again.');
    } finally {
        setGeneratingState(false);
        setTimeout(hideMessage, 3000);
    }
}

async function handleGenerate() {
    const text = elements.textInput.value.trim();
    if (!text || !state.selectedVoice) return;

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
        showMessage('error', error.message || 'Generation failed. Please try again.');
    } finally {
        setGeneratingState(false);
        setTimeout(hideMessage, 3000);
    }
}

async function generateTTS(text, voice, isPreview = false) {
    const language = elements.voiceLanguage.value;
    const speed = parseInt(elements.speedRange.value);
    const pitch = parseInt(elements.pitchRange.value);

    const requestData = {
        text,
        language,
        voice: voice.id,
        voiceName: voice.name,
        gender: voice.gender,
        speed,
        pitch,
        isPreview
    };

    const response = await fetch('/api/tts/generate', {
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

    return await response.json();
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
    // UI language change implementation
    // This would typically update all UI text based on selected language
    console.log('UI Language changed to:', elements.uiLanguage.value);
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
        uiLanguage: elements.uiLanguage.value
    };

    localStorage.setItem('tts-preferences', JSON.stringify(preferences));
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (state.currentAudioUrl) {
        URL.revokeObjectURL(state.currentAudioUrl);
    }

    if (state.currentAudio) {
        state.currentAudio.pause();
    }
});