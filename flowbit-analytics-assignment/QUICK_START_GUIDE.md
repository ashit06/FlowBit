# 🚀 Flowbit Analytics - Quick Start Guide

This guide will help you get the Flowbit Analytics project running on your system in just a few minutes.

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python 3.12+** - [Download here](https://python.org/) or use pyenv
- **Git** - [Download here](https://git-scm.com/)
- **PostgreSQL Database** (or use the existing Render.com setup)

## 🏗️ Project Structure

```
flowbit-analytics-assignment/
├── apps/
│   ├── api/          # Backend API (Express.js + Prisma)
│   └── web/          # Frontend (Next.js)
├── services/
│   └── vanna/        # AI Chat Service (Python FastAPI)
└── data/
    └── Analytics_Test_Data.json  # Real analytics data
```

## ⚡ Quick Start (5 Minutes)

### Step 1: Clone & Setup
```bash
# Navigate to your project directory
cd /Users/arpitagrahari/Flowbit/flowbit-analytics-assignment

# Install dependencies for all services
npm install
cd apps/api && npm install
cd ../web && npm install
cd ../../services/vanna && pip install -r requirements.txt
```

### Step 2: Environment Setup
Create `.env` file in `/apps/api/`:
```bash
# Database (using existing Render.com setup)
DATABASE_URL="postgresql://flowbit_analytics_db_user:your_password@your_host/flowbit_analytics_db"

# AI Service
GROQ_API_KEY="your_groq_api_key_here"
VANNA_AI_URL="http://localhost:8000"
```

### Step 3: Start All Services

**Terminal 1 - API Server:**
```bash
cd apps/api
npx ts-node src/server.ts
```
✅ API will run on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```
✅ Frontend will run on http://localhost:3000

**Terminal 3 - AI Chat Service:**
```bash
cd services/vanna
python3 main.py
```
✅ AI Service will run on http://localhost:8000

### Step 4: Verify Setup
Open your browser to http://localhost:3000 and test the chat feature!

---

## 🔧 Detailed Setup Instructions

### A. Database Setup (First Time Only)

If you need to set up a new database:

1. **Using Render.com (Recommended):**
   ```bash
   # Run the setup script
   ./setup-render-db.sh
   ```

2. **Using Local PostgreSQL:**
   ```bash
   # Install PostgreSQL
   brew install postgresql
   
   # Start PostgreSQL service
   brew services start postgresql
   
   # Create database
   createdb flowbit_analytics
   ```

### B. Data Ingestion (First Time Only)

Load the real analytics data:
```bash
cd apps/api
npx tsx scripts/ingest-flowbit-data.ts
```

This will process `Analytics_Test_Data.json` and populate your database with:
- ✅ 10 Real invoices (€12,293.08 total revenue)
- ✅ 11 Vendors
- ✅ 10 Customers

### C. Python Environment Setup

Using pyenv (recommended):
```bash
# Install Python 3.12
pyenv install 3.12.3
pyenv shell 3.12.3

# Install AI service dependencies
cd services/vanna
pip install -r requirements.txt
```

---

## 🚦 Service Management

### Starting Services

**Option 1: Manual (Recommended for Development)**
```bash
# Terminal 1
cd apps/api && npx ts-node src/server.ts

# Terminal 2  
cd apps/web && npm run dev

# Terminal 3
cd services/vanna && python3 main.py
```

**Option 2: Background Processes**
```bash
# Start API in background
cd apps/api && npx ts-node src/server.ts &

# Start AI service in background
cd services/vanna && python3 main.py &

# Start frontend (this should run in foreground for hot reload)
cd apps/web && npm run dev
```

### Stopping Services

**Stop all Node.js processes:**
```bash
pkill -f "ts-node"
pkill -f "next"
```

**Stop Python service:**
```bash
pkill -f "python main.py"
```

**Check running services:**
```bash
ps aux | grep -E "(ts-node|python3|next)" | grep -v grep
```

---

## 🧪 Testing Your Setup

### 1. Health Checks
```bash
# API Health
curl http://localhost:3001/health

# AI Service Health  
curl http://localhost:8000/health

# Frontend
open http://localhost:3000
```

### 2. Test Chat Functionality
```bash
# Test revenue query
curl -X POST http://localhost:3001/api/chat-with-data \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the total revenue?"}'

# Expected response: €12,293.08
```

### 3. Test Database
```bash
# Check invoice count
curl http://localhost:3001/api/invoices | jq length

# Should return: 10
```

---

## 🔍 Troubleshooting

### Common Issues & Solutions

**🚨 Port Already in Use**
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9
```

**🚨 Database Connection Error**
```bash
# Check if DATABASE_URL is set correctly
cd apps/api && cat .env | grep DATABASE_URL

# Test database connection
npx prisma db push
```

**🚨 Python Dependencies Issue**
```bash
# Reinstall Python dependencies
cd services/vanna
pip install --force-reinstall -r requirements.txt
```

**🚨 Node Dependencies Issue**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Service URLs
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:3001
- 🤖 **AI Chat**: http://localhost:8000
- 📊 **Database**: Render.com PostgreSQL

---

## 📊 Features Available

### Dashboard Features
- ✅ Real-time analytics from invoice data
- ✅ Revenue tracking (€12,293.08 total)
- ✅ Vendor and customer management
- ✅ Interactive charts and graphs

### Chat Features
Try these questions:
- "What is the total revenue?"
- "Show me all vendors"
- "How many customers do we have?"
- "Which customer has the highest invoice?"

---

## 🔄 Regular Workflow

**Daily Development:**
1. Open 3 terminals
2. Run the 3 start commands (API, Frontend, AI)
3. Open http://localhost:3000
4. Start coding! 🚀

**Shutting Down:**
1. Ctrl+C in each terminal
2. Or use the kill commands above

---

## 📝 Notes

- **First-time setup**: ~10 minutes
- **Regular startup**: ~2 minutes
- **Database**: Pre-loaded with real Flowbit data
- **Hot reload**: Frontend auto-refreshes on changes
- **AI Integration**: Uses Groq API with local fallback

---

## 🆘 Need Help?

1. **Check service status**: Use health check commands above
2. **View logs**: Check terminal outputs for error messages
3. **Restart services**: Use the stop/start commands
4. **Database issues**: Run `npx prisma studio` to inspect data

**Happy Coding! 🎉**