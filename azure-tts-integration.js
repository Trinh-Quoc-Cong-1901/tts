// Azure Text-to-Speech Integration
const axios = require('axios');

class AzureTTS {
    constructor(subscriptionKey, region = 'eastus') {
        this.subscriptionKey = subscriptionKey;
        this.region = region;
        this.tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;
        this.ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        const now = new Date();

        // Check if token is still valid (tokens expire after 10 minutes)
        if (this.accessToken && this.tokenExpiry && now < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post(this.tokenUrl, null, {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                }
            });

            this.accessToken = response.data;
            this.tokenExpiry = new Date(now.getTime() + 9 * 60 * 1000); // 9 minutes from now

            return this.accessToken;
        } catch (error) {
            throw new Error(`Failed to get Azure access token: ${error.message}`);
        }
    }

    async generateSpeech(text, voiceId, speed = 0, pitch = 0) {
        const token = await this.getAccessToken();

        // Convert speed and pitch to SSML format
        const speedValue = speed >= 0 ? `+${speed}%` : `${speed}%`;
        const pitchValue = pitch >= 0 ? `+${pitch}%` : `${pitch}%`;

        // Extract language code from voiceId (e.g., "vi-VN-HoaiMyNeural" -> "vi-VN")
        const languageMatch = voiceId.match(/^([a-z]{2}-[A-Z]{2})/);
        const xmlLang = languageMatch ? languageMatch[1] : 'en-US';

        const ssml = `
            <speak version='1.0' xml:lang='${xmlLang}'>
                <voice name='${voiceId}'>
                    <prosody rate='${speedValue}' pitch='${pitchValue}'>
                        ${text}
                    </prosody>
                </voice>
            </speak>`;

        try {
            const response = await axios.post(this.ttsUrl, ssml, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
                },
                responseType: 'arraybuffer'
            });

            return Buffer.from(response.data);
        } catch (error) {
            throw new Error(`Failed to generate speech: ${error.message}`);
        }
    }

    async getAvailableVoices() {
        const token = await this.getAccessToken();
        const voicesUrl = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;

        try {
            const response = await axios.get(voicesUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get voices: ${error.message}`);
        }
    }
}

module.exports = AzureTTS;