# 🚀 TTS Application - Deployment Guide

cd /var/www/tts

## 📋 Mục lục

- [🏠 Chạy Local](#-chạy-local)
- [🧪 Test Local](#-test-local)
- [🌐 Deploy lên Server](#-deploy-lên-server)
- [🔧 Troubleshooting](#-troubleshooting)

---

## 🏠 Chạy Local

### 📦 1. Cài đặt Dependencies

```bash
# Clone repository (nếu chưa có)
git clone https://github.com/Trinh-Quoc-Cong-1901/tts.git
cd tts

# Cài đặt Node.js dependencies
npm install
```

### ⚙️ 2. Tạo Environment File

Tạo file `.env` trong thư mục root:

```bash
# Tạo file .env
cat > .env << 'EOF'
# Azure Text-to-Speech Configuration
AZURE_TTS_SUBSCRIPTION_KEY=your_azure_subscription_key_here
AZURE_TTS_REGION=eastus
USE_AZURE_TTS=true

# Server Configuration
NODE_ENV=development
PORT=3000
EOF
```

### 🚀 3. Chạy Application Local

```bash
# Chạy server
node server.js
```

Hoặc sử dụng nodemon để auto-restart khi code thay đổi:

```bash
# Cài nodemon (nếu chưa có)
npm install -g nodemon

# Chạy với nodemon
nodemon server.js
```

### 🌐 4. Mở Browser

Mở browser và truy cập:

- **Local URL**: http://localhost:3000

---

## 🧪 Test Local

### ✅ 1. Kiểm tra Server Status

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"OK","timestamp":"2024-01-01T10:00:00.000Z"}
```

### ✅ 2. Test API Endpoints

```bash
# Test languages endpoint
curl http://localhost:3000/api/languages | jq '.languages | length'
# Expected: 142

# Test voices cho ngôn ngữ cụ thể
curl http://localhost:3000/api/voices/vi-VN | jq '.voices | length'
# Expected: 2 (hoặc nhiều hơn)

# Test voices cho English
curl http://localhost:3000/api/voices/en-US | jq '.voices[0]'
# Expected: voice object với proper structure
```

### ✅ 3. Test Frontend Features

**Mở http://localhost:3000 và test:**

1. **Language Dropdown:**
   - ✅ Kiểm tra có 142 ngôn ngữ A-Z
   - ✅ Chọn ngôn ngữ khác nhau
2. **Voice Loading:**
   - ✅ Chọn ngôn ngữ → voices load tự động
   - ✅ Hiển thị đúng tên voice, gender, locale
3. **Voice Selection:**
   - ✅ Click chọn voice
   - ✅ Preview voice hoạt động
4. **TTS Generation:**
   - ✅ Nhập text
   - ✅ Generate audio
   - ✅ Play audio
   - ✅ Download MP3

### ✅ 4. Test Azure TTS Integration

```bash
# Test TTS generation
curl -X POST http://localhost:3000/api/tts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test",
    "language": "en-US",
    "voice": "en-US-AriaNeural",
    "voiceName": "Aria",
    "gender": "female",
    "speed": 0,
    "pitch": 0,
    "isPreview": true
  }'
```

**Expected response:**

```json
{
  "success": true,
  "audio": "base64_audio_data...",
  "engine": "Azure TTS",
  "voiceUsed": {
    "id": "en-US-AriaNeural",
    "name": "Aria"
  }
}
```

---

## 🌐 Deploy lên Server

### 📥 1. Update Code trên Server

```bash
# SSH vào server
ssh root@51.38.176.94

# Di chuyển đến thư mục app
cd /home/$(whoami)/tts-app

# Pull latest code
git pull origin main

# Cài đặt dependencies mới (nếu có)
npm install --production
```

### ⚙️ 2. Kiểm tra Environment

```bash
# Kiểm tra .env file có đúng không
cat .env

# Nếu chưa có, tạo .env với Azure credentials thật
cat > .env << 'EOF'
AZURE_TTS_SUBSCRIPTION_KEY=your_real_azure_key_here
AZURE_TTS_REGION=eastus
USE_AZURE_TTS=true
NODE_ENV=production
PORT=3000
EOF
```

### 🔄 3. Restart Application với PM2

```bash
# Restart PM2 process
pm2 restart tts-app

# Kiểm tra status
pm2 status

# Xem logs nếu có lỗi
pm2 logs tts-app
```

### ✅ 4. Test Production

```bash
# Test local trên server
curl http://localhost:3000/health

# Test từ bên ngoài
curl http://text-to-speech.space/health
```

### 🔧 5. Restart Nginx (nếu cần)

```bash
# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

---

## 🔧 Troubleshooting

### ❌ Server không start

```bash
# Kiểm tra port đã được sử dụng chưa
sudo lsof -i :3000

# Kill process nếu cần
sudo kill -9 <PID>

# Restart
pm2 restart tts-app
```

### ❌ Azure TTS không hoạt động

```bash
# Kiểm tra environment variables
node -e "console.log(process.env.AZURE_TTS_SUBSCRIPTION_KEY)"
node -e "console.log(process.env.USE_AZURE_TTS)"

# Test Azure credentials
curl -X POST https://eastus.api.cognitive.microsoft.com/sts/v1.0/issuetoken \
  -H "Ocp-Apim-Subscription-Key: $AZURE_TTS_SUBSCRIPTION_KEY"
```

### ❌ Voices không load

```bash
# Kiểm tra processed-voices.json
ls -la processed-voices.json

# Test voices API
curl http://localhost:3000/api/voices/en-US | jq '.'
```

### ❌ 521 Error (Cloudflare)

```bash
# Kiểm tra nginx status
sudo systemctl status nginx

# Kiểm tra app status
pm2 status

# Restart cả hai
sudo systemctl restart nginx
pm2 restart tts-app
```

### ❌ Frontend không load voices

1. **Mở Developer Console** (F12)
2. **Kiểm tra Network tab** - xem API calls có lỗi không
3. **Kiểm tra Console tab** - xem JavaScript errors

### 📊 Monitoring Commands

```bash
# Xem PM2 status
pm2 status

# Xem logs realtime
pm2 logs tts-app --lines 50

# Xem nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Kiểm tra disk space
df -h

# Kiểm tra memory usage
free -m
```

---

## 🎯 Quick Deploy Checklist

**Local Test:**

- [ ] `npm install` ✅
- [ ] `.env` file created ✅
- [ ] `node server.js` runs ✅
- [ ] http://localhost:3000 loads ✅
- [ ] Languages dropdown shows 142 items ✅
- [ ] Voices load for different languages ✅
- [ ] TTS generation works ✅

**Server Deploy:**

- [ ] `git pull origin main` ✅
- [ ] `npm install --production` ✅
- [ ] `.env` file exists ✅
- [ ] `pm2 restart tts-app` ✅
- [ ] `pm2 status` shows running ✅
- [ ] http://text-to-speech.space loads ✅
- [ ] Production TTS works ✅

---

## 📞 Support

Nếu gặp vấn đề, check theo thứ tự:

1. **Logs**: `pm2 logs tts-app`
2. **Status**: `pm2 status`
3. **Nginx**: `sudo systemctl status nginx`
4. **API Test**: `curl http://localhost:3000/health`
5. **Frontend Console**: F12 Developer Tools

**Server Info:**

- **IP**: 51.38.176.94
- **Domain**: text-to-speech.space
- **Port**: 3000 (internal)
- **SSL**: Cloudflare managed

---

## 🔐 Security Notes

⚠️ **Important**:

- Không commit file `.env` vào Git
- Luôn dùng placeholder trong documentation
- Azure subscription key phải được keep secret
- Sử dụng environment variables cho production

---

_Created by Claude Code Assistant 🤖_
