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

// Voice cache to avoid repeated API calls
const VOICE_CACHE = {};

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
async function loadVoicesForLanguage() {
    const selectedLanguage = elements.voiceLanguage.value;

    // Show loading state
    elements.voiceList.innerHTML = `
        <div class="voice-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading voices...</span>
        </div>
    `;

    try {
        // Check cache first
        if (VOICE_CACHE[selectedLanguage]) {
            state.currentVoices = VOICE_CACHE[selectedLanguage];
        } else {
            // Fetch voices from server API
            const response = await fetch(`/api/voices/${selectedLanguage}`);
            const data = await response.json();

            if (data.success) {
                state.currentVoices = data.voices || [];
                // Cache the result
                VOICE_CACHE[selectedLanguage] = state.currentVoices;
            } else {
                throw new Error(data.message || 'Failed to load voices');
            }
        }

        state.filteredVoices = [...state.currentVoices];
        state.selectedVoice = null;

        // Reset filters
        resetFilters();

        // Render voices
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