# 🎯 Quick Deployment Commands - Flowbit Analytics

## Current Status
✅ **Vanna AI Service**: Deployed at https://vannaai.onrender.com  
✅ **PostgreSQL Database**: Live on Render.com  
❌ **Frontend + Backend**: Not deployed yet  
❌ **Database**: Empty (no seeded data)  

---

## 🚀 STEP 1: Commit All Changes

```bash
cd /Users/arpitagrahari/Flowbit/flowbit-analytics-assignment

# Add all seeding files
git add .

# Commit with descriptive message
git commit -m "feat: add comprehensive analytics data seeding

✅ Created seed-analytics-data.ts for processing 54,135 records
✅ Added /api/seed endpoints for database population
✅ Created frontend seeding proxy at /api/seed  
✅ Updated vercel.json to include data files
✅ Added seeding scripts to package.json
✅ Updated deployment guide with seeding instructions"

# Push to main branch
git push origin main
```

---

## 🌐 STEP 2A: Deploy via Vercel Dashboard (RECOMMENDED)

### 1. Open Vercel Dashboard
```bash
# Open in browser
open https://vercel.com/dashboard
```

### 2. Import Repository
- Click **"New Project"**
- Select **"Import Git Repository"**
- Choose: `ashit06/FlowBit`
- Click **"Import"**

### 3. Configure Build Settings
```
Framework Preset: Other
Root Directory: ./  
Build Command: npm run build
Output Directory: apps/web/.next
Install Command: npm install
Node.js Version: 18.x (recommended)
```

### 4. Add Environment Variables
In Vercel dashboard, add these **one by one**:

```bash
# Database Connection
DATABASE_URL = postgresql://flowbit_dsmj_user:OeBqXReq0cEqRJt4qjGisESU20LjrTNC@dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com/flowbit_dsmj

# Vanna AI Service  
VANNA_API_BASE_URL = https://vannaai.onrender.com

# Frontend API Proxy
NEXT_PUBLIC_API_BASE_URL = /api

# Production Environment
NODE_ENV = production
API_BASE_URL = http://localhost:3001
CORS_ORIGIN = *
```

### 5. Deploy
- Click **"Deploy"**
- Wait 3-5 minutes for build completion
- Note your deployment URL (e.g., `https://flowbit-analytics-xyz.vercel.app`)

---

## 🌐 STEP 2B: Deploy via Vercel CLI (Alternative)

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Navigate to project root
cd /Users/arpitagrahari/Flowbit/flowbit-analytics-assignment

# Login to Vercel
vercel login

# Initialize and deploy
vercel

# Follow prompts:
# ? Set up and deploy? [Y/n] y
# ? Which scope? [Your Account]
# ? Link to existing project? [y/N] n  
# ? Project name? flowbit-analytics
# ? Directory? ./
# ? Want to override settings? [y/N] y
# ? Build Command? npm run build
# ? Output Directory? apps/web/.next
# ? Install Command? npm install

# Add environment variables via CLI
vercel env add DATABASE_URL production
# Paste: postgresql://flowbit_dsmj_user:OeBqXReq0cEqRJt4qjGisESU20LjrTNC@dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com/flowbit_dsmj

vercel env add VANNA_API_BASE_URL production
# Paste: https://vannaai.onrender.com

vercel env add NEXT_PUBLIC_API_BASE_URL production
# Paste: /api

vercel env add NODE_ENV production
# Paste: production

# Deploy to production
vercel --prod
```

---

## 📊 STEP 3: Seed Database with Analytics Data

**IMPORTANT**: Only run after successful deployment!

```bash
# Replace with your ACTUAL Vercel URL from deployment
export VERCEL_URL="https://your-actual-project-url.vercel.app"

# Test deployment health first
curl -s "$VERCEL_URL/health" | jq

# Seed database with 54,135 analytics records
echo "🌱 Seeding database with Analytics_Test_Data.json..."
curl -X POST "$VERCEL_URL/api/seed" | jq

