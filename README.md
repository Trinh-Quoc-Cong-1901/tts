# 🎙️ Text-to-Speech Application

A powerful, multilingual text-to-speech web application with **unlimited text length support** through intelligent chunking and audio merging.

## ✨ Features

### 🚀 **NEW: Unlimited Text Length**
- Process texts of **any length** (previously limited to 5,000 characters)
- Intelligent text chunking at natural break points (sentences, paragraphs)
- Automatic audio merging using FFmpeg
- Real-time progress tracking for long texts

### 🌍 **Multi-language Support**
- **Azure Text-to-Speech** integration with premium voices
- **Google TTS** fallback for reliability
- Support for 12+ languages: English, Vietnamese, Korean, Spanish, French, German, Japanese, Chinese, Arabic, Hindi, Russian, Portuguese
- 100+ high-quality voices

### 🎛️ **Advanced Controls**
- Adjustable speech **speed** (-50% to +100%)
- Adjustable **pitch** (-50% to +50%)
- Voice preview functionality
- Gender and language filtering

### 🌐 **SEO & Accessibility**
- Multi-language SEO content
- Responsive design for mobile/desktop
- Dark/light theme support
- Keyboard shortcuts

## 🏗️ Architecture

### **Smart Text Processing**
```
User Input → Text Analysis → Chunking Decision
                              ↓
Short Text (≤5000 chars) → Regular TTS API → MP3 Output
                              ↓
Long Text (>5000 chars) → Text Chunker → Multiple Audio Chunks → FFmpeg Merger → Final MP3
```

### **Chunking Algorithm**
1. **Sentence boundaries** (best quality)
2. **Punctuation marks** (good quality)
3. **Paragraph breaks**
4. **Word boundaries** (fallback)

## 📊 Performance

- **Short texts**: 2-3 seconds processing
- **Medium texts (3k chars)**: ~10 seconds  
- **Long texts (15k chars)**: ~50 seconds, 4 chunks
- **Concurrent support**: Rate limited for stability
- **Memory efficient**: Automatic cleanup of temp files

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Azure Speech Services subscription (optional, falls back to Google TTS)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd text-to-speech

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Azure credentials (optional)

# Start development server
npm run dev
```

### Environment Variables

```env
# Azure TTS (optional - premium voices)
AZURE_TTS_SUBSCRIPTION_KEY=your_azure_key
AZURE_TTS_REGION=eastus
USE_AZURE_TTS=true

# Server configuration
PORT=3000
```

## 📖 API Reference

### Regular Text Processing
**Endpoint:** `POST /api/tts/generate`

**Payload:**
```json
{
  "text": "Your text here (max 5,000 chars)",
  "language": "vi-VN",
  "voice": "vi-VN-HoaiMyNeural",
  "voiceName": "HoaiMy",
  "gender": "female",
  "speed": 0,
  "pitch": 0,
  "isPreview": false
}
```

### Long Text Processing
**Endpoint:** `POST /api/tts/generate-long`

**Features:**
- Unlimited text length
- Automatic chunking
- Progress tracking
- Audio merging

**Response includes processing info:**
```json
{
  "success": true,
  "audio": "base64_encoded_mp3",
  "processing": {
    "originalLength": 15000,
    "chunksUsed": 4,
    "chunkingMethods": ["sentence_end", "sentence_end", "sentence_end", "last_chunk"],
    "finalAudioSize": 14500000
  }
}
```

## 🛠️ Technical Details

### Dependencies
- **Express.js** - Web framework
- **Azure Cognitive Services** - Premium TTS
- **Google TTS (node-gtts)** - Fallback TTS
- **FFmpeg** - Audio processing and merging
- **Fluent-ffmpeg** - FFmpeg wrapper

### File Structure
```
├── server.js              # Main server
├── script.js              # Frontend JavaScript
├── index.html              # Main HTML template
├── text-chunker.js         # Smart text chunking
├── audio-merger.js         # FFmpeg audio merging
├── azure-tts-integration.js # Azure TTS client
├── styles.css              # UI styling
└── temp/                   # Temporary audio files
```

### Rate Limiting
- **Regular endpoint**: 20 requests/minute
- **Long text endpoint**: 5 requests/minute
- **Automatic cleanup**: Every 30 minutes

## 🔧 Advanced Usage

### Custom Chunking
```javascript
const TextChunker = require('./text-chunker');
const chunker = new TextChunker(4500); // Custom chunk size

const chunks = chunker.chunkText(longText);
console.log(`Split into ${chunks.length} chunks`);
```

### Audio Merging
```javascript
const AudioMerger = require('./audio-merger');
const merger = new AudioMerger();

const audioChunks = [
  { buffer: audioBuffer1, index: 0 },
  { buffer: audioBuffer2, index: 1 }
];

const finalAudio = await merger.mergeAudioBuffers(audioChunks);
```

## 📈 Monitoring & Analytics

- **Firebase Analytics** integration
- **Google Analytics** tracking
- Server-side request logging
- Performance metrics collection

## 🌍 Deployment

### Production Setup
```bash
# Build for production
npm start

# Using PM2 (recommended)
pm2 start server.js --name tts-app

# Docker deployment
docker build -t tts-app .
docker run -p 3000:3000 -e AZURE_TTS_SUBSCRIPTION_KEY=your_key tts-app
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 🧪 Testing

### Run Comprehensive Tests
```bash
# Basic functionality tests
node test-comprehensive.js

# Performance and concurrency tests  
node test-performance.js
```

### Test Coverage
- ✅ Text length variations (100 - 50,000+ chars)
- ✅ Multiple languages and special characters
- ✅ Concurrent request handling
- ✅ Memory usage and cleanup
- ✅ Error scenarios and recovery

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **Live Demo**: [text-to-speech.space](https://text-to-speech.space)
- **Azure TTS Documentation**: [Microsoft Docs](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/)
- **Support**: Open an issue on GitHub

---

## 🆕 Recent Updates

### v2.0.0 - Unlimited Text Length Support
- ✨ **NEW**: Process texts of unlimited length
- 🧠 **Intelligent chunking** at sentence boundaries
- 🎵 **Audio merging** using FFmpeg
- 📊 **Progress tracking** for long texts
- ⚡ **Performance optimizations** and rate limiting
- 🧹 **Automatic cleanup** of temporary files

### v1.5.0 - Multi-language SEO
- 🌍 12 language support with SEO content
- 🎨 Dark/light theme toggle
- 📱 Mobile-responsive design

---

**Built with ❤️ for the global community**