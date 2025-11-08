import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface AnalyticsData {
  [key: string]: any;
}

async function ingestData() {
  try {
    console.log('Starting data ingestion...');
    
    // Read the JSON file
    const dataPath = path.join(__dirname, '../../../data/Analytics_Test_Data.json');
    
    if (!fs.existsSync(dataPath)) {
      console.error('Analytics_Test_Data.json not found in data directory');
      console.log('Please place the file at:', dataPath);
      return;
    }
    
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const analyticsData: AnalyticsData[] = JSON.parse(rawData);
    
    console.log(`Found ${analyticsData.length} records to process`);
    
    for (const record of analyticsData) {
      try {
        // Create or find vendor
        const vendorName = record.vendor?.name || 'Unknown Vendor';
        let vendor = await prisma.vendor.findFirst({
          where: { name: vendorName }
        });
        
        if (!vendor) {
          vendor = await prisma.vendor.create({
            data: {
              name: vendorName,
              email: record.vendor?.email,
              phone: record.vendor?.phone,
              address: record.vendor?.address,
              taxId: record.vendor?.taxId,
            }
          });
        }
        
        // Create or find customer if exists
        let customer = null;
        if (record.customer?.name) {
          customer = await prisma.customer.findFirst({
            where: { name: record.customer.name }
          });
          
          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                name: record.customer.name,
                email: record.customer.email,
                phone: record.customer.phone,
                address: record.customer.address,
              }
            });
          }
        }
        
        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: record.invoiceNumber || `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            vendorId: vendor.id,
            customerId: customer?.id,
            issueDate: new Date(record.issueDate || record.date || Date.now()),
            dueDate: record.dueDate ? new Date(record.dueDate) : null,
            totalAmount: parseFloat(record.totalAmount || record.amount || 0),
            taxAmount: parseFloat(record.taxAmount || record.tax || 0),
            subtotalAmount: parseFloat(record.subtotalAmount || record.subtotal || record.amount || 0),
            currency: record.currency || 'USD',
            status: mapStatus(record.status),
            category: record.category || 'General',
            description: record.description || record.memo,
          }
        });
        
        // Create line items if they exist
        if (record.lineItems && Array.isArray(record.lineItems)) {
          for (const lineItem of record.lineItems) {
            await prisma.lineItem.create({
              data: {
                invoiceId: invoice.id,
                description: lineItem.description || 'No description',
                quantity: parseFloat(lineItem.quantity || 1),
                unitPrice: parseFloat(lineItem.unitPrice || lineItem.price || 0),
                totalPrice: parseFloat(lineItem.totalPrice || lineItem.total || 0),
                category: lineItem.category,
              }
            });
          }
        }
        
        // Create payment records if they exist
        if (record.payments && Array.isArray(record.payments)) {
          for (const payment of record.payments) {
            await prisma.payment.create({
              data: {
                invoiceId: invoice.id,
                amount: parseFloat(payment.amount || 0),
                paymentDate: new Date(payment.date || payment.paymentDate || Date.now()),
                method: mapPaymentMethod(payment.method),
                reference: payment.reference || payment.transactionId,
                status: mapPaymentStatus(payment.status),
              }
            });
          }
        }
        
        console.log(`✓ Processed invoice: ${invoice.invoiceNumber}`);
        
      } catch (recordError) {
        console.error(`Error processing record:`, recordError);
        continue;
      }
    }
    
    console.log('Data ingestion completed successfully!');
    
    // Print summary statistics
    const stats = await generateSummaryStats();
    console.log('\n=== Summary Statistics ===');
    console.log(stats);
    
  } catch (error) {
    console.error('Error during data ingestion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function mapStatus(status: string): any {
  if (!status) return 'PENDING';
  
  const statusMap: { [key: string]: string } = {
    'draft': 'DRAFT',
    'pending': 'PENDING',
    'sent': 'SENT',
    'paid': 'PAID',
    'overdue': 'OVERDUE',
    'cancelled': 'CANCELLED',
    'canceled': 'CANCELLED',
  };
  
  return statusMap[status.toLowerCase()] || 'PENDING';
}

function mapPaymentMethod(method: string): any {
  if (!method) return 'BANK_TRANSFER';
  
  const methodMap: { [key: string]: string } = {
    'cash': 'CASH',
    'bank_transfer': 'BANK_TRANSFER',
    'wire': 'BANK_TRANSFER',
    'credit_card': 'CREDIT_CARD',
    'card': 'CREDIT_CARD',
    'check': 'CHECK',
    'cheque': 'CHECK',
  };
  
  return methodMap[method.toLowerCase()] || 'OTHER';
}

function mapPaymentStatus(status: string): any {
  if (!status) return 'COMPLETED';
  
  const statusMap: { [key: string]: string } = {
    'pending': 'PENDING',
    'completed': 'COMPLETED',
    'success': 'COMPLETED',
    'failed': 'FAILED',
    'cancelled': 'CANCELLED',
    'canceled': 'CANCELLED',
  };
  
  return statusMap[status.toLowerCase()] || 'COMPLETED';
}

async function generateSummaryStats() {
  const [
    totalInvoices,
    totalVendors,
    totalCustomers,
    totalLineItems,
    totalPayments,
    totalSpend
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.vendor.count(),
    prisma.customer.count(),
    prisma.lineItem.count(),
    prisma.payment.count(),
    prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
      },
    }),
  ]);
  
  return {
    totalInvoices,
    totalVendors,
    totalCustomers,
    totalLineItems,
    totalPayments,
    totalSpend: totalSpend._sum.totalAmount || 0,
  };
}

// Run the ingestion if this file is executed directly
if (require.main === module) {
  ingestData().catch(console.error);
}

export { ingestData };