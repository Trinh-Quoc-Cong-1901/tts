# 🚀 Quick Production Fix Commands

## Step 1: SSH vào production server
```bash
ssh username@your-production-server
```

## Step 2: Check current code version
```bash
cd /var/www/tts  # hoặc path project của bạn

# Check current commit
git log --oneline -3

# Should show: 70a65a1 Complete unlimited text length implementation
# If not, code chưa được pull
```

## Step 3: Pull latest code (if needed)
```bash
# Pull latest changes
git pull origin main

# Verify files exist
ls -la text-chunker.js audio-merger.js

# Check server.js has new endpoint
grep -n "generate-long" server.js
```

## Step 4: Install dependencies
```bash
# Install FFmpeg dependencies
npm install

# Verify FFmpeg dependencies
node -e "console.log('ffmpeg-static:', require('ffmpeg-static'))"
node -e "console.log('fluent-ffmpeg OK')"
```

## Step 5: Restart PM2 properly
```bash
# Stop current process
pm2 stop tts-app

# Delete process
pm2 delete tts-app

# Start fresh
pm2 start server.js --name tts-app

# Save PM2 config
pm2 save

# Check status
pm2 status
pm2 logs tts-app --lines 10
```

## Step 6: Test endpoints
```bash
# Test regular endpoint (should work)
curl -I http://localhost:3000/api/tts/generate

# Test new endpoint (should work after fix)
curl -I http://localhost:3000/api/tts/generate-long

# Both should return: HTTP/1.1 200 OK (not 404)
```

## Step 7: Test from outside
```bash
# Test from your local machine:
curl -I https://text-to-speech.space/api/tts/generate-long

# Should return: HTTP/2 200 (not 404)
```

---

## 🚨 Common Issues & Fixes:

### Issue 1: "git pull" fails
```bash
git reset --hard origin/main
git pull origin main
```

### Issue 2: PM2 fails to start
```bash
# Check if port 3000 is busy
sudo lsof -i:3000

# Kill process if needed
sudo kill -9 $(sudo lsof -t -i:3000)

# Start PM2 again
pm2 start server.js --name tts-app
```

### Issue 3: Dependencies fail
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: Still getting 404
```bash
# Check nginx config (if using nginx)
sudo nginx -t
sudo systemctl reload nginx

# Or restart entire server
sudo reboot
```

---

## ✅ Success Indicators:

After running all commands, you should see:

1. **PM2 Status**: 
```
┌─────┬─────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name    │ mode        │ ↺      │ status  │ cpu      │
├─────┼─────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ tts-app │ fork        │ 0       │ online  │ 0%       │
└─────┴─────────┴─────────────┴─────────┴─────────┴──────────┘
```

2. **Endpoint Test**:
```bash
curl -I https://text-to-speech.space/api/tts/generate-long
# Returns: HTTP/2 200
```

3. **Frontend Test**:
- Paste 10,000+ character text
- See: "10,XXX characters → Will be split into X chunks"  
- Click Generate → Success with chunking info

---

## 🎯 Priority Order:

1. **First**: Check if files exist on production
2. **Second**: Restart PM2 properly  
3. **Third**: Test endpoints
4. **Fourth**: Test from browser

Most likely issue: **PM2 không restart với code mới!**