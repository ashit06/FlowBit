import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AnalyticsRecord {
  _id: string;
  name: string;
  filePath: string;
  fileSize: { $numberLong: string };
  fileType: string;
  status: string;
  organizationId: string;
  departmentId: string;
  createdAt: { $date: string };
  updatedAt: { $date: string };
  isValidatedByHuman: boolean;
  uploadedById: string;
  extractedData: any;
  metadata?: any;
}

async function seedAnalyticsData() {
  try {
    console.log('🌱 Starting analytics data seeding...');

    // Read the analytics data file - try multiple paths
    const possiblePaths = [
      path.join(process.cwd(), '../../data/Analytics_Test_Data.json'),
      path.join(process.cwd(), '../../../data/Analytics_Test_Data.json'),
      path.join(process.cwd(), 'data/Analytics_Test_Data.json'),
      path.join(__dirname, '../../../data/Analytics_Test_Data.json'),
      path.join(__dirname, '../../../../data/Analytics_Test_Data.json')
    ];
    
    let rawData: string = '';
    let dataPath: string = '';
    
    for (const testPath of possiblePaths) {
      try {
        rawData = fs.readFileSync(testPath, 'utf-8');
        dataPath = testPath;
        console.log(`📁 Found data file at: ${testPath}`);
        break;
      } catch (err) {
        continue;
      }
    }
    
    if (!rawData) {
      throw new Error(`Analytics_Test_Data.json not found. Searched paths: ${possiblePaths.join(', ')}`);
    }
    
    const analyticsData: AnalyticsRecord[] = JSON.parse(rawData);
    console.log(`📊 Found ${analyticsData.length} records to process from ${dataPath}`);

    // Clear existing data in correct order (foreign key constraints)
    console.log('🗑️ Clearing existing data...');
    await prisma.lineItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();

    // Extract unique organizations and departments (limit for performance)
    const uniqueOrgs = [...new Set(analyticsData.map(r => r.organizationId))].slice(0, 25);
    const uniqueDepts = [...new Set(analyticsData.map(r => r.departmentId))].slice(0, 20);

    console.log(`🏢 Processing ${uniqueOrgs.length} vendors and ${uniqueDepts.length} customers`);

    // Create vendors from organizations
    const vendorData = uniqueOrgs.map((orgId, index) => {
      const orgRecords = analyticsData.filter(r => r.organizationId === orgId);
      const sampleRecord = orgRecords[0];
      
      // Generate realistic vendor names from org IDs
      const vendorNames = [
        'TechCorp Solutions', 'DataFlow Systems', 'CloudBase Industries', 'NextGen Analytics',
        'SmartBiz Technologies', 'FlowTech Enterprises', 'DataStream Co', 'InnovateLabs',
        'DigitalFlow Inc', 'TechVantage Ltd', 'DataCore Systems', 'CloudMind Technologies',
        'StreamTech Solutions', 'FlowLogic Corp', 'DataBridge Industries', 'TechFlow Dynamics',
        'CloudStream LLC', 'DataTech Ventures', 'FlowNet Systems', 'TechCore Solutions',
        'DataFlow Innovations', 'CloudTech Industries', 'StreamFlow Technologies', 'TechData Corp', 'FlowSystems Ltd'
      ];
      
      return {
        id: orgId,
        name: vendorNames[index % vendorNames.length] || `Vendor_${orgId.slice(-6)}`,
        email: `contact@${vendorNames[index % vendorNames.length]?.toLowerCase().replace(/\s+/g, '') || `vendor${index + 1}`}.com`,
        phone: `+49-${Math.floor(Math.random() * 900000000 + 100000000)}`,
        address: `${vendorNames[index % vendorNames.length]?.split(' ')[0] || 'Vendor'} Street ${index + 1}, ${10115 + index}, Berlin, Germany`,
        taxId: `DE${Math.floor(Math.random() * 900000000 + 100000000)}`,
        createdAt: new Date(sampleRecord.createdAt.$date),
        updatedAt: new Date(sampleRecord.updatedAt.$date)
      };
    });

    console.log('👥 Creating vendors...');
    await prisma.vendor.createMany({ data: vendorData });

    // Create customers from departments
    const customerData = uniqueDepts.map((deptId, index) => {
      const deptRecords = analyticsData.filter(r => r.departmentId === deptId);
      const sampleRecord = deptRecords[0];
      
      // Generate realistic customer/department names
      const customerNames = [
        'Marketing Department', 'Sales Division', 'IT Operations', 'Finance Team',
        'Human Resources', 'Product Development', 'Customer Support', 'Research & Development',
        'Quality Assurance', 'Business Development', 'Operations Center', 'Strategic Planning',
        'Data Analytics', 'Security Operations', 'Infrastructure Team', 'Digital Marketing',
        'Client Relations', 'Project Management', 'Compliance Office', 'Innovation Lab'
      ];
      
      return {
        id: deptId,
        name: customerNames[index % customerNames.length] || `Department_${deptId.slice(-6)}`,
        email: `${customerNames[index % customerNames.length]?.toLowerCase().replace(/\s+/g, '.').replace('&', 'and') || `dept${index + 1}`}@flowbit.com`,
        phone: `+49-${Math.floor(Math.random() * 900000000 + 100000000)}`,
        address: `Flowbit Campus, Building ${String.fromCharCode(65 + (index % 26))}, Floor ${(index % 10) + 1}, 20095 Hamburg, Germany`,
        createdAt: new Date(sampleRecord.createdAt.$date),
        updatedAt: new Date(sampleRecord.updatedAt.$date)
      };
    });

    console.log('🏢 Creating customers...');
    await prisma.customer.createMany({ data: customerData });

    // Process invoices (limit to 150 for better performance)
    const recordsToProcess = analyticsData
      .filter(record => uniqueOrgs.includes(record.organizationId) && uniqueDepts.includes(record.departmentId))
      .slice(0, 150);
    
    console.log(`📄 Creating ${recordsToProcess.length} invoices...`);

    let totalRevenue = 0;
    const invoiceData = [];
    const lineItemData = [];
    const paymentData = [];

    for (const [index, record] of recordsToProcess.entries()) {
      // Generate realistic invoice amount based on file size and type
      const fileSizeBytes = parseInt(record.fileSize.$numberLong);
      let baseAmount = Math.max(Math.min(fileSizeBytes / 8, 8000), 150);
      
      // Adjust based on file type
      if (record.fileType === 'pdf') baseAmount *= 1.2;
      if (record.name.toLowerCase().includes('invoice')) baseAmount *= 1.5;
      if (record.name.toLowerCase().includes('contract')) baseAmount *= 2.0;
      
      const amount = Math.round(baseAmount * (0.7 + Math.random() * 0.6) * 100) / 100;
      totalRevenue += amount;

      // Generate invoice number with year and sequence
      const invoiceYear = new Date(record.createdAt.$date).getFullYear();
      const invoiceNumber = `INV-${invoiceYear}${String(index + 1).padStart(4, '0')}`;

      // Generate realistic due date (15-45 days from issue date)
      const issueDate = new Date(record.createdAt.$date);
      const dueDate = new Date(issueDate.getTime() + (Math.random() * 30 + 15) * 24 * 60 * 60 * 1000);

      // Determine status based on validation and due date
      let status: 'pending' | 'paid' | 'overdue' = 'pending';
      if (record.isValidatedByHuman) {
        status = 'paid';
      } else if (new Date() > dueDate) {
        status = Math.random() > 0.3 ? 'overdue' : 'pending';
      }

      // Create invoice
      const invoice = {
        id: record._id,
        invoiceNumber,
        vendorId: record.organizationId,
        customerId: record.departmentId,
        issueDate,
        dueDate,
        totalAmount: amount,
        subtotalAmount: Math.round(amount / 1.19 * 100) / 100, // Amount without tax
        currency: 'EUR',
        status,
        taxAmount: Math.round(amount * 0.19 * 100) / 100, // 19% VAT
        description: `Professional services for ${record.name.replace('.pdf', '').replace(/[_-]/g, ' ')}`,
        filePath: record.filePath,
        createdAt: new Date(record.createdAt.$date),
        updatedAt: new Date(record.updatedAt.$date)
      };

      invoiceData.push(invoice);

      // Create line items (1-4 per invoice)
      const numLineItems = Math.floor(Math.random() * 4) + 1;
      const itemTypes = [
        'Consulting Services', 'Software License', 'Technical Support', 'Data Processing',
        'System Integration', 'Training Services', 'Maintenance Contract', 'Custom Development',
        'Security Audit', 'Performance Optimization', 'Cloud Migration', 'Analytics Setup'
      ];

      for (let i = 0; i < numLineItems; i++) {
        const itemAmount = amount / numLineItems;
        const quantity = Math.floor(Math.random() * 8) + 1;
        const unitPrice = Math.round((itemAmount / quantity) * 100) / 100;

        lineItemData.push({
          id: `${record._id}_item_${i + 1}`,
          invoiceId: record._id,
          description: `${itemTypes[Math.floor(Math.random() * itemTypes.length)]} - ${record.name.split('.')[0].replace(/[_-]/g, ' ')}`,
          quantity,
          unitPrice,
          totalPrice: Math.round(itemAmount * 100) / 100,
          taxRate: 0.19
        });
      }

      // Create payment if invoice is paid
      if (status === 'paid') {
        const paymentMethods = ['bank_transfer', 'credit_card', 'paypal', 'wire_transfer'];
        const paymentDate = new Date(
          Math.max(
            dueDate.getTime() - (Math.random() * 20 * 24 * 60 * 60 * 1000), // Up to 20 days before due date
            issueDate.getTime() + (24 * 60 * 60 * 1000) // At least 1 day after issue date
          )
        );

        paymentData.push({
          id: `payment_${record._id}`,
          invoiceId: record._id,
          amount,
          paymentDate,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          status: 'completed',
          reference: `PAY-${invoiceYear}${String(index + 1).padStart(4, '0')}`
        });
      }
    }

    // Bulk insert data with progress logging
    console.log('💾 Inserting invoices...');
    await prisma.invoice.createMany({ data: invoiceData });

    console.log('📝 Inserting line items...');
    await prisma.lineItem.createMany({ data: lineItemData });

    console.log('💳 Inserting payments...');
    if (paymentData.length > 0) {
      await prisma.payment.createMany({ data: paymentData });
    }

    // Calculate final statistics
    const stats = await prisma.invoice.aggregate({
      _sum: { totalAmount: true, taxAmount: true },
      _count: true
    });

    const paidInvoices = await prisma.invoice.count({
      where: { status: 'paid' }
    });

    const overdueInvoices = await prisma.invoice.count({
      where: { status: 'overdue' }
    });

    console.log('✅ Analytics data seeding completed successfully!');
    console.log('📊 Seeding Summary:');
    console.log(`   - Vendors: ${vendorData.length}`);
    console.log(`   - Customers: ${customerData.length}`);
    console.log(`   - Invoices: ${invoiceData.length}`);
    console.log(`   - Line Items: ${lineItemData.length}`);
    console.log(`   - Payments: ${paymentData.length}`);
    console.log(`   - Total Revenue: €${stats._sum.totalAmount?.toFixed(2) || '0.00'}`);
    console.log(`   - Total Tax: €${stats._sum.taxAmount?.toFixed(2) || '0.00'}`);
    console.log(`   - Paid Invoices: ${paidInvoices}/${stats._count}`);
    console.log(`   - Overdue Invoices: ${overdueInvoices}/${stats._count}`);
    console.log(`   - Pending Invoices: ${stats._count - paidInvoices - overdueInvoices}/${stats._count}`);

    return {
      success: true,
      stats: {
        vendors: vendorData.length,
        customers: customerData.length,
        invoices: invoiceData.length,
        lineItems: lineItemData.length,
        payments: paymentData.length,
        totalRevenue: stats._sum.totalAmount || 0,
        totalTax: stats._sum.taxAmount || 0,
        paidInvoices: paidInvoices,
        overdueInvoices: overdueInvoices,
        pendingInvoices: stats._count - paidInvoices - overdueInvoices
      }
    };

  } catch (error) {
    console.error('❌ Error seeding analytics data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for API usage
export { seedAnalyticsData };

// Run if called directly
if (require.main === module) {
  seedAnalyticsData()
    .then((result) => {
      console.log('🎉 Seeding successful:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}