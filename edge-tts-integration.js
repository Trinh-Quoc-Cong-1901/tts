const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class EdgeTTS {
    constructor() {
        this.defaultVoice = 'en-US-AriaNeural';
        this.availableVoices = null;
    }

    async getVoices() {
        if (this.availableVoices) {
            return this.availableVoices;
        }

        try {
            const voicesOutput = await this.executeCommand(['--list-voices']);

            // Parse table format output
            const lines = voicesOutput.trim().split('\n');
            const voiceList = [];

            // Skip header and separator lines
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    // Split by multiple spaces (table columns)
                    const parts = line.split(/\s{2,}/);
                    if (parts.length >= 2) {
                        const voiceName = parts[0];
                        const gender = parts[1];

                        // Extract language/locale from voice name (e.g., en-US-AriaNeural -> en-US)
                        const localeMatch = voiceName.match(/^([a-z]{2}-[A-Z]{2})/);
                        const locale = localeMatch ? localeMatch[1] : 'en-US';

                        // Extract friendly name from voice name (e.g., en-US-AriaNeural -> Aria)
                        const nameMatch = voiceName.match(/-([A-Za-z]+)Neural$/);
                        const friendlyName = nameMatch ? nameMatch[1] : voiceName;

                        voiceList.push({
                            id: voiceName,
                            name: friendlyName,
                            language: locale,
                            gender: gender.toLowerCase(),
                            engine: 'edge'
                        });
                    }
                }
            }

            this.availableVoices = voiceList;
            return this.availableVoices;
        } catch (error) {
            console.error('Error getting Edge TTS voices:', error);
            return [];
        }
    }

    async generateSpeech(text, voice = null, speed = 0, pitch = 0) {
        try {
            const selectedVoice = voice || this.defaultVoice;
            const tempFile = path.join(__dirname, 'temp', `edge_${Date.now()}.mp3`);

            // Create temp directory if it doesn't exist
            const tempDir = path.dirname(tempFile);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Build command arguments
            const args = [
                '--voice', selectedVoice,
                '--text', text,
                '--write-media', tempFile
            ];

            // Add rate (speed) adjustment if needed
            if (speed !== 0) {
                const rate = speed > 0 ? `+${speed * 10}%` : `${speed * 10}%`;
                args.push('--rate', rate);
            }

            // Add pitch adjustment if needed
            if (pitch !== 0) {
                const pitchValue = pitch > 0 ? `+${pitch * 5}Hz` : `${pitch * 5}Hz`;
                args.push('--pitch', pitchValue);
            }

            await this.executeCommand(args);

            // Read the generated audio file
            const audioBuffer = fs.readFileSync(tempFile);

            // Clean up temp file
            fs.unlinkSync(tempFile);

            return audioBuffer;
        } catch (error) {
            console.error('Edge TTS generation error:', error);
            throw new Error(`Edge TTS failed: ${error.message}`);
        }
    }

    executeCommand(args) {
        return new Promise((resolve, reject) => {
            const process = spawn('edge-tts', args);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Edge TTS command failed: ${stderr || 'Unknown error'}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to start Edge TTS: ${error.message}`));
            });
        });
    }

    // Get voices for a specific language
    async getVoicesForLanguage(languageCode) {
        const allVoices = await this.getVoices();
        return allVoices.filter(voice =>
            voice.language.toLowerCase().startsWith(languageCode.toLowerCase())
        );
    }

    // Find best voice for language and gender
    async findBestVoice(languageCode, gender = null) {
        const voices = await this.getVoicesForLanguage(languageCode);

        if (voices.length === 0) {
            return this.defaultVoice;
        }

        if (gender) {
            const genderVoices = voices.filter(voice =>
                voice.gender.toLowerCase() === gender.toLowerCase()
            );
            if (genderVoices.length > 0) {
                return genderVoices[0].id;
            }
        }

        return voices[0].id;
    }
}

module.exports = EdgeTTS;