#!/bin/bash

echo "🚀 Starting deployment to text-to-speech.space..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER_IP="167.235.186.59"
APP_DIR="/home/$(whoami)/tts-app"

echo -e "${YELLOW}Step 1: Checking local git status...${NC}"
if ! git status --porcelain | grep -q .; then
    echo -e "${GREEN}✅ Working tree is clean${NC}"
else
    echo -e "${RED}❌ You have uncommitted changes. Please commit them first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 2: SSH to server and deploy...${NC}"

ssh -p 2222 root@$SERVER_IP << 'EOF'
    echo "📁 Navigating to app directory..."
    cd /home/$(whoami)/tts-app || cd /var/www/tts || {
        echo "❌ App directory not found. Please check server setup."
        exit 1
    }

    echo "📥 Pulling latest code..."
    git pull origin main

    echo "📦 Installing dependencies..."
    npm install --production

    echo "⚙️ Checking environment..."
    if [ ! -f .env ]; then
        echo "⚠️  .env file not found. Please create it manually."
    else
        echo "✅ .env file exists"
    fi

    echo "🔄 Restarting application with PM2..."
    pm2 restart tts-app --update-env

    echo "📊 Checking PM2 status..."
    pm2 status

    echo "🧪 Testing health endpoint..."
    sleep 2
    curl -s http://localhost:3000/health || echo "❌ Health check failed"

    echo "✅ Deployment completed!"
EOF

echo ""
echo -e "${GREEN}🎉 Deployment script completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the website: https://text-to-speech.space"
echo "2. Check if TTS functionality works"
echo "3. Monitor logs if needed: ssh -p 2222 root@$SERVER_IP 'pm2 logs tts-app'"
echo ""