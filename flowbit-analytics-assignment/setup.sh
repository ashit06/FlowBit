#!/bin/bash

# Flowbit Analytics Assignment Setup Script
echo "🚀 Setting up Flowbit Analytics Assignment..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    exit 1
fi

echo "✅ All prerequisites found!"

# Install dependencies
echo "📦 Installing dependencies..."

# Root dependencies
npm install

# Frontend dependencies
echo "Installing frontend dependencies..."
cd apps/web && npm install && cd ../..

# Backend dependencies
echo "Installing backend dependencies..."
cd apps/api && npm install && cd ../..

# Python dependencies
echo "Installing Python dependencies..."
cd services/vanna && pip install -r requirements.txt && cd ../..

echo "✅ All dependencies installed!"

# Setup environment files
echo "⚙️ Setting up environment files..."

if [ ! -f apps/api/.env ]; then
    cp apps/api/.env.example apps/api/.env
    echo "✅ Created apps/api/.env"
fi

if [ ! -f services/vanna/.env ]; then
    cp services/vanna/.env.example services/vanna/.env
    echo "✅ Created services/vanna/.env"
fi

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created root .env"
fi

# Generate Prisma client
echo "🗄️ Setting up database..."
cd apps/api
npx prisma generate
echo "✅ Prisma client generated!"
cd ../..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update environment variables in .env files with your actual values"
echo "2. Set up PostgreSQL database (or use Docker)"
echo "3. Run 'docker-compose up -d' to start all services"
echo "4. Or run services manually:"
echo "   - Frontend: cd apps/web && npm run dev"
echo "   - Backend: cd apps/api && npm run dev"
echo "   - Vanna AI: cd services/vanna && python main.py"
echo ""
echo "📚 See README.md for detailed instructions"