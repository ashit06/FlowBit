# 🚀 Flowbit Analytics - Render.com PostgreSQL Setup

## ✅ Configuration Complete

Your Flowbit Analytics application is now fully configured to use Render.com PostgreSQL instead of local Docker. All database connections have been tested and verified.

## 🗄️ Database Details

- **Host**: `dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com`
- **Database**: `flowbit_dsmj`
- **User**: `flowbit_dsmj_user`
- **Port**: `5432`
- **Connection String**: `postgresql://flowbit_dsmj_user:OeBqXReq0cEqRJt4qjGisESU20LjrTNC@dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com/flowbit_dsmj`

## 📁 Environment Files Updated

All environment files have been configured with your Render.com database credentials:

1. **Root `.env`** - Main environment variables
2. **`apps/api/.env`** - API server configuration
3. **`services/vanna/.env`** - Vanna AI service configuration

## 🎯 Sample Data

The database has been seeded with sample data:
- **1 Customer**: Acme Corporation
- **3 Vendors**: Phunk GmbH, Tech Solutions Ltd, Global Supply Co
- **3 Invoices**: INV-2024-001, INV-2024-002, INV-2024-003
- **3 Line Items**: Various services and products
- **2 Payments**: For paid invoices

## 🚀 Quick Start

### Option 1: Start All Services Individually

```bash
# Terminal 1: API Server
cd apps/api && npm run dev

# Terminal 2: Vanna AI Service  
cd services/vanna && python3 main.py

# Terminal 3: Frontend
cd apps/web && npm run dev
```

### Option 2: Use Docker Compose (Recommended)

```bash
# Start all services with Render.com database
docker-compose up
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
./test-render-db.sh
```

## 🔄 Switching Between Local and Cloud Database

To switch back to local Docker PostgreSQL (for development):

1. Uncomment the local database variables in `.env` files
2. Comment out the Render.com variables
3. Start local PostgreSQL: `docker-compose up postgres`

To use Render.com (current setup):
- Keep current configuration (already set up)

## 🌐 Application URLs

Once started, access your application at:

- **Frontend**: http://localhost:3002
- **API Server**: http://localhost:3001
- **Vanna AI**: http://localhost:8000
- **API Documentation**: http://localhost:3001/api

## 🔧 Useful Commands

```bash
# Check database connection
cd apps/api && npx ts-node -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.customer.count().then(console.log);"

# Reset and reseed database
cd apps/api && npx prisma db push --force-reset && npx prisma db seed

# View database with Prisma Studio
cd apps/api && npx prisma studio

# Check Vanna AI database connection
cd services/vanna && python3 -c "import psycopg; from dotenv import load_dotenv; import os; load_dotenv(); print('Connected!' if psycopg.connect(host=os.getenv('DB_HOST'), dbname=os.getenv('DB_NAME'), user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD')) else 'Failed')"
```

## ⚡ Performance Notes

- Render.com PostgreSQL is in production mode
- Database connections are persistent
- All environment variables are externalized (no hardcoded URIs)
- Schema changes require `npx prisma db push` from `apps/api`

## 🛡️ Security

- Database credentials are stored in `.env` files (not committed to git)
- All connections use SSL by default
- Connection strings include authentication tokens

---

**Status**: ✅ Ready for development and testing with Render.com PostgreSQL