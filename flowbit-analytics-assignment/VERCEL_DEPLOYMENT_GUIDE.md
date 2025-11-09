# 🚀 Complete Deployment Guide for Flowbit Analytics

## 📋 Pre-deployment Checklist

✅ Vercel configuration created (`vercel.json`)  
✅ Package.json updated with build scripts  
✅ Environment variables documented  
✅ API proxy configured for frontend  
✅ Backend ready for serverless deployment  
✅ **Analytics data seeding scripts created**  
✅ **Seeding API endpoints configured**  
✅ **Vanna AI service deployed at vannaai.onrender.com**  
✅ **PostgreSQL database ready on Render**  

## �️ Data Seeding Strategy

Your Analytics_Test_Data.json (54,135 records) will be automatically processed into:
- **~25 Vendors** (from unique organizationIds with realistic company names)
- **~20 Customers** (from unique departmentIds representing departments)  
- **~150 Invoices** (processed subset for optimal performance)
- **~400 Line Items** (1-4 per invoice with detailed descriptions)
- **~90 Payments** (for paid invoices with realistic payment methods)
- **~€180,000 Total Revenue** (realistic amounts based on file sizes and types)

## 🚀 Manual Deployment Steps

### **Method 1: Vercel Dashboard (Recommended)**

#### Step 1: Prepare Repository
```bash
# Commit all changes first
git add .
git commit -m "feat: prepare for Vercel deployment"
git push origin main
```

#### Step 2: Deploy via Dashboard
1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub
2. Click **"New Project"**
3. **Import Git Repository:**
   - Repository: `ashit06/FlowBit`
   - Click **"Import"**

#### Step 3: Configure Project Settings
```
Framework Preset: Other
Root Directory: ./
Build Command: npm run build  
Output Directory: apps/web/.next
Install Command: npm install
```

#### Step 4: Environment Variables
Add these in Vercel dashboard under "Environment Variables":

**Production Environment:**
```
DATABASE_URL = postgresql://flowbit_dsmj_user:OeBqXReq0cEqRJt4qjGisESU20LjrTNC@dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com/flowbit_dsmj

VANNA_API_BASE_URL = https://vannaai.onrender.com

NEXT_PUBLIC_API_BASE_URL = /api

NODE_ENV = production

API_BASE_URL = http://localhost:3001

CORS_ORIGIN = *
```

#### Step 5: Deploy and Seed
- Click **"Deploy"**
- Wait for build to complete (~3-5 minutes)
- **After successful deployment, seed the database:**

```bash
# Replace with your actual Vercel URL
VERCEL_URL="https://your-project.vercel.app"

# Seed the database with analytics data
curl -X POST "$VERCEL_URL/api/seed"

# Check seeding status
curl -s "$VERCEL_URL/api/seed" | jq
```

---

### **Method 2: Vercel CLI**

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login and Initialize
```bash
cd /Users/arpitagrahari/Flowbit/flowbit-analytics-assignment

# Login to Vercel
vercel login

# Initialize project
vercel

# Follow prompts:
# ? Set up and deploy? [Y/n] y
# ? Which scope? Your Account  
# ? Link to existing project? [y/N] n
# ? Project name? flowbit-analytics
# ? Directory? ./
# ? Want to override settings? [y/N] y
# ? Build Command? npm run build
# ? Output Directory? apps/web/.next  
# ? Install Command? npm install
```

#### Step 3: Set Environment Variables
```bash
# Add production environment variables
vercel env add DATABASE_URL production
# Enter: postgresql://flowbit_dsmj_user:OeBqXReq0cEqRJt4qjGisESU20LjrTNC@dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com/flowbit_dsmj

vercel env add VANNA_API_BASE_URL production  
# Enter: https://vannaai.onrender.com

vercel env add NEXT_PUBLIC_API_BASE_URL production
# Enter: /api

vercel env add NODE_ENV production
# Enter: production

vercel env add API_BASE_URL production
# Enter: http://localhost:3001

vercel env add CORS_ORIGIN production
# Enter: *
```

