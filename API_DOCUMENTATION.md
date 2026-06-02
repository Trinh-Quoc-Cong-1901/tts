# 📚 Text-to-Speech API Documentation

## Overview

This API provides text-to-speech conversion with support for unlimited text length through intelligent chunking and audio merging.

## Base URL
```
http://localhost:3000
```

## Authentication
No authentication required for local usage. For Azure TTS premium voices, configure environment variables.

---

## Endpoints

### 1. Regular Text-to-Speech

**`POST /api/tts/generate`**

Convert text to speech for texts up to 5,000 characters.

#### Request Body
```json
{
  "text": "Your text here",
  "language": "vi-VN",
  "voice": "vi-VN-HoaiMyNeural",
  "voiceName": "HoaiMy",
  "gender": "female",
  "speed": 0,
  "pitch": 0,
  "isPreview": false
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | ✅ | Text to convert (max 5,000 chars) |
| `language` | string | ✅ | Language code (e.g., "vi-VN", "en-US") |
| `voice` | string | ✅ | Voice ID from supported voices |
| `voiceName` | string | ✅ | Display name of the voice |
| `gender` | string | ✅ | Voice gender ("male", "female", "neutral") |
| `speed` | integer | ❌ | Speed adjustment (-50 to 100, default: 0) |
| `pitch` | integer | ❌ | Pitch adjustment (-50 to 50, default: 0) |
| `isPreview` | boolean | ❌ | Preview mode (default: false) |

#### Success Response (200)
```json
{
  "success": true,
  "audio": "base64_encoded_mp3_data",
  "contentType": "audio/mpeg",
  "filename": "tts_HoaiMy_1234567890.mp3",
  "voiceUsed": {
    "id": "vi-VN-HoaiMyNeural",
    "name": "HoaiMy",
    "language": "vi-VN",
    "gender": "female"
  },
  "settings": {
    "speed": 0,
    "pitch": 0,
    "isPreview": false
  },
  "engine": "Azure TTS"
}
```

#### Error Response (400)
```json
{
  "success": false,
  "message": "Text too long for regular processing (7500 characters). Please use the long text processing feature for texts over 5000 characters."
}
```

---

### 2. Long Text Processing

**`POST /api/tts/generate-long`**

Convert unlimited length text to speech using intelligent chunking and audio merging.

#### Request Body
```json
{
  "text": "Very long text content...",
  "language": "vi-VN", 
  "voice": "vi-VN-HoaiMyNeural",
  "voiceName": "HoaiMy",
  "gender": "female",
  "speed": 0,
  "pitch": 0
}
```

#### Parameters
Same as regular endpoint, but `text` can be unlimited length and `isPreview` is not supported.

#### Success Response (200)
```json
{
  "success": true,
  "audio": "base64_encoded_mp3_data",
  "contentType": "audio/mpeg", 
  "filename": "tts_long_HoaiMy_1234567890.mp3",
  "voiceUsed": {
    "id": "vi-VN-HoaiMyNeural",
    "name": "HoaiMy", 
    "language": "vi-VN",
    "gender": "female"
  },
  "settings": {
    "speed": 0,
    "pitch": 0
  },
  "processing": {
    "originalLength": 15000,
    "chunksUsed": 4,
    "chunkingMethods": [
      "sentence_end",
      "sentence_end", 
      "sentence_end",
      "last_chunk"
    ],
    "audioStatistics": {
      "totalChunks": 4,
      "totalSize": 3601440,
      "averageSize": 900360
    },
    "finalAudioSize": 14500000
  },
  "engine": "Azure TTS"
}
```

#### Processing Information
| Field | Description |
|-------|-------------|
| `originalLength` | Original text length in characters |
| `chunksUsed` | Number of chunks created |
| `chunkingMethods` | Methods used for each chunk split |
| `audioStatistics` | Statistics about audio chunks before merging |
| `finalAudioSize` | Final merged audio file size in bytes |

#### Chunking Methods
- `sentence_end` - Split at sentence boundary (best quality)
- `exclamation_question` - Split at ! or ? marks
- `semicolon_colon` - Split at ; or : marks
- `comma` - Split at comma (acceptable quality)
- `paragraph_break` - Split at paragraph breaks
- `line_break` - Split at line breaks
- `word_boundary` - Split at word boundaries (fallback)
- `last_chunk` - Final chunk in sequence
- `hard_cut` - Forced cut (rare, indicates formatting issues)

---

### 3. Voice Management

**`GET /api/voices/:language`**

Get available voices for a specific language.

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `language` | string | ✅ | Language code (e.g., "vi-VN") |

#### Success Response (200)
```json
{
  "success": true,
  "language": "vi-VN",
  "voices": [
    {
      "id": "vi-VN-HoaiMyNeural",
      "name": "HoaiMy",
      "gender": "female",
      "locale": "vi-VN",
      "engine": "azure"
    }
  ]
}
```

**`GET /api/languages`**

Get all supported languages.

#### Success Response (200)
```json
{
  "success": true,
  "languages": [
    {
      "code": "vi-VN",
      "name": "Vietnamese", 
      "voiceCount": 2
    }
  ]
}
```

---

### 4. System Endpoints

**`GET /health`**

Health check endpoint.

#### Success Response (200)
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**`GET /robots.txt`**

Returns SEO robots.txt file.

**`GET /sitemap.xml`**

Returns XML sitemap for SEO.

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request parameters |
| 429 | Rate Limit Exceeded | Wait before making new requests |
| 500 | Internal Server Error | Check server logs, try again later |

## Rate Limiting

### Limits per IP address:
- **Regular endpoint**: 20 requests per minute
- **Long text endpoint**: 5 requests per minute

### Rate limit headers:
- Rate limits are enforced per IP
- Exceeded requests return 429 status
- Counter resets every minute

---

## Usage Examples

### cURL Examples

#### Basic text conversion:
```bash
curl -X POST http://localhost:3000/api/tts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test.",
    "language": "en-US",
    "voice": "en-US-AriaNeural", 
    "voiceName": "Aria",
    "gender": "female"
  }'
