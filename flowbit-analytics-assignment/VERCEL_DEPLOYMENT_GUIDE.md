# 🚀 Vercel Deployment Guide for Flowbit Analytics

## 📋 Pre-deployment Checklist

✅ Vercel configuration created (`vercel.json`)  
✅ Package.json updated with build scripts  
✅ Environment variables documented  
✅ API proxy configured for frontend  
✅ Backend ready for serverless deployment  

## 🛠️ Manual Deployment Steps

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

#### Step 5: Deploy
- Click **"Deploy"**
- Wait for build to complete (~3-5 minutes)

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

## 🔍 Post-Deployment Verification

### Test Endpoints
```bash
# Replace with your actual Vercel URL
VERCEL_URL="https://flowbit-analytics.vercel.app"

# 1. Test frontend
curl -s "$VERCEL_URL"

# 2. Test backend API health
curl -s "$VERCEL_URL/api/health"

# 3. Test stats endpoint  
curl -s "$VERCEL_URL/api/stats"

# 4. Test chat functionality
curl -X POST "$VERCEL_URL/api/chat-with-data" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the total revenue?"}'
```

### Expected Responses
- **Frontend**: HTML page should load
- **API Health**: `{"status": "OK", "database": "connected"}`
- **Stats**: Invoice analytics data
- **Chat**: SQL query + results from Vanna AI

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

## 🎉 Success!
After successful deployment, your application will be available at:
`https://your-project.vercel.app`

Both frontend and backend will run on the same domain, eliminating CORS issues and providing a seamless user experience!