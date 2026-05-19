// Firebase Analytics Implementation
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbEM0gdXVAFHzSsaj2yPH5FMcsbsx_JEQ",
  authDomain: "text-to-speech-8c9e6.firebaseapp.com",
  projectId: "text-to-speech-8c9e6",
  storageBucket: "text-to-speech-8c9e6.firebasestorage.app",
  messagingSenderId: "864534399411",
  appId: "1:864534399411:web:b4e947ce549bfc557823c6",
  measurementId: "G-800NX1P8LV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;

// Initialize Analytics (only in browser environment)
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    console.log('🔥 Firebase Analytics initialized');
  }
} catch (error) {
  console.warn('Firebase Analytics not available:', error.message);
}

// Analytics Helper Functions
export const trackEvent = (eventName, parameters = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, parameters);
    console.log(`📊 Analytics Event: ${eventName}`, parameters);
  }
};

// Specific tracking functions for TTS app
export const trackPageView = (pageName, language) => {
  trackEvent('page_view', {
    page_title: pageName,
    page_language: language,
    page_location: window.location.href
  });
};

export const trackVoiceGeneration = (language, voiceName, gender, textLength) => {
  trackEvent('voice_generation', {
    voice_language: language,
    voice_name: voiceName,
    voice_gender: gender,
    text_length: textLength,
    generation_type: 'full'
  });
};

export const trackVoicePreview = (language, voiceName, gender) => {
  trackEvent('voice_preview', {
    voice_language: language,
    voice_name: voiceName,
    voice_gender: gender,
    generation_type: 'preview'
  });
};

export const trackAudioDownload = (format, voiceName, language) => {
  trackEvent('audio_download', {
    file_format: format,
    voice_name: voiceName,
    voice_language: language
  });
};

export const trackLanguageSwitch = (fromLanguage, toLanguage) => {
  trackEvent('language_switch', {
    from_language: fromLanguage,
    to_language: toLanguage
  });
};

export const trackThemeToggle = (newTheme) => {
  trackEvent('theme_toggle', {
    theme: newTheme
  });
};

export const trackFileImport = (fileSize, fileType) => {
  trackEvent('file_import', {
    file_size: fileSize,
    file_type: fileType
  });
};

export const trackVoiceSearch = (searchTerm, resultsCount) => {
  trackEvent('voice_search', {
    search_term: searchTerm,
    results_count: resultsCount
  });
};

export const trackMobileMenuToggle = (action) => {
  trackEvent('mobile_menu_toggle', {
    action: action // 'open' or 'close'
  });
};

export default {
  trackEvent,
  trackPageView,
  trackVoiceGeneration,
  trackVoicePreview,
  trackAudioDownload,
  trackLanguageSwitch,
  trackThemeToggle,
  trackFileImport,
  trackVoiceSearch,
  trackMobileMenuToggle
};