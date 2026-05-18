// Global variables
let currentAudioBlob = null;
let currentAudioUrl = null;
let currentFileName = null;

// DOM elements
const textInput = document.getElementById('text-input');
const charCount = document.getElementById('char-count');
// Removed tts-engine selector
const voiceSelect = document.getElementById('voice-select');
const speedRange = document.getElementById('speed-range');
const speedValue = document.getElementById('speed-value');
const generateBtn = document.getElementById('generate-btn');
const resultSection = document.getElementById('result-section');
const audioPlayer = document.getElementById('audio-player');
const downloadBtn = document.getElementById('download-btn');

// Voice options
const voiceOptions = [
    { value: 'vi', label: 'Tiếng Việt (Vietnamese)', lang: 'vi' },
    { value: 'en', label: 'English (Tiếng Anh)', lang: 'en' }
];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    updateCharCount();
    updateVoiceOptions();
    checkBrowserSupport();

    // Event listeners
    textInput.addEventListener('input', updateCharCount);
    textInput.addEventListener('input', toggleGenerateButton);
    speedRange.addEventListener('input', updateSpeedValue);
    generateBtn.addEventListener('click', generateSpeech);
    downloadBtn.addEventListener('click', downloadAudio);
});

// Update character count
function updateCharCount() {
    const count = textInput.value.length;
    charCount.textContent = count;

    if (count > 4000) {
        charCount.style.color = '#e53e3e';
    } else if (count > 3000) {
        charCount.style.color = '#dd6b20';
    } else {
        charCount.style.color = '#718096';
    }
}

// Toggle generate button state
function toggleGenerateButton() {
    const hasText = textInput.value.trim().length > 0;
    generateBtn.disabled = !hasText;
}

// Update voice options
function updateVoiceOptions() {
    voiceSelect.innerHTML = '';
    voiceOptions.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.value;
        option.textContent = voice.label;
        option.dataset.lang = voice.lang;
        voiceSelect.appendChild(option);
    });
}

// Update speed value display
function updateSpeedValue() {
    speedValue.textContent = speedRange.value + 'x';
}

// Check browser support for Google TTS
function checkBrowserSupport() {
    if (!('speechSynthesis' in window)) {
        console.warn('Browser does not support Web Speech API');
        // Force Edge TTS as default if Google TTS not supported
        ttsEngine.value = 'edge';
        ttsEngine.disabled = true;
    }
}

// Main speech generation function
async function generateSpeech() {
    const text = textInput.value.trim();

    if (!text) {
        alert('Vui lòng nhập văn bản cần chuyển đổi!');
        return;
    }

    if (text.length > 5000) {
        alert('Văn bản quá dài! Vui lòng giữ dưới 5000 ký tự.');
        return;
    }

    // Show loading state
    setLoadingState(true);
    hideResult();

    try {
        await generateServerTTS(text);
    } catch (error) {
        console.error('Error generating speech:', error);
        alert('Có lỗi xảy ra khi tạo giọng nói. Vui lòng thử lại!');
    } finally {
        setLoadingState(false);
    }
}

// Server-side TTS using node-gtts (generates real MP3 files)
async function generateServerTTS(text) {
    const selectedVoice = voiceSelect.value;
    const speed = parseFloat(speedRange.value);

    const requestData = {
        text: text,
        voice: selectedVoice,
        rate: speed
    };

    const response = await fetch('/api/google-tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate speech');
    }

    const result = await response.json();

    // Convert base64 to blob
    const binaryString = atob(result.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });

    // Store filename for download
    currentFileName = result.filename || `tts_audio_${Date.now()}.mp3`;

    displayAudioResult(audioBlob, 'Google TTS MP3 Audio');
}

// Removed old functions - now using server-side TTS only

// Display audio result
function displayAudioResult(audioBlob, title) {
    // Clean up previous audio
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
    }

    // Store current audio
    currentAudioBlob = audioBlob;
    currentAudioUrl = URL.createObjectURL(audioBlob);

    // Clean up any custom controls
    const existingControls = document.querySelector('.google-tts-controls');
    if (existingControls) {
        existingControls.remove();
    }

    // Show default audio player
    audioPlayer.style.display = 'block';
    audioPlayer.src = currentAudioUrl;
    audioPlayer.load();

    // Update download button text
    downloadBtn.innerHTML = '📥 Tải xuống file MP3';

    // Show result section
    showResult();

    // Auto play
    audioPlayer.play().catch(error => {
        console.warn('Autoplay prevented:', error);
    });
}

// Show/hide result section
function showResult() {
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() {
    resultSection.style.display = 'none';
}

// Set loading state
function setLoadingState(isLoading) {
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoading = generateBtn.querySelector('.btn-loading');

    if (isLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        generateBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        generateBtn.disabled = textInput.value.trim().length === 0;
    }
}

// Download audio file
function downloadAudio() {
    if (!currentAudioBlob) {
        alert('⚠️ Chưa có file để tải xuống!\n\nHãy tạo giọng nói trước khi tải về.');
        return;
    }

    // Use stored filename or create default
    const filename = currentFileName || `tts_audio_${Date.now()}.mp3`;

    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show confirmation
    alert(`✅ Đã tải xuống file MP3 thành công!\n\nFile: ${filename}`);
}

// Load voices when available (for Google TTS)
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = function() {
        // Voices loaded, could update Google voice options here if needed
    };
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
    }
});