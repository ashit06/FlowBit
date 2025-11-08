const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    totalSpend: 12679.25,
    totalInvoices: 64,
    documentsUploaded: 17,
    averageInvoiceValue: 2455.00
  });
});

// Invoice trends endpoint
app.get('/api/invoice-trends', (req, res) => {
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
});

// Top 10 vendors endpoint
app.get('/api/vendors/top10', (req, res) => {
  const vendors = [
    { name: 'Acme Corp', spend: 8679.25, percentage: 68.5 },
    { name: 'Tech Solutions', spend: 2450.00, percentage: 19.3 },
    { name: 'Global Supply', spend: 1200.00, percentage: 9.5 },
    { name: 'Office Ltd', spend: 350.00, percentage: 2.8 }
  ];
  res.json(vendors);
});

// Category spend endpoint
app.get('/api/category-spend', (req, res) => {
  const categories = [
    { category: 'Operations', amount: 1000 },
    { category: 'Marketing', amount: 7250 },
    { category: 'Facilities', amount: 1000 }
  ];
  res.json(categories);
});

// Cash outflow endpoint
app.get('/api/cash-outflow', (req, res) => {
  res.json([]);
});

// Invoices endpoint
app.get('/api/invoices', (req, res) => {
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
});

// Chat with data endpoint
app.post('/api/chat-with-data', (req, res) => {
  const { query } = req.body;
  
  res.json({
    query,
    sql: 'SELECT * FROM invoices LIMIT 10;',
    data: [
      { vendor: 'Acme Corp', total_amount: 8679.25, status: 'PAID' },
      { vendor: 'Tech Solutions', total_amount: 2450.00, status: 'OVERDUE' }
    ],
    answer: 'Here are the results for your query.'
  });
});

app.listen(PORT, () => {
  console.log(`Simple API server running on http://localhost:${PORT}`);
});