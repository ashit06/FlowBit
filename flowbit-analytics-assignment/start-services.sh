#!/bin/bash

# 🚀 Flowbit Analytics - One-Click Startup Script
# This script starts all services for the Flowbit Analytics project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="/Users/arpitagrahari/Flowbit/flowbit-analytics-assignment"

echo -e "${BLUE}🚀 Starting Flowbit Analytics Project...${NC}"
echo "================================================"

# Check if we're in the right directory
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_ROOT${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use. Killing existing process...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}🔍 Waiting for $name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - waiting for $name...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Check required ports
echo -e "${BLUE}🔍 Checking ports...${NC}"
check_port 3000
check_port 3001
check_port 8000

# Start API Server
echo -e "${BLUE}🔌 Starting API Server (Port 3001)...${NC}"
cd "$PROJECT_ROOT/apps/api"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ API package.json not found${NC}"
    exit 1
fi

# Start API in background
nohup npx ts-node src/server.ts > /tmp/flowbit-api.log 2>&1 &
API_PID=$!
echo "API PID: $API_PID" > /tmp/flowbit-pids.txt

# Start AI Service
echo -e "${BLUE}🤖 Starting AI Service (Port 8000)...${NC}"
cd "$PROJECT_ROOT/services/vanna"
if [ ! -f "main.py" ]; then
    echo -e "${RED}❌ AI service main.py not found${NC}"
    exit 1
fi

# Start AI service in background
nohup python3 main.py > /tmp/flowbit-ai.log 2>&1 &
AI_PID=$!
echo "AI PID: $AI_PID" >> /tmp/flowbit-pids.txt

# Wait for backend services to be ready
wait_for_service "http://localhost:3001/health" "API Server"
wait_for_service "http://localhost:8000/health" "AI Service"

# Start Frontend
echo -e "${BLUE}🌐 Starting Frontend (Port 3000)...${NC}"
cd "$PROJECT_ROOT/apps/web"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Frontend package.json not found${NC}"
    exit 1
fi

# Start frontend in background
nohup npm run dev > /tmp/flowbit-web.log 2>&1 &
WEB_PID=$!
echo "WEB PID: $WEB_PID" >> /tmp/flowbit-pids.txt

# Wait for frontend
wait_for_service "http://localhost:3000" "Frontend"

echo ""
echo "================================================"
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo -e "   🌐 Frontend:   ${GREEN}http://localhost:3000${NC}"
echo -e "   🔌 API:        ${GREEN}http://localhost:3001${NC}"
echo -e "   🤖 AI Chat:    ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   API:      tail -f /tmp/flowbit-api.log"
echo -e "   AI:       tail -f /tmp/flowbit-ai.log"  
echo -e "   Frontend: tail -f /tmp/flowbit-web.log"
echo ""
echo -e "${BLUE}🛑 To stop all services:${NC}"
echo -e "   Run: ${YELLOW}./stop-services.sh${NC}"
echo ""
echo -e "${GREEN}✨ Open your browser to http://localhost:3000 to get started!${NC}"