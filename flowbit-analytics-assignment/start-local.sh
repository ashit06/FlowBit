#!/bin/bash

# 🚀 Flowbit Analytics - Local Startup (with Remote Vanna AI)
# This script starts frontend and backend locally using deployed Vanna AI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Flowbit Analytics (Frontend + Backend only)...${NC}"
echo -e "${GREEN}🤖 Using deployed Vanna AI: https://vannaai.onrender.com${NC}"
echo "================================================"

# Project root directory
PROJECT_ROOT="/Users/arpitagrahari/Flowbit/flowbit-analytics-assignment"

# Check if we're in the right directory
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_ROOT${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use. Killing existing process...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Check required ports (using 3002 for backend to avoid conflicts)
echo -e "${BLUE}🔍 Checking ports...${NC}"
check_port 3000  # Frontend
check_port 3002  # Backend (using 3002 instead of 3001)

# Test deployed Vanna AI
echo -e "${BLUE}🧪 Testing deployed Vanna AI service...${NC}"
if curl -s "https://vannaai.onrender.com/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Vanna AI service is healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Vanna AI service might be sleeping (Render free tier). It will wake up on first request.${NC}"
fi

# Start API Server on port 3002
echo -e "${BLUE}🔌 Starting API Server (Port 3002)...${NC}"
cd "$PROJECT_ROOT/apps/api"

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ API package.json not found${NC}"
    exit 1
fi

if [ ! -f "src/server.ts" ]; then
    echo -e "${RED}❌ API server.ts not found${NC}"
    exit 1
fi

# Start API server in background on port 3002
echo -e "${BLUE}   Installing/checking API dependencies...${NC}"
npm install > /dev/null 2>&1

echo -e "${BLUE}   Generating Prisma client...${NC}"  
npx prisma generate > /dev/null 2>&1

echo -e "${BLUE}   Starting API server...${NC}"
PORT=3002 npx ts-node src/server.ts &
API_PID=$!
echo "$API_PID" > /tmp/flowbit-api.pid

# Wait for API to be ready
echo -e "${BLUE}🔍 Waiting for API server...${NC}"
sleep 5

if curl -s "http://localhost:3002/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API Server is ready on port 3002!${NC}"
else
    echo -e "${RED}❌ API Server failed to start${NC}"
    exit 1
fi

# Start Frontend
echo -e "${BLUE}🌐 Starting Frontend (Port 3000)...${NC}"
cd "$PROJECT_ROOT/apps/web"

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Frontend package.json not found${NC}"
    exit 1
fi

# Make sure frontend is configured to use backend on port 3002
if [ ! -f ".env.local" ]; then
    echo "API_BASE_URL=http://localhost:3002" > .env.local
    echo "NEXT_PUBLIC_API_BASE=/api" >> .env.local
else
    # Update existing .env.local to use port 3002
    sed -i '' 's/localhost:3001/localhost:3002/g' .env.local 2>/dev/null || true
fi

echo -e "${BLUE}   Installing/checking Frontend dependencies...${NC}"
npm install > /dev/null 2>&1

echo -e "${BLUE}   Starting Frontend server...${NC}"
npm run dev &
WEB_PID=$!
echo "$WEB_PID" > /tmp/flowbit-web.pid

# Wait for frontend
echo -e "${BLUE}🔍 Waiting for Frontend...${NC}"
sleep 8

if curl -s "http://localhost:3000" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is ready!${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend might still be starting up...${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}🎉 Services started successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo -e "   🌐 Frontend:    ${GREEN}http://localhost:3000${NC}"
echo -e "   🔌 Backend API: ${GREEN}http://localhost:3002${NC}"
echo -e "   🤖 Vanna AI:    ${GREEN}https://vannaai.onrender.com${NC}"
echo -e "   🗄️ Database:    ${GREEN}Render PostgreSQL${NC}"
echo ""
echo -e "${BLUE}🧪 Test Endpoints:${NC}"
echo -e "   Health:   ${YELLOW}curl http://localhost:3002/health${NC}"
echo -e "   Stats:    ${YELLOW}curl http://localhost:3002/api/stats${NC}"
echo -e "   Chat:     ${YELLOW}curl -X POST http://localhost:3002/api/chat-with-data -H 'Content-Type: application/json' -d '{\"query\":\"What is our total revenue?\"}'${NC}"
echo ""
echo -e "${BLUE}🛑 To stop services:${NC}"
echo -e "   ${YELLOW}kill \$(cat /tmp/flowbit-api.pid) \$(cat /tmp/flowbit-web.pid)${NC}"
echo ""
echo -e "${GREEN}✨ Open your browser to http://localhost:3000 to get started!${NC}"
echo -e "${GREEN}💬 The chat will use your deployed Vanna AI at https://vannaai.onrender.com${NC}"