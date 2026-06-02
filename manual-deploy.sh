#!/bin/bash
echo "🚀 Manual deployment script for unlimited text support"

# Configuration - UPDATE THESE
SERVER_USER="your-username"
SERVER_HOST="your-server-ip"
PROJECT_PATH="/var/www/tts"

echo "📤 Deploying to $SERVER_USER@$SERVER_HOST:$PROJECT_PATH"

# Step 1: Push local changes (if any)
echo "📥 Ensuring local changes are pushed..."
git add .
git commit -m "Manual deploy: unlimited text support" || echo "No changes to commit"
git push origin main

# Step 2: Deploy to server
echo "🚀 Deploying to production server..."
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
    # Navigate to project
    cd /var/www/tts

    # Pull latest changes
    echo "📥 Pulling latest code..."
    git pull origin main

    # Show recent commits
    echo "📋 Recent commits:"
    git log --oneline -3

    # Check critical files exist
    echo "🔍 Checking files..."
    if [ ! -f "text-chunker.js" ]; then
        echo "❌ text-chunker.js missing!"
        exit 1
    fi

    if [ ! -f "audio-merger.js" ]; then
        echo "❌ audio-merger.js missing!"
        exit 1
    fi

    # Check server.js has new endpoint
    if ! grep -q "generate-long" server.js; then
        echo "❌ generate-long endpoint missing in server.js!"
        exit 1
    fi

    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install

    # Verify ffmpeg dependencies
    node -e "try { require('ffmpeg-static'); console.log('✅ ffmpeg-static OK'); } catch(e) { console.log('❌ ffmpeg-static missing'); process.exit(1); }"
    node -e "try { require('fluent-ffmpeg'); console.log('✅ fluent-ffmpeg OK'); } catch(e) { console.log('❌ fluent-ffmpeg missing'); process.exit(1); }"

    # Stop and restart PM2
    echo "🔄 Restarting application..."
    pm2 stop tts-app || true
    pm2 delete tts-app || true

    # Start fresh
    pm2 start server.js --name tts-app
    pm2 save

    # Wait for startup
    sleep 5

    # Test endpoints
    echo "🧪 Testing endpoints..."

    # Test old endpoint
    if curl -s -f http://localhost:3000/api/tts/generate > /dev/null; then
        echo "✅ Regular endpoint working"
    else
        echo "❌ Regular endpoint failed"
    fi

    # Test new endpoint
    if curl -s -f -X POST http://localhost:3000/api/tts/generate-long \
        -H "Content-Type: application/json" \
        -d '{"text":"test","language":"en-US","voice":"en-US-AriaNeural","voiceName":"Aria","gender":"female"}' > /dev/null; then
        echo "✅ Long text endpoint working"
    else
        echo "❌ Long text endpoint failed"
    fi

    # Show final status
    echo "📊 Final status:"
    pm2 status

EOF

echo "🎉 Deployment completed!"
echo "🌐 Test your site: https://text-to-speech.space"