#!/bin/bash

# 🛑 Flowbit Analytics - Stop All Services Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Flowbit Analytics Services...${NC}"
echo "=============================================="

# Function to kill process by PID
kill_pid() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}🔄 Stopping $name (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
        sleep 1
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}   Force stopping $name...${NC}"
            kill -9 "$pid" 2>/dev/null || true
        fi
        echo -e "${GREEN}✅ $name stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  $name not running or PID not found${NC}"
    fi
}

# Stop services by PID if available
if [ -f "/tmp/flowbit-pids.txt" ]; then
    echo -e "${BLUE}📋 Stopping services by PID...${NC}"
    
    while IFS= read -r line; do
        if [[ $line == *"API PID:"* ]]; then
            API_PID=$(echo "$line" | cut -d' ' -f3)
            kill_pid "$API_PID" "API Server"
        elif [[ $line == *"AI PID:"* ]]; then
            AI_PID=$(echo "$line" | cut -d' ' -f3)
            kill_pid "$AI_PID" "AI Service"
        elif [[ $line == *"WEB PID:"* ]]; then
            WEB_PID=$(echo "$line" | cut -d' ' -f3)
            kill_pid "$WEB_PID" "Frontend"
        fi
    done < "/tmp/flowbit-pids.txt"
    
    rm -f "/tmp/flowbit-pids.txt"
fi

# Kill by process name (backup method)
echo -e "${BLUE}🔍 Checking for remaining processes...${NC}"

# Kill Node.js processes
NODE_PIDS=$(pgrep -f "ts-node\|next-server" 2>/dev/null || true)
if [ -n "$NODE_PIDS" ]; then
    echo -e "${YELLOW}🔄 Stopping remaining Node.js processes...${NC}"
    echo "$NODE_PIDS" | xargs kill 2>/dev/null || true
    sleep 1
    # Force kill if needed
    NODE_PIDS=$(pgrep -f "ts-node\|next-server" 2>/dev/null || true)
    if [ -n "$NODE_PIDS" ]; then
        echo "$NODE_PIDS" | xargs kill -9 2>/dev/null || true
    fi
fi

# Kill Python processes
PYTHON_PIDS=$(pgrep -f "python.*main.py" 2>/dev/null || true)
if [ -n "$PYTHON_PIDS" ]; then
    echo -e "${YELLOW}🔄 Stopping Python AI service...${NC}"
    echo "$PYTHON_PIDS" | xargs kill 2>/dev/null || true
    sleep 1
    # Force kill if needed
    PYTHON_PIDS=$(pgrep -f "python.*main.py" 2>/dev/null || true)
    if [ -n "$PYTHON_PIDS" ]; then
        echo "$PYTHON_PIDS" | xargs kill -9 2>/dev/null || true
    fi
fi

# Kill by port (final backup)
echo -e "${BLUE}🔍 Checking ports 3000, 3001, 8000...${NC}"

for port in 3000 3001 8000; do
    PID=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}🔄 Killing process on port $port (PID: $PID)...${NC}"
        kill -9 "$PID" 2>/dev/null || true
    fi
done

# Clean up log files
echo -e "${BLUE}🧹 Cleaning up log files...${NC}"
rm -f /tmp/flowbit-*.log

# Verify everything is stopped
echo -e "${BLUE}✅ Verification:${NC}"
REMAINING=$(ps aux | grep -E "(ts-node|next-server|python.*main.py)" | grep -v grep | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}✅ All Flowbit Analytics services stopped successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some processes may still be running:${NC}"
    ps aux | grep -E "(ts-node|next-server|python.*main.py)" | grep -v grep
fi

echo ""
echo -e "${BLUE}🚀 To start services again, run:${NC}"
echo -e "   ${GREEN}./start-services.sh${NC}"
echo ""