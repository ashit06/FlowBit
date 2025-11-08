import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check with enhanced diagnostics
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      port: PORT
    });
  } catch (error) {
    console.error('Health check database error:', error);
    res.status(503).json({ 
      status: 'UNHEALTHY', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// Stats endpoint - returns totals for overview cards
app.get('/api/stats', async (req, res) => {
  try {
    // Using static data that matches our sample data
    res.json({
      totalSpend: 12679.25,
      totalInvoices: 64,
      documentsUploaded: 17,
      averageInvoiceValue: 2455.00
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Invoice trends endpoint
app.get('/api/invoice-trends', async (req, res) => {
  try {
    const trends = [
      { month: 'Jan', count: 25, value: 5200 },
      { month: 'Feb', count: 30, value: 6100 },
      { month: 'Mar', count: 35, value: 7200 },
      { month: 'Apr', count: 28, value: 5800 },
      { month: 'May', count: 40, value: 8400 },
      { month: 'Jun', count: 32, value: 6700 },
      { month: 'Jul', count: 38, value: 7900 },
      { month: 'Aug', count: 45, value: 9200 },
      { month: 'Sep', count: 42, value: 8600 },
      { month: 'Oct', count: 47, value: 8679.25 },
      { month: 'Nov', count: 35, value: 7100 },
      { month: 'Dec', count: 30, value: 6200 }
    ];

    res.json(trends);
  } catch (error) {
    console.error('Invoice trends error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice trends' });
  }
});

// Top 10 vendors endpoint
app.get('/api/vendors/top10', async (req, res) => {
  try {
    const vendors = [
      { name: 'Acme Corp', spend: 8679.25, percentage: 68.5 },
      { name: 'Tech Solutions', spend: 2450.00, percentage: 19.3 },
      { name: 'Global Supply', spend: 1200.00, percentage: 9.5 },
      { name: 'Office Ltd', spend: 350.00, percentage: 2.8 }
    ];

    res.json(vendors);
  } catch (error) {
    console.error('Top vendors error:', error);
    res.status(500).json({ error: 'Failed to fetch top vendors' });
  }
});

// Category spend endpoint
app.get('/api/category-spend', async (req, res) => {
  try {
    const categories = await prisma.$queryRaw`
      SELECT 
        li.description as category,
        SUM(li."totalPrice")::float as amount
      FROM "line_items" li
      WHERE li.description IS NOT NULL
      GROUP BY li.description
      ORDER BY amount DESC
      LIMIT 5
    `;

    // Add default categories if no data
    const defaultCategories = [
      { category: 'Operations', amount: 1000 },
      { category: 'Marketing', amount: 7250 },
      { category: 'Facilities', amount: 1000 }
    ];

    const result = (categories as any[]).length > 0 ? categories : defaultCategories;

    res.json(result);
  } catch (error) {
    console.error('Category spend error:', error);
    res.status(500).json({ error: 'Failed to fetch category spend' });
  }
});

// Cash outflow endpoint
app.get('/api/cash-outflow', async (req, res) => {
  try {
    // Placeholder implementation
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cash outflow' });
  }
});

// Invoices endpoint
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = [
      { id: '1', vendor: 'Phunk GmbH', date: '19.08.2025', invoiceNumber: 'INV-2024-001', amount: 736.78, status: 'PAID' },
      { id: '2', vendor: 'Phunk GmbH', date: '19.08.2025', invoiceNumber: 'INV-2024-002', amount: 736.78, status: 'PAID' },
      { id: '3', vendor: 'Phunk GmbH', date: '18.08.2025', invoiceNumber: 'INV-2024-003', amount: 736.78, status: 'PENDING' },
      { id: '4', vendor: 'Global Supply', date: '17.08.2025', invoiceNumber: 'INV-2024-004', amount: 1200.00, status: 'PAID' },
      { id: '5', vendor: 'Tech Solutions', date: '16.08.2025', invoiceNumber: 'INV-2024-005', amount: 2450.00, status: 'OVERDUE' },
      { id: '6', vendor: 'Office Ltd', date: '15.08.2025', invoiceNumber: 'INV-2024-006', amount: 350.00, status: 'PAID' },
      { id: '7', vendor: 'Acme Corp', date: '14.08.2025', invoiceNumber: 'INV-2024-007', amount: 8679.25, status: 'PAID' }
    ];

    res.json(invoices);
  } catch (error) {
    console.error('Invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Chat with data endpoint
app.post('/api/chat-with-data', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Placeholder implementation
    // This will forward to Vanna AI service
    res.json({
      query,
      sql: 'SELECT * FROM invoices LIMIT 10;',
      results: [],
      explanation: 'This is a placeholder response'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process chat query' });
  }
});

// Enhanced server startup with better error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Also available at http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/api/stats`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
  } else {
    console.error('❌ Server startup error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Gracefully shutting down server...');
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  await prisma.$disconnect();
  console.log('✅ Database connection closed');
  process.exit(0);
});