#### Step 4: Deploy to Production
```bash
vercel --prod
```

---

## 🔍 Post-Deployment Verification (with Seeded Data)

### Test Seeded Data Endpoints
```bash
# Replace with your actual Vercel URL
VERCEL_URL="https://flowbit-analytics.vercel.app"

# 1. Check seeding status
curl -s "$VERCEL_URL/api/seed"

# 2. Test stats with real data
curl -s "$VERCEL_URL/api/stats"

# 3. Test invoices endpoint  
curl -s "$VERCEL_URL/api/invoices?limit=5"

# 4. Test chat with real data
curl -X POST "$VERCEL_URL/api/chat-with-data" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the total revenue from all invoices?"}'

# 5. Test vendor analysis
curl -X POST "$VERCEL_URL/api/chat-with-data" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the top 5 vendors by total spend"}'
```

### Expected Responses with Seeded Data
- **Seeding Status**: `{"seeded": true, "stats": {...}}`
- **API Stats**: Real revenue (~€180,000), invoice counts, vendor data
- **Chat Queries**: Actual SQL results from Analytics_Test_Data.json

---

## 🛠️ Troubleshooting

### Build Failures
1. Check **build logs** in Vercel dashboard
2. Verify **turbo.json** configuration
3. Check **package.json** scripts
4. Ensure **dependencies** are correct

### API Route Issues  
1. Check **vercel.json** routing
2. Verify **API proxy** in `apps/web/app/api/[...path]/route.ts`
3. Check **environment variables**
4. Review **CORS** settings

### Database Connection Issues
1. Verify **DATABASE_URL** is correct
2. Check **Prisma** is generating properly
3. Ensure **database** is accessible from Vercel

---

## 📊 Expected Architecture

```
Vercel Domain
├── / → Frontend (Next.js)
└── /api/* → Backend API (Express.js via proxy)
    └── → Vanna AI (https://vannaai.onrender.com)
        └── → PostgreSQL (Render)
```

## 💰 Cost
- **Vercel Hobby**: Free (good for testing)
- **Vercel Pro**: $20/month (recommended for production)
- **Total with Vanna AI**: $7-27/month

---

## 🔄 Vanna AI Re-deployment Guide (if needed)

Your Vanna AI service is already deployed at **https://vannaai.onrender.com**, but if you need to redeploy:

### Re-deploy Vanna AI on Render.com

#### Step 1: Update Vanna AI Service (if needed)
```bash
# Navigate to Vanna AI directory
cd /Users/arpitagrahari/Flowbit/flowbit-analytics-assignment/services/vanna

# Check current status
curl -s https://vannaai.onrender.com/health

# If you made changes, commit them
git add .
git commit -m "update: vanna ai service improvements"
git push origin main
```

#### Step 2: Manual Render Deployment
1. Go to **[render.com](https://render.com)** dashboard
2. Find your **"vannaai"** service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait ~3-5 minutes for deployment

#### Step 3: Verify Vanna AI Service
```bash
# Test health endpoint
curl -s https://vannaai.onrender.com/health

# Test query functionality
curl -X POST https://vannaai.onrender.com/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the total revenue?"}'
```

#### Step 4: Update Environment Variables (if needed)
If you have a new Vanna AI URL, update your Vercel environment variables:
- Go to Vercel dashboard → Your project → Settings → Environment Variables
- Update `VANNA_API_BASE_URL` to new Render URL

---

## 📊 Expected Architecture

```
Vercel Domain
├── / → Frontend (Next.js)
└── /api/* → Backend API (Express.js via proxy)
    └── → Vanna AI (https://vannaai.onrender.com)
        └── → PostgreSQL (Render)
```

## 💰 Cost
- **Vercel Hobby**: Free (good for testing)
- **Vercel Pro**: $20/month (recommended for production)
- **Total with Vanna AI**: $7-27/month

## 🎉 Success with Real Data!
After successful deployment and seeding, your application will be available at:
`https://your-project.vercel.app`

Both frontend and backend will run on the same domain, eliminating CORS issues and providing a seamless user experience!