# 📖 Usage Examples

## Frontend Integration

### Basic Integration
```html
<!DOCTYPE html>
<html>
<head>
    <title>TTS Integration</title>
</head>
<body>
    <textarea id="textInput" placeholder="Enter your text..."></textarea>
    <button onclick="generateSpeech()">Generate Speech</button>
    <audio id="audioPlayer" controls style="display: none;"></audio>

    <script>
        async function generateSpeech() {
            const text = document.getElementById('textInput').value;
            const isLongText = text.length > 5000;
            
            const response = await fetch(`/api/tts/${isLongText ? 'generate-long' : 'generate'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    language: 'en-US',
                    voice: 'en-US-AriaNeural',
                    voiceName: 'Aria',
                    gender: 'female'
                })
            });

            if (response.ok) {
                const result = await response.json();
                const audioPlayer = document.getElementById('audioPlayer');
                audioPlayer.src = `data:audio/mpeg;base64,${result.audio}`;
                audioPlayer.style.display = 'block';
                audioPlayer.play();

                if (result.processing) {
                    console.log(`Processed ${result.processing.chunksUsed} chunks`);
                }
            }
        }
    </script>
</body>
</html>
```

## Node.js Backend Integration

### Express.js Middleware
```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// TTS Proxy with automatic endpoint selection
app.post('/api/proxy-tts', async (req, res) => {
    const { text, ...options } = req.body;
    
    try {
        const endpoint = text.length > 5000 ? 'generate-long' : 'generate';
        
        const response = await fetch(`http://localhost:3000/api/tts/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, ...options })
        });

        const result = await response.json();
        
        if (result.success) {
            // Log processing info for long texts
            if (result.processing) {
                console.log(`TTS: ${result.processing.originalLength} chars → ${result.processing.chunksUsed} chunks`);
            }
            
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
```

### File-based Processing
```javascript
const fs = require('fs');
const fetch = require('node-fetch');

async function convertFileToSpeech(inputFile, outputFile) {
    const text = fs.readFileSync(inputFile, 'utf8');
    
    console.log(`Processing ${text.length} characters from ${inputFile}`);
    
    const endpoint = text.length > 5000 ? 'generate-long' : 'generate';
    
    const response = await fetch(`http://localhost:3000/api/tts/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: text,
            language: 'en-US',
            voice: 'en-US-AriaNeural',
            voiceName: 'Aria',
            gender: 'female'
        })
    });

    if (response.ok) {
        const result = await response.json();
        const audioBuffer = Buffer.from(result.audio, 'base64');
        fs.writeFileSync(outputFile, audioBuffer);
        
        console.log(`✅ Audio saved to ${outputFile}`);
        
        if (result.processing) {
            console.log(`📊 Processing stats:`, result.processing);
        }
        
        return result;
    } else {
        throw new Error(`TTS failed: ${response.statusText}`);
    }
}

// Usage
convertFileToSpeech('long-article.txt', 'article.mp3')
    .then(() => console.log('Conversion completed!'))
    .catch(console.error);
```

## React Component

### TTS React Hook
```jsx
import React, { useState, useCallback } from 'react';

