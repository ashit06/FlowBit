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
    const [
      totalInvoices,
      totalVendors,
      totalCustomers,
      revenueData,
      pendingData,
      averageData
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.vendor.count(),
      prisma.customer.count(),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true }
      }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ['PENDING', 'OVERDUE'] } }
      }),
      prisma.invoice.aggregate({
        _avg: { totalAmount: true }
      })
    ]);

    const totalSpend = Number(revenueData._sum.totalAmount) || 0;
    const pendingPayments = Number(pendingData._sum.totalAmount) || 0;
    const averageInvoiceValue = Number(averageData._avg.totalAmount) || 0;

    res.json({
      totalSpend,
      totalInvoices,
      documentsUploaded: totalInvoices, // Using invoice count as document count for now
      averageInvoiceValue,
      totalRevenue: totalSpend, // Keep this for backward compatibility
      pendingPayments,
      totalVendors,
      totalCustomers,
      percentageChange: {
        invoices: 12.5, // Placeholder for now
        revenue: 8.3,
        payments: -5.2,
        vendors: 0
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
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
// Invoices endpoint with full data from DB
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        vendor: {
          select: { name: true }
        },
        customer: {
          select: { name: true }
        }
      },
      orderBy: {
        issueDate: 'desc'
      },
      take: 50 // Limit for performance
    });

    const formattedInvoices = invoices.map((invoice: any) => ({
      id: invoice.id,
      vendor: invoice.vendor?.name || 'Unknown Vendor',
      customer: invoice.customer?.name || 'Unknown Customer',
      date: invoice.issueDate.toLocaleDateString('de-DE'),
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.totalAmount),
      status: invoice.status,
      category: invoice.category,
      dueDate: invoice.dueDate?.toLocaleDateString('de-DE'),
      currency: invoice.currency
    }));

    res.json(formattedInvoices);
  } catch (error) {
    console.error('Invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Analytics endpoints for dashboard charts
app.get('/api/analytics/revenue-by-month', async (req, res) => {
  try {
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "issueDate") as month,
        SUM("totalAmount") as revenue,
        COUNT(*) as invoice_count
      FROM invoices 
      WHERE "issueDate" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "issueDate")
      ORDER BY month DESC
      LIMIT 12
    `;

    // Convert BigInt values to numbers for JSON serialization
    const formattedData = (monthlyRevenue as any[]).map(item => ({
      month: item.month,
      revenue: Number(item.revenue) || 0,
      invoice_count: Number(item.invoice_count) || 0
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

app.get('/api/analytics/vendors', async (req, res) => {
  try {
    const vendorAnalytics = await prisma.vendor.findMany({
      include: {
        invoices: {
          select: {
            totalAmount: true,
            status: true
          }
        }
      }
    });

    const vendorData = vendorAnalytics.map((vendor: any) => ({
      id: vendor.id,
      name: vendor.name,
      totalInvoices: vendor.invoices.length,
      totalAmount: vendor.invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount), 0),
      paidInvoices: vendor.invoices.filter((inv: any) => inv.status === 'PAID').length
    }));

    res.json(vendorData);
  } catch (error) {
    console.error('Vendor analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor analytics' });
  }
});

app.get('/api/analytics/categories', async (req, res) => {
  try {
    const categoryData = await prisma.invoice.groupBy({
      by: ['category'],
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const formattedData = categoryData.map((cat: any) => ({
      category: cat.category || 'Uncategorized',
      totalAmount: Number(cat._sum.totalAmount) || 0,
      invoiceCount: cat._count.id
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Category analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch category analytics' });
  }
});

// Seeding endpoints for production database
app.post('/api/seed', async (req, res) => {
  try {
    console.log('🌱 Seeding endpoint called');
    
    // Import seeding function dynamically
    const { seedAnalyticsData } = await import('../scripts/seed-analytics-data');
    
    // Run seeding
    const result = await seedAnalyticsData();
    
    res.json({
      message: 'Database seeded successfully with analytics data',
      ...result
    });
  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed database',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get seeding status endpoint
app.get('/api/seed', async (req, res) => {
  try {
    const stats = await Promise.all([
      prisma.vendor.count(),
      prisma.customer.count(), 
      prisma.invoice.count(),
      prisma.lineItem.count(),
      prisma.payment.count(),
      prisma.invoice.aggregate({ _sum: { totalAmount: true } })
    ]);

    const [vendorCount, customerCount, invoiceCount, lineItemCount, paymentCount, revenueSum] = stats;

    res.json({
      seeded: invoiceCount > 0,
      stats: {
        vendors: vendorCount,
        customers: customerCount,
        invoices: invoiceCount,
        lineItems: lineItemCount,
        payments: paymentCount,
        totalRevenue: revenueSum._sum.totalAmount || 0
      },
      message: invoiceCount > 0 
        ? 'Database contains seeded data' 
        : 'Database is empty - use POST /api/seed to populate'
    });
  } catch (error) {
    console.error('❌ Seeding status error:', error);
    res.status(500).json({
      error: 'Failed to check seeding status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Chat with data endpoint
app.post('/api/chat-with-data', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Forward to Vanna AI service
    const vannaResponse = await fetch(`${process.env.VANNA_API_BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: query })
    });
    
    if (vannaResponse.ok) {
      const result = await vannaResponse.json();
      res.json(result);
    } else {
      throw new Error('Vanna AI service unavailable');
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat query',
      query: req.body.query || '',
      results: [],
      explanation: 'The AI service is currently unavailable. Please try again later.'
    });
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