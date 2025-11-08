# API Documentation

## Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-app.vercel.app/api`

## Authentication
Currently, no authentication is required. In production, you would typically implement:
- JWT tokens
- API keys
- OAuth 2.0

## Endpoints

### Health Check

**GET** `/health`

Returns the health status of the API.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Statistics

**GET** `/api/stats`

Returns overview statistics for the dashboard cards.

**Response:**
```json
{
  "totalSpend": 125000.50,
  "totalInvoices": 150,
  "documentsUploaded": 150,
  "averageInvoiceValue": 833.34
}
```

---

### Invoice Trends

**GET** `/api/invoice-trends`

Returns monthly invoice count and total value trends.

**Query Parameters:**
- `months` (optional): Number of months to include (default: 12)

**Response:**
```json
[
  {
    "month": "2024-01",
    "invoiceCount": 25,
    "totalValue": 45000.00
  },
  {
    "month": "2024-02", 
    "invoiceCount": 30,
    "totalValue": 52000.00
  }
]
```

---

### Top Vendors

**GET** `/api/vendors/top10`

Returns the top 10 vendors by total spend.

**Response:**
```json
[
  {
    "vendorId": "vendor_123",
    "vendorName": "Tech Solutions Inc",
    "totalSpend": 125000.00,
    "invoiceCount": 12,
    "lastInvoiceDate": "2024-01-15T00:00:00.000Z"
  }
]
```

---

### Category Spend

**GET** `/api/category-spend`

Returns spending breakdown by category.

**Response:**
```json
[
  {
    "category": "Software",
    "totalSpend": 75000.00,
    "invoiceCount": 25,
    "percentage": 35.5
  },
  {
    "category": "Office Supplies",
    "totalSpend": 15000.00,
    "invoiceCount": 45,
    "percentage": 7.1
  }
]
```

---

### Cash Outflow Forecast

**GET** `/api/cash-outflow`

Returns expected cash outflow by month based on invoice due dates.

**Query Parameters:**
- `months` (optional): Number of future months to forecast (default: 6)

**Response:**
```json
[
  {
    "month": "2024-02",
    "expectedOutflow": 45000.00,
    "invoiceCount": 15
  },
  {
    "month": "2024-03",
    "expectedOutflow": 38000.00,
    "invoiceCount": 12
  }
]
```

---

### Invoices List

**GET** `/api/invoices`

Returns a paginated list of invoices with filtering and sorting options.

**Query Parameters:**
- `search` (optional): Search term for vendor name, invoice number, or description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sort` (optional): Sort field (default: issueDate)
  - Options: `issueDate`, `totalAmount`, `vendorName`, `status`
- `order` (optional): Sort order (default: desc)
  - Options: `asc`, `desc`
- `status` (optional): Filter by invoice status
  - Options: `DRAFT`, `PENDING`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED`
- `category` (optional): Filter by category
- `vendorId` (optional): Filter by vendor ID

**Response:**
```json
{
  "invoices": [
    {
      "id": "invoice_123",
      "invoiceNumber": "INV-2024-001",
      "vendor": {
        "id": "vendor_123",
        "name": "Tech Solutions Inc"
      },
      "customer": {
        "id": "customer_123",
        "name": "Flowbit Private Limited"
      },
      "issueDate": "2024-01-15T00:00:00.000Z",
      "dueDate": "2024-02-15T00:00:00.000Z",
      "totalAmount": 15000.00,
      "currency": "USD",
      "status": "PAID",
      "category": "Software",
      "description": "Software licensing and support"
    }
  ],
  "pagination": {
    "totalCount": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### Chat with Data

**POST** `/api/chat-with-data`

Processes natural language queries and returns SQL with results.

**Request Body:**
```json
{
  "query": "What's the total spend in the last 90 days?"
}
```

**Response:**
```json
{
  "query": "What's the total spend in the last 90 days?",
  "sql": "SELECT SUM(totalAmount) as total_spend FROM invoices WHERE issueDate >= NOW() - INTERVAL '90 days'",
  "results": [
    { 
      "total_spend": 125000.50 
    }
  ],
  "explanation": "Generated SQL query to calculate total spend in the last 90 days",
  "executionTime": 45
}
```

**Error Response:**
```json
{
  "error": "Could not generate SQL from the question",
  "details": "The query was too ambiguous or contained unsupported operations"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Rate Limiting

In production, implement rate limiting:
- 100 requests per minute per IP for general endpoints
- 10 requests per minute per IP for chat-with-data endpoint

## Data Types

### Invoice Status Enum
- `DRAFT` - Invoice is being prepared
- `PENDING` - Invoice is pending approval
- `SENT` - Invoice has been sent to customer
- `PAID` - Invoice has been paid
- `OVERDUE` - Invoice is past due date
- `CANCELLED` - Invoice has been cancelled

### Payment Method Enum
- `CASH` - Cash payment
- `BANK_TRANSFER` - Bank wire transfer
- `CREDIT_CARD` - Credit card payment
- `CHECK` - Check payment
- `OTHER` - Other payment method

### Payment Status Enum
- `PENDING` - Payment is pending
- `COMPLETED` - Payment completed successfully
- `FAILED` - Payment failed
- `CANCELLED` - Payment was cancelled

## Sample Natural Language Queries

The chat-with-data endpoint supports queries like:

1. **Spend Analysis**
   - "What's the total spend this year?"
   - "Show me spending by category"
   - "Which vendor did we pay the most?"

2. **Invoice Queries**
   - "How many invoices are overdue?"
   - "List all pending invoices"
   - "Show invoices from last month"

3. **Trends and Forecasts**
   - "What's the trend in monthly spending?"
   - "Predict next month's cash outflow"
   - "Show payment patterns by vendor"

4. **Comparative Analysis**
   - "Compare Q1 vs Q2 spending"
   - "Which category has the highest growth?"
   - "Show year-over-year invoice volume"