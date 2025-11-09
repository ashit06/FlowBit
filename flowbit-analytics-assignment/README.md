# Flowbit Analytics Assignment

A production-grade full-stack web application with an Interactive Analytics Dashboard and AI-powered "Chat with Data" interface, built for the Flowbit Private Limited Full Stack Developer Internship.

## 🎯 Project Overview

This project consists of two main modules:
1. **Interactive Analytics Dashboard** - Data-driven dashboard with pixel-accurate design
2. **"Chat with Data" Interface** - AI-powered natural language analytics using Vanna AI and Groq LLM

## 🏗️ Architecture

```
flowbit-analytics-assignment/
├── apps/
│   ├── web/                    # Next.js Frontend (Vercel)
│   └── api/                    # Express.js Backend (Vercel)
├── services/
│   └── vanna/                  # Python FastAPI Vanna AI Service
├── data/
│   └── Analytics_Test_Data.json # Sample invoice data
└── docker-compose.yml          # Local development setup
```

## 🛠️ Tech Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui + TailwindCSS
- **Charts**: Recharts
- **Deployment**: Vercel

### Backend (`apps/api`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Deployment**: Vercel

### AI Layer (`services/vanna`)
- **Framework**: FastAPI (Python)
- **LLM Provider**: Groq
- **AI Library**: Vanna AI
- **Database**: PostgreSQL
- **Deployment**: Render/Railway/Fly.io

### Database
- **PostgreSQL** with properly normalized schema
- **Tables**: vendors, customers, invoices, line_items, payments

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL 15+

### ⚡ One-Command Setup

```bash
# 1. Set up environment (run once)
./setup-environment.sh

# 2. Start all services
./start-services.sh

# 3. Stop all services (when done)
./stop-services.sh
```

That's it! Open http://localhost:3000 in your browser.

### 📖 Detailed Guide

For step-by-step instructions and troubleshooting, see:
```bash
cat QUICK_START_GUIDE.md
```

### Manual Setup (Alternative)

```bash
# Clone the repository
git clone <your-repo-url>
cd flowbit-analytics-assignment

# Install dependencies
npm install
cd apps/web && npm install
cd ../api && npm install
cd ../../services/vanna && pip install -r requirements.txt
```

### 2. Environment Setup

Create environment files from examples:

```bash
# Backend API
cp apps/api/.env.example apps/api/.env

# Vanna AI Service
cp services/vanna/.env.example services/vanna/.env
```

Update the environment variables:

**`apps/api/.env`**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/flowbit_analytics?schema=public"
VANNA_API_BASE_URL="http://localhost:8000"
PORT=3001
```

**`services/vanna/.env`**:
```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/flowbit_analytics
DB_HOST=localhost
DB_NAME=flowbit_analytics
DB_USER=user
DB_PASSWORD=password
DB_PORT=5432
GROQ_API_KEY=your_groq_api_key_here
PORT=8000
```

### 3. Database Setup

```bash
# Start PostgreSQL (or use Docker)
docker run --name postgres -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=flowbit_analytics -p 5432:5432 -d postgres:15

# Run database migrations
cd apps/api
npx prisma migrate dev --name init

# Seed the database with sample data
npx ts-node scripts/ingest-data.ts
```

### 4. Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 5. Manual Development Setup

```bash
# Terminal 1: Start PostgreSQL
# (Already running from step 3)

# Terminal 2: Start Backend API
cd apps/api
npm run dev

# Terminal 3: Start Frontend
cd apps/web
npm run dev