```

#### Long text conversion:
```bash
curl -X POST http://localhost:3000/api/tts/generate-long \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Very long text content that exceeds 5000 characters...",
    "language": "vi-VN",
    "voice": "vi-VN-HoaiMyNeural",
    "voiceName": "HoaiMy", 
    "gender": "female",
    "speed": 10,
    "pitch": 5
  }'
```

### JavaScript Examples

#### Using fetch API:
```javascript
async function generateTTS(text, isLong = false) {
  const endpoint = isLong ? '/api/tts/generate-long' : '/api/tts/generate';
  
  const response = await fetch(endpoint, {
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
  
  if (!response.ok) {
    throw new Error('TTS generation failed');
  }
  
  return await response.json();
}

// Usage
const result = await generateTTS("Hello world");
console.log('Audio generated:', result.filename);

// For long text
const longResult = await generateTTS(longText, true);
console.log('Processed', longResult.processing.chunksUsed, 'chunks');
```

### Python Example:
```python
import requests
import base64

def text_to_speech(text, language="en-US"):
    url = "http://localhost:3000/api/tts/generate"
    if len(text) > 5000:
        url = "http://localhost:3000/api/tts/generate-long"
    
    payload = {
        "text": text,
        "language": language,
        "voice": "en-US-AriaNeural",
        "voiceName": "Aria", 
        "gender": "female"
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        
        # Save audio file
        audio_data = base64.b64decode(result["audio"])
        with open(result["filename"], "wb") as f:
            f.write(audio_data)
            
        return result
    else:
        raise Exception(f"Request failed: {response.text}")

# Usage
result = text_to_speech("Hello, this is a test!")
print(f"Audio saved as: {result['filename']}")
```

---

## Best Practices

### 📝 Text Formatting
- Use proper punctuation for better chunk splitting
- Separate paragraphs with double line breaks
- Avoid extremely long sentences (>500 chars) 

### ⚡ Performance
- Use regular endpoint for texts under 5,000 characters
- For long texts, expect processing time of ~3-5 seconds per 1,000 characters
- Implement client-side retry logic for network timeouts

### 🛡️ Error Handling
- Always check the `success` field in responses
- Implement exponential backoff for rate limiting
- Handle both network and API errors gracefully

### 🔧 Optimization
- Cache voice lists to reduce API calls
- Consider text preprocessing to optimize chunking
- Monitor processing times and adjust chunk size if needed

---

## Supported Languages & Voices

| Language | Code | Azure Voices | Google TTS |
|----------|------|--------------|------------|
| English | en-US | ✅ 20+ voices | ✅ |
| Vietnamese | vi-VN | ✅ 2 voices | ✅ |
| Korean | ko-KR | ✅ 10+ voices | ✅ |
| Spanish | es-ES | ✅ 15+ voices | ✅ |
| French | fr-FR | ✅ 10+ voices | ✅ |
| German | de-DE | ✅ 15+ voices | ✅ |
| Japanese | ja-JP | ✅ 10+ voices | ✅ |
| Chinese | zh-CN | ✅ 15+ voices | ✅ |
| Arabic | ar-SA | ✅ 5+ voices | ✅ |
| Hindi | hi-IN | ✅ 5+ voices | ✅ |
| Russian | ru-RU | ✅ 5+ voices | ✅ |
| Portuguese | pt-BR | ✅ 10+ voices | ✅ |

---

## Changelog

### v2.0.0
- ✨ Added unlimited text length support
- 🧠 Implemented intelligent text chunking
- 🎵 Added FFmpeg audio merging
- 📊 Enhanced response with processing statistics
- ⚡ Added rate limiting protection

### v1.5.0  
- 🌍 Multi-language support
- 🎛️ Speed and pitch controls
- 🎨 Theme toggle functionality

---

*For more information, see the main [README.md](README.md) file.*