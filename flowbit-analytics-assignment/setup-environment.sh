#!/bin/bash

# 🔧 Flowbit Analytics - Environment Setup Script
# Run this script once to set up your development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="/Users/arpitagrahari/Flowbit/flowbit-analytics-assignment"

echo -e "${BLUE}🔧 Setting up Flowbit Analytics Development Environment...${NC}"
echo "=========================================================="

cd "$PROJECT_ROOT"

# Check Node.js version
echo -e "${BLUE}📋 Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js v18+ from https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION found. Please upgrade to v18 or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"

# Check Python version
echo -e "${BLUE}📋 Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 not found. Please install Python 3.12+ from https://python.org/${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | sed 's/Python //')
echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"

# Install root dependencies
echo -e "${BLUE}📦 Installing root dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ Root dependencies installed${NC}"
fi

# Install API dependencies
echo -e "${BLUE}📦 Installing API dependencies...${NC}"
cd "$PROJECT_ROOT/apps/api"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ API dependencies installed${NC}"
else
    echo -e "${RED}❌ API package.json not found${NC}"
    exit 1
fi

# Install Web dependencies
echo -e "${BLUE}📦 Installing Web dependencies...${NC}"
cd "$PROJECT_ROOT/apps/web"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ Web dependencies installed${NC}"
else
    echo -e "${RED}❌ Web package.json not found${NC}"
    exit 1
fi

# Install Python dependencies
echo -e "${BLUE}📦 Installing Python AI service dependencies...${NC}"
cd "$PROJECT_ROOT/services/vanna"
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
else
    echo -e "${RED}❌ requirements.txt not found${NC}"
    exit 1
fi

# Check for .env file
echo -e "${BLUE}🔍 Checking environment configuration...${NC}"
cd "$PROJECT_ROOT/apps/api"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://flowbit_analytics_db_user:PASSWORD@HOST/flowbit_analytics_db"

# AI Service Configuration  
GROQ_API_KEY="your_groq_api_key_here"
VANNA_AI_URL="http://localhost:8000"

# Optional: For local PostgreSQL
# DATABASE_URL="postgresql://username:password@localhost:5432/flowbit_analytics"
EOF
    echo -e "${GREEN}✅ .env template created${NC}"
    echo -e "${YELLOW}📝 Please update .env with your actual database credentials${NC}"
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# Check if database is accessible
echo -e "${BLUE}🗄️  Checking database connection...${NC}"
cd "$PROJECT_ROOT/apps/api"
if npx prisma db push --accept-data-loss 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${YELLOW}⚠️  Could not connect to database. Please check your .env file${NC}"
    echo -e "${YELLOW}   Make sure DATABASE_URL is correctly configured${NC}"
fi

# Check if data needs to be ingested
echo -e "${BLUE}📊 Checking if data ingestion is needed...${NC}"
cd "$PROJECT_ROOT/apps/api"

# Try to count invoices
INVOICE_COUNT=$(npx prisma db seed --preview-feature 2>/dev/null | grep -o "invoices" | wc -l || echo "0")

if [ "$INVOICE_COUNT" -lt 5 ]; then
    echo -e "${YELLOW}📥 No data found. Running data ingestion...${NC}"
    if [ -f "scripts/ingest-flowbit-data.ts" ]; then
        npx tsx scripts/ingest-flowbit-data.ts
        echo -e "${GREEN}✅ Data ingestion completed${NC}"
    else
        echo -e "${YELLOW}⚠️  Data ingestion script not found${NC}"
        echo -e "${YELLOW}   You may need to run it manually later${NC}"
    fi
else
    echo -e "${GREEN}✅ Database already has data${NC}"
fi

cd "$PROJECT_ROOT"

echo ""
echo "=========================================================="
echo -e "${GREEN}🎉 Environment Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 What was installed:${NC}"
echo -e "   ✅ Root project dependencies"
echo -e "   ✅ API server dependencies (Express.js + Prisma)"
echo -e "   ✅ Frontend dependencies (Next.js)"
echo -e "   ✅ AI service dependencies (FastAPI + Groq)"
echo -e "   ✅ Database schema and data"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "   1. Update ${YELLOW}.env${NC} file with your database credentials (if needed)"
echo -e "   2. Run ${GREEN}./start-services.sh${NC} to start all services"
echo -e "   3. Open ${GREEN}http://localhost:3000${NC} in your browser"
echo ""
echo -e "${BLUE}📚 Quick Commands:${NC}"
echo -e "   Start services:    ${GREEN}./start-services.sh${NC}"
echo -e "   Stop services:     ${GREEN}./stop-services.sh${NC}"
echo -e "   View guide:        ${GREEN}cat QUICK_START_GUIDE.md${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"