const useTTS = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [processingInfo, setProcessingInfo] = useState(null);

    const generateSpeech = useCallback(async (text, options = {}) => {
        setIsGenerating(true);
        setProcessingInfo(null);

        try {
            const isLongText = text.length > 5000;
            const endpoint = `/api/tts/${isLongText ? 'generate-long' : 'generate'}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    language: 'en-US',
                    voice: 'en-US-AriaNeural',
                    voiceName: 'Aria',
                    gender: 'female',
                    ...options
                })
            });

            if (response.ok) {
                const result = await response.json();
                const blob = new Blob(
                    [Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))],
                    { type: 'audio/mpeg' }
                );
                
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                if (result.processing) {
                    setProcessingInfo(result.processing);
                }

                return result;
            } else {
                throw new Error('TTS generation failed');
            }
        } catch (error) {
            console.error('TTS Error:', error);
            throw error;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const clearAudio = useCallback(() => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setProcessingInfo(null);
    }, [audioUrl]);

    return {
        generateSpeech,
        clearAudio,
        isGenerating,
        audioUrl,
        processingInfo
    };
};

// TTS Component
const TTSComponent = () => {
    const [text, setText] = useState('');
    const { generateSpeech, clearAudio, isGenerating, audioUrl, processingInfo } = useTTS();

    const handleGenerate = () => {
        generateSpeech(text).catch(console.error);
    };

    return (
        <div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                rows={6}
                cols={50}
            />
            
            <div>
                {text.length > 5000 && (
                    <p>Long text detected: Will be split into ~{Math.ceil(text.length / 4500)} chunks</p>
                )}
            </div>

            <button onClick={handleGenerate} disabled={isGenerating || !text.trim()}>
                {isGenerating ? 'Generating...' : 'Generate Speech'}
            </button>

            {processingInfo && (
                <div>
                    <h3>Processing Info:</h3>
                    <p>Chunks: {processingInfo.chunksUsed}</p>
                    <p>Methods: {processingInfo.chunkingMethods.join(', ')}</p>
                    <p>Final size: {(processingInfo.finalAudioSize / 1024 / 1024).toFixed(1)}MB</p>
                </div>
            )}

            {audioUrl && (
                <div>
                    <audio controls src={audioUrl} />
                    <button onClick={clearAudio}>Clear Audio</button>
                </div>
            )}
        </div>
    );
};

export default TTSComponent;
```

## Python Integration

### Simple Python Client
```python
import requests
import base64
import json
from pathlib import Path

class TTSClient:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url

    def generate_speech(self, text, language="en-US", voice="en-US-AriaNeural", 
                       voice_name="Aria", gender="female", speed=0, pitch=0):
        """Generate speech from text with automatic endpoint selection."""
        
        # Choose endpoint based on text length
        endpoint = "generate-long" if len(text) > 5000 else "generate"
        url = f"{self.base_url}/api/tts/{endpoint}"
        
        payload = {
            "text": text,
            "language": language,
            "voice": voice,
            "voiceName": voice_name,
            "gender": gender,
            "speed": speed,
            "pitch": pitch
        }
        
        print(f"Processing {len(text):,} characters using {endpoint} endpoint...")
        
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get("processing"):
                proc = result["processing"]
                print(f"✅ Processed {proc['chunksUsed']} chunks")
                print(f"📊 Methods: {', '.join(proc['chunkingMethods'])}")
                print(f"💾 Final size: {proc['finalAudioSize'] / 1024 / 1024:.1f}MB")
            
            return result
        else:
            error = response.json() if response.headers.get("content-type") == "application/json" else {"message": response.text}
            raise Exception(f"TTS failed: {error.get('message', 'Unknown error')}")

    def save_audio(self, result, output_path):
        """Save audio result to file."""
        audio_data = base64.b64decode(result["audio"])
        
        Path(output_path).write_bytes(audio_data)
        print(f"🎵 Audio saved to {output_path}")
        
        return output_path

    def text_file_to_speech(self, input_file, output_file, **options):
        """Convert text file to speech file."""
        text = Path(input_file).read_text(encoding="utf-8")
        result = self.generate_speech(text, **options)
        return self.save_audio(result, output_file)

# Usage examples
if __name__ == "__main__":
    client = TTSClient()

    # Short text
    result = client.generate_speech("Hello, this is a test!")
    client.save_audio(result, "short_test.mp3")

    # Long text from file
    client.text_file_to_speech(
        "long_article.txt", 
        "article.mp3",
        language="vi-VN",
        voice="vi-VN-HoaiMyNeural",
        voice_name="HoaiMy",
        gender="female"
    )

    # With custom settings
    result = client.generate_speech(
        "This is a test with custom speed and pitch.",
        speed=20,  # 20% faster
        pitch=10   # 10% higher pitch
    )
    client.save_audio(result, "custom_settings.mp3")
```

## Advanced Use Cases

### Batch Processing
```javascript
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function batchProcessTexts(inputDir, outputDir) {
    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
    
    for (const file of files) {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file.replace('.txt', '.mp3'));
        
        const text = fs.readFileSync(inputPath, 'utf8');
        const endpoint = text.length > 5000 ? 'generate-long' : 'generate';
        
        console.log(`Processing ${file} (${text.length} chars)...`);
        
        try {
            const response = await fetch(`http://localhost:3000/api/tts/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    language: 'en-US',
                    voice: 'en-US-AriaNeural',
                    voiceName: 'Aria',
                    gender: 'female'
                })
            });

            if (response.ok) {
                const result = await response.json();
                const audioBuffer = Buffer.from(result.audio, 'base64');
                fs.writeFileSync(outputPath, audioBuffer);
                
                console.log(`✅ ${file} → ${path.basename(outputPath)}`);
            } else {
                console.error(`❌ Failed to process ${file}`);
            }

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    }
}

// Usage
batchProcessTexts('./input_texts', './output_audio');
```

### Streaming Integration (Conceptual)
```javascript
// Future enhancement: streaming audio chunks as they're processed
class TTSStream {
    constructor(options = {}) {
        this.options = options;
        this.chunks = [];
    }

    async processWithCallback(text, onChunkComplete) {
        // This would be implemented as a streaming version
        // of the long text endpoint in a future version
        
        const response = await fetch('/api/tts/generate-long-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, ...this.options })
        });

        const reader = response.body.getReader();
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            // Parse chunk data
            const chunkData = JSON.parse(new TextDecoder().decode(value));
            
            if (chunkData.type === 'chunk_complete') {
                onChunkComplete(chunkData.audio, chunkData.index);
            }
        }
    }
}
```

---

## Integration Tips

### 🎯 **Performance Optimization**
- Cache voice lists to reduce API calls
- Implement client-side text preprocessing
- Use appropriate endpoints for text length
- Handle rate limiting gracefully

### 🛡️ **Error Handling**
```javascript
async function robustTTS(text, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await generateSpeech(text);
            return result;
        } catch (error) {
            if (error.status === 429) {
                // Rate limited - exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (attempt === maxRetries) {
                throw error;
            }
        }
    }
}
```

### 🔧 **Text Preprocessing**
```javascript
function optimizeTextForTTS(text) {
    return text
        .replace(/\s+/g, ' ')           // Normalize whitespace
        .replace(/([.!?])\s*/g, '$1 ')  // Ensure space after punctuation
        .trim();
}
```

---

*For more details, see [API Documentation](API_DOCUMENTATION.md) and [README](README.md).*