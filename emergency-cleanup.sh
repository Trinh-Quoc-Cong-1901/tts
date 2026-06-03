#!/bin/bash

echo "🚨 Emergency cleanup script for TTS deployment issues"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER_IP="167.235.186.59"

echo -e "${YELLOW}This script will:${NC}"
echo "1. SSH to server and check port 3000 usage"
echo "2. Kill any processes using port 3000"
echo "3. Clean PM2 processes"
echo "4. Restart the application"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo -e "${YELLOW}Connecting to server for emergency cleanup...${NC}"

ssh -p 2222 root@$SERVER_IP << 'EOF'
    echo "🔍 Checking current processes on port 3000..."
    lsof -i :3000 || echo "No processes found on port 3000"

    echo ""
    echo "🔍 Checking PM2 processes..."
    pm2 list || echo "No PM2 processes found"

    echo ""
    echo "💀 Killing all processes on port 3000..."

    # Kill specific port processes
    PORT_PIDS=$(lsof -ti:3000 2>/dev/null || true)
    if [ ! -z "$PORT_PIDS" ]; then
        echo "Killing PIDs: $PORT_PIDS"
        kill -9 $PORT_PIDS 2>/dev/null || true
        sleep 2
    fi

    echo "🔧 PM2 complete cleanup..."
    pm2 kill || true
    pm2 delete all || true

    # Force kill any remaining node processes
    echo "💀 Force killing all node processes..."
    pkill -f "node.*server.js" || true
    pkill -f "PM2" || true

    # Wait a moment
    sleep 3

    echo ""
    echo "✅ Cleanup completed. Verifying port is free..."
    if lsof -i:3000 >/dev/null 2>&1; then
        echo "❌ Port 3000 still in use:"
        lsof -i:3000
    else
        echo "✅ Port 3000 is now free"
    fi

    echo ""
    echo "📊 Final process check..."
    ps aux | grep -E "(node|pm2)" | grep -v grep || echo "No node/pm2 processes found"

    echo ""
    echo "🚀 To restart the app manually, run:"
    echo "cd /var/www/CongDeploy/CICD/run/text-to-speech"
    echo "pm2 start ecosystem.config.js"
    echo ""
    echo "Or with manual config:"
    echo "pm2 start server.js --name tts-app --mode fork --instances 1"

EOF

echo ""
echo -e "${GREEN}🎉 Emergency cleanup completed!${NC}"
echo -e "${YELLOW}You can now try the deployment again.${NC}"