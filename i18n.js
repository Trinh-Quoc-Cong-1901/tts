// International Language System for TTS
class I18nManager {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
        this.supportedLanguages = {
            'en': { name: 'English', flag: '🇺🇸', dir: 'ltr' },
            'vi': { name: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
            'ko': { name: '한국어', flag: '🇰🇷', dir: 'ltr' },
            'es': { name: 'Español', flag: '🇪🇸', dir: 'ltr' },
            'fr': { name: 'Français', flag: '🇫🇷', dir: 'ltr' },
            'de': { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
            'ja': { name: '日本語', flag: '🇯🇵', dir: 'ltr' },
            'zh': { name: '中文', flag: '🇨🇳', dir: 'ltr' },
            'ar': { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
            'hi': { name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
            'ru': { name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
            'pt': { name: 'Português', flag: '🇧🇷', dir: 'ltr' }
        };
    }

    detectLanguage() {
        // 1. Check URL path (/en/, /vi/, etc.)
        const pathLang = window.location.pathname.split('/')[1];
        if (this.isValidLanguage(pathLang)) return pathLang;

        // 2. Check localStorage
        const savedLang = localStorage.getItem('tts-language');
        if (this.isValidLanguage(savedLang)) return savedLang;

        // 3. Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (this.isValidLanguage(browserLang)) return browserLang;

        // 4. Default to English
        return 'en';
    }

    isValidLanguage(lang) {
        return lang && this.supportedLanguages[lang];
    }

    async loadTranslation(lang) {
        if (this.translations[lang]) return this.translations[lang];

        try {
            const response = await fetch(`/text-to-speech/${lang}.json`);
            if (!response.ok) throw new Error(`Language file not found: ${lang}`);

            this.translations[lang] = await response.json();
            return this.translations[lang];
        } catch (error) {
            console.warn(`Failed to load ${lang}.json, falling back to English:`, error);

            // Fallback to English
            if (lang !== 'en') {
                const enResponse = await fetch('/text-to-speech/en.json');
                this.translations[lang] = await enResponse.json();
            }
            return this.translations[lang];
        }
    }

    async setLanguage(lang) {
        if (!this.isValidLanguage(lang)) return false;

        this.currentLanguage = lang;
        localStorage.setItem('tts-language', lang);

        // Load translation
        const translation = await this.loadTranslation(lang);

        // Update page content
        this.renderContent(translation);
        this.updateSEO(translation.seo);
        this.updateURL(lang);

        return true;
    }

    updateURL(lang) {
        const currentPath = window.location.pathname;
        const newPath = lang === 'en' ? '/' : `/${lang}/`;

        // Update URL without reload
        window.history.replaceState({}, '', newPath + window.location.search);
    }

    updateSEO(seo) {
        // Update page title
        document.title = seo.title;

        // Update meta tags
        this.updateMetaTag('description', seo.description);
        this.updateMetaTag('og:title', seo.ogTitle);
        this.updateMetaTag('og:description', seo.ogDescription);

        // Update hreflang
        this.updateHreflang();
    }

    updateMetaTag(property, content) {
        let meta = document.querySelector(`meta[name="${property}"]`) ||
                  document.querySelector(`meta[property="${property}"]`);

        if (!meta) {
            meta = document.createElement('meta');
            if (property.startsWith('og:')) {
                meta.setAttribute('property', property);
            } else {
                meta.setAttribute('name', property);
            }
            document.head.appendChild(meta);
        }

        meta.setAttribute('content', content);
    }

    updateHreflang() {
        // Remove existing hreflang links
        document.querySelectorAll('link[hreflang]').forEach(link => link.remove());

        // Add new hreflang links
        Object.keys(this.supportedLanguages).forEach(lang => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = lang;
            link.href = lang === 'en' ?
                window.location.origin + '/' :
                window.location.origin + `/${lang}/`;
            document.head.appendChild(link);
        });
    }

    renderContent(translation) {
        // Update main heading
        const h1 = document.querySelector('h1');
        if (h1 && translation.content.form.h1) {
            h1.textContent = translation.content.form.h1;
        }

        // Update placeholder
        const textInput = document.getElementById('text-input');
        if (textInput && translation.content.form.placeholder) {
            textInput.placeholder = translation.content.form.placeholder;
        }

        // Update button text
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn && translation.content.form.button) {
            const btnText = generateBtn.querySelector('.btn-text') || generateBtn.lastChild;
            if (btnText.textContent) {
                btnText.textContent = translation.content.form.button;
            }
        }

        // Render SEO content sections
        this.renderSEOContent(translation.content.sections);
    }

    renderSEOContent(sections) {
        // Find or create SEO content container
        let seoContainer = document.getElementById('seo-content');
        if (!seoContainer) {
            seoContainer = document.createElement('div');
            seoContainer.id = 'seo-content';
            seoContainer.className = 'seo-content';

            // Insert after main content
            const mainContent = document.querySelector('.main-content') || document.querySelector('main');
            if (mainContent && mainContent.parentNode) {
                mainContent.parentNode.insertBefore(seoContainer, mainContent.nextSibling);
            }
        }

        // Generate HTML for sections
        const seoHTML = this.generateSEOHTML(sections);
        seoContainer.innerHTML = seoHTML;
    }

    generateSEOHTML(sections) {
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

    createLanguageSelector() {
        const selector = document.createElement('div');
        selector.className = 'language-selector';
        selector.innerHTML = `
            <select id="language-select" class="language-select">
                ${Object.entries(this.supportedLanguages).map(([code, info]) =>
                    `<option value="${code}" ${code === this.currentLanguage ? 'selected' : ''}>
                        ${info.flag} ${info.name}
                    </option>`
                ).join('')}
            </select>
        `;

        // Add event listener
        selector.querySelector('#language-select').addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        return selector;
    }

    async init() {
        // Load current language translation
        const translation = await this.loadTranslation(this.currentLanguage);

        // Render content
        this.renderContent(translation);
        this.updateSEO(translation.seo);

        // Add language selector to header
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            const languageSelector = this.createLanguageSelector();
            headerControls.appendChild(languageSelector);
        }

        // Remove noindex tags for SEO
        this.removeNoIndexTags();

        console.log(`🌐 I18n initialized for: ${this.currentLanguage}`);
        return translation;
    }

    removeNoIndexTags() {
        // Remove noindex meta tags
        const noindexMetas = document.querySelectorAll('meta[content*="noindex"], meta[content*="nofollow"]');
        noindexMetas.forEach(meta => meta.remove());

        // Add proper SEO meta tags
        this.updateMetaTag('robots', 'index, follow');
        this.updateMetaTag('googlebot', 'index, follow');
    }
}

// Initialize global I18n manager
window.i18nManager = new I18nManager();

// Auto-initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.i18nManager.init();
});