# Verify seeding completed
echo "📊 Checking seeding status..."
curl -s "$VERCEL_URL/api/seed" | jq

# Test with real data
echo "💰 Testing stats with seeded data..."
curl -s "$VERCEL_URL/api/stats" | jq
```

---

## 🔍 STEP 4: Verification Tests

```bash
# Replace with your actual Vercel URL
export VERCEL_URL="https://your-actual-project-url.vercel.app"

echo "🧪 Running verification tests..."

# 1. Frontend test
echo "1️⃣ Testing frontend..."
curl -s "$VERCEL_URL" | head -n 5

# 2. Backend health  
echo "2️⃣ Testing backend health..."
curl -s "$VERCEL_URL/health" | jq

# 3. Database stats
echo "3️⃣ Testing database stats..."
curl -s "$VERCEL_URL/api/stats" | jq .totalRevenue

# 4. Invoice data
echo "4️⃣ Testing invoice data..."
curl -s "$VERCEL_URL/api/invoices?limit=3" | jq .[0]

# 5. RAG Chat test
echo "5️⃣ Testing RAG chat..."
curl -X POST "$VERCEL_URL/api/chat-with-data" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is our total revenue?"}' | jq

# 6. Vendor analysis
echo "6️⃣ Testing vendor analysis..."
curl -X POST "$VERCEL_URL/api/chat-with-data" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me top 3 vendors by spend"}' | jq .results
```

---

## 🔧 STEP 5: Fix Vanna AI (if needed)

Only run if Vanna AI tests fail:

```bash
# Check Vanna AI status
curl -s https://vannaai.onrender.com/health

# If unhealthy, redeploy on Render.com:
# 1. Go to https://dashboard.render.com
# 2. Find "vannaai" service  
# 3. Click "Manual Deploy" → "Deploy latest commit"
# 4. Wait 3-5 minutes

# Test Vanna AI directly
curl -X POST https://vannaai.onrender.com/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the total revenue?"}' | jq
```

---

## 🎯 Expected Results

### ✅ Successful Deployment Should Show:

```json
{
  "seeded": true,
  "stats": {
    "vendors": 25,
    "customers": 20, 
    "invoices": 150,
    "lineItems": 400,
    "payments": 90,
    "totalRevenue": 180000
  }
}
```

### 🌐 Your Live URLs:
- **Frontend**: `https://your-project.vercel.app`
- **Backend API**: `https://your-project.vercel.app/api/*`
- **Vanna AI**: `https://vannaai.onrender.com`
- **Database**: Render PostgreSQL (via DATABASE_URL)

### 📊 What You Get:
- ✅ **Real Analytics Data**: 150 invoices, 25 vendors, ~€180K revenue
- ✅ **Working RAG Chat**: Query your actual invoice data
- ✅ **Live Dashboard**: Real metrics from Analytics_Test_Data.json
- ✅ **Production Ready**: Scalable serverless deployment

---

## 🚨 Troubleshooting

### Build Fails?
```bash
# Check Vercel build logs in dashboard
# Common issues:
# - Missing environment variables
# - TypeScript errors  
# - Missing dependencies

# Fix and redeploy:
git add . && git commit -m "fix: build issues" && git push
# Vercel auto-redeploys on push
```

### Seeding Fails?
```bash
# Check if Analytics_Test_Data.json exists
ls -la data/Analytics_Test_Data.json

# Test seeding status endpoint
curl -s "$VERCEL_URL/api/seed" | jq .message

# Check Vercel function logs in dashboard
```

### Vanna AI Issues?
```bash  
# Test Vanna AI directly
curl -s https://vannaai.onrender.com/health

# If down, redeploy on render.com
# Update VANNA_API_BASE_URL in Vercel if URL changed
```

---

## 🎉 SUCCESS!

**Total deployment time**: ~10-15 minutes  
**Real data**: Analytics_Test_Data.json processed into 150 invoices  
**Cost**: Free tier (Vercel Hobby + Render free tier)  
**Performance**: Serverless scaling, global CDN  

Your **full-stack RAG analytics application** is now live! 🚀