# Terminal 4: Start Vanna AI Service
cd services/vanna
python main.py
```

## 📊 Database Schema (ER Diagram)

```mermaid
erDiagram
    VENDORS ||--o{ INVOICES : "creates"
    CUSTOMERS ||--o{ INVOICES : "receives"
    INVOICES ||--o{ LINE_ITEMS : "contains"
    INVOICES ||--o{ PAYMENTS : "has"
    
    VENDORS {
        string id PK
        string name
        string email
        string phone
        string address
        string taxId
        datetime createdAt
        datetime updatedAt
    }
    
    CUSTOMERS {
        string id PK
        string name
        string email
        string phone
        string address
        datetime createdAt
        datetime updatedAt
    }
    
    INVOICES {
        string id PK
        string invoiceNumber UK
        string vendorId FK
        string customerId FK
        datetime issueDate
        datetime dueDate
        decimal totalAmount
        decimal taxAmount
        decimal subtotalAmount
        string currency
        enum status
        string category
        string description
        datetime createdAt
        datetime updatedAt
    }
    
    LINE_ITEMS {
        string id PK
        string invoiceId FK
        string description
        decimal quantity
        decimal unitPrice
        decimal totalPrice
        string category
        datetime createdAt
    }
    
    PAYMENTS {
        string id PK
        string invoiceId FK
        decimal amount
        datetime paymentDate
        enum method
        string reference
        enum status
        datetime createdAt
    }
```

## 🔌 API Documentation

### Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-app.vercel.app/api`

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Dashboard Statistics
```http
GET /api/stats
```

**Response**:
```json
{
  "totalSpend": 125000.50,
  "totalInvoices": 150,
  "documentsUploaded": 150,
  "averageInvoiceValue": 833.34
}
```

#### 3. Invoice Trends
```http
GET /api/invoice-trends
```

**Response**:
```json
[
  {
    "month": "2024-01",
    "invoiceCount": 25,
    "totalValue": 45000.00
  }
]
```

#### 4. Top 10 Vendors
```http
GET /api/vendors/top10
```

**Response**:
```json
[
  {
    "vendorName": "Tech Solutions Inc",
    "totalSpend": 125000.00,
    "invoiceCount": 12
  }
]
```

#### 5. Category Spend
```http
GET /api/category-spend
```

**Response**:
```json
[
  {
    "category": "Software",
    "totalSpend": 75000.00,
    "percentage": 35.5
  }
]
```

#### 6. Cash Outflow Forecast
```http
GET /api/cash-outflow
```

**Response**:
```json
[
  {
    "month": "2024-02",
    "expectedOutflow": 45000.00
  }
]
```

#### 7. Invoices List
```http
GET /api/invoices?search=&page=1&limit=10&sort=issueDate&order=desc
```

**Query Parameters**:
- `search`: Filter by vendor name, invoice number, or description
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sort`: Sort field (default: issueDate)
- `order`: Sort order - asc/desc (default: desc)

**Response**:
```json
{
  "invoices": [
    {
      "id": "invoice_id",
      "invoiceNumber": "INV-2024-001",
      "vendor": {
        "name": "Tech Solutions Inc"
      },
      "issueDate": "2024-01-15T00:00:00.000Z",
      "totalAmount": 15000.00,
      "status": "PAID"
    }
  ],
  "totalCount": 150,
  "page": 1,
  "totalPages": 15
}
```

#### 8. Chat with Data
```http
POST /api/chat-with-data
Content-Type: application/json

{
  "query": "What's the total spend in the last 90 days?"
}
```

**Response**:
```json
{
  "query": "What's the total spend in the last 90 days?",
  "sql": "SELECT SUM(totalAmount) as total_spend FROM invoices WHERE issueDate >= NOW() - INTERVAL '90 days'",
  "results": [
    { "total_spend": 125000.50 }
  ],
  "explanation": "Generated SQL query to calculate total spend in the last 90 days"
}
```

## 🤖 Vanna AI Service

### Chat with Data Workflow

1. **Frontend** sends natural language query to `/api/chat-with-data`
2. **Backend API** forwards request to Vanna AI service
3. **Vanna AI** uses Groq LLM to generate SQL from natural language
4. **Vanna AI** executes SQL query against PostgreSQL
5. **Backend API** returns structured response with SQL, results, and explanation
6. **Frontend** displays generated SQL and results table

### Example Queries

- "What's the total spend in the last 90 days?"
- "List top 5 vendors by spend"
- "Show overdue invoices as of today"
- "How many invoices were processed last month?"
- "What's the average invoice value by category?"

## 🚀 Deployment

### Frontend & Backend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy with automatic builds on push

### Vanna AI Service (Render/Railway)

1. Create new service on Render/Railway
2. Connect GitHub repository
3. Set Python environment
4. Configure environment variables
5. Deploy

### Database (Neon/Supabase)

1. Create PostgreSQL database on Neon or Supabase
2. Update `DATABASE_URL` in environment variables
3. Run migrations: `npx prisma db push`
4. Seed data: `npx ts-node scripts/ingest-data.ts`

## 🔧 Development Scripts

```bash
# Root level
npm run dev          # Start all services in development
npm run build        # Build all applications
npm run lint         # Lint all applications
npm run clean        # Clean build artifacts

# Frontend (apps/web)
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run start        # Start production server

# Backend (apps/api)
npm run dev          # Start Express server with nodemon
npm run build        # Compile TypeScript
npm run start        # Start production server

# Database operations
npx prisma migrate dev    # Run database migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open Prisma Studio
```

## 📝 Environment Variables

### Frontend (`apps/web`)
```env
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Backend (`apps/api`)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
VANNA_API_BASE_URL=https://your-vanna-host
VANNA_API_KEY=optional_api_key
PORT=3001
```

### Vanna AI (`services/vanna`)
```env
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
DB_HOST=host
DB_NAME=dbname
DB_USER=user
DB_PASSWORD=password
DB_PORT=5432
GROQ_API_KEY=your_groq_api_key
PORT=8000
```

## 🎬 Demo Video Script

### Introduction (30s)
- Show the application landing page
- Navigate between Analytics Dashboard and Chat with Data tabs
- Highlight the clean, professional UI matching Figma design

### Analytics Dashboard (90s)
- Overview cards showing real-time metrics
- Invoice Volume + Value Trend line chart
- Spend by Vendor horizontal bar chart
- Spend by Category pie chart
- Cash Outflow Forecast bar chart
- Interactive invoices table with search and sorting

### Chat with Data (90s)
- Ask: "What's the total spend in the last 90 days?"
- Show generated SQL query
- Display results in formatted table
- Ask: "List top 5 vendors by spend"
- Show how results can be visualized

### Technical Highlights (30s)
- Show network requests in developer tools
- Highlight real-time database queries
- Demonstrate responsive design on mobile

## 🔍 Testing

### Manual Testing Checklist

#### Dashboard
- [ ] All overview cards load with real data
- [ ] Charts render correctly with sample data
- [ ] Invoices table is searchable and sortable
- [ ] Responsive design works on mobile/tablet
- [ ] Loading states display properly

#### Chat Interface
- [ ] Chat input accepts natural language queries
- [ ] Generated SQL is syntactically correct
- [ ] Query results display in formatted table
- [ ] Error handling for invalid queries
- [ ] Response time is reasonable (<5s)

#### API Endpoints
- [ ] All endpoints return proper JSON responses
- [ ] Error handling returns appropriate status codes
- [ ] CORS headers allow frontend access
- [ ] Database queries are optimized

## 🐛 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
npx prisma migrate reset
```

#### Prisma Client Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Reset and recreate database
npx prisma migrate reset
npx prisma db push
```

#### Vanna AI Service Issues
```bash
# Check Groq API key
echo $GROQ_API_KEY

# Check database connection
python -c "import psycopg; psycopg.connect('your_connection_string')"
```

### Performance Optimization

1. **Database Indexing**: Add indexes on frequently queried fields
2. **Query Optimization**: Use Prisma query optimization techniques
3. **Caching**: Implement Redis caching for frequent queries
4. **API Rate Limiting**: Add rate limiting to prevent abuse

## 📈 Future Enhancements

### Bonus Features Implemented
- [x] Docker setup for local development
- [x] Comprehensive error handling
- [x] TypeScript throughout the stack
- [x] Responsive design
- [x] Environment-based configuration

### Potential Improvements
- [ ] Persistent chat history
- [ ] CSV/Excel export functionality
- [ ] Role-based data views
- [ ] Additional chart types
- [ ] Unit tests and E2E testing
- [ ] Real-time data updates with WebSockets
- [ ] Advanced SQL query validation
- [ ] Data visualization recommendations from AI

## 👥 Contributors

- **Arpit Agrahari** - Full Stack Developer Intern Candidate

## 📄 License

This project is created for the Flowbit Private Limited internship assignment.

---

**Demo Links:**
- Frontend (Vercel): https://your-app.vercel.app
- Backend API: https://your-app.vercel.app/api
- Vanna AI Service: https://your-vanna.onrender.com

For any questions or issues, please contact: your-email@example.com