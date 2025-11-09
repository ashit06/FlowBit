import { PrismaClient } from '@prisma/client'
import { ingestFlowbitData } from '../scripts/ingest-flowbit-data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with real Flowbit Analytics data...')
  
  try {
    // Use the real Flowbit analytics data
    await ingestFlowbitData()
    
    console.log('✅ Real Flowbit Analytics data seeded successfully!')
  } catch (error) {
    console.error('❌ Failed to seed with real data, falling back to sample data:', error)
    
    // Fallback to basic sample data if real data fails
    console.log('🔄 Creating fallback sample data...')
    
    // Create a basic customer
    const customer = await prisma.customer.create({
      data: {
        name: 'Sample Customer',
        email: 'customer@example.com',
        phone: '+49-123-456-789',
        address: 'Sample Address, Germany'
      }
    })

    // Create a basic vendor  
    const vendor = await prisma.vendor.create({
      data: {
        name: 'Sample Vendor',
        email: 'vendor@example.com',
        phone: '+49-987-654-321', 
        address: 'Sample Vendor Address, Germany',
        taxId: 'DE123456789'
      }
    })

    // Create a basic invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAMPLE-001',
        vendorId: vendor.id,
        customerId: customer.id,
        totalAmount: 1000.00,
        subtotalAmount: 840.34,
        taxAmount: 159.66,
        status: 'PAID',
        category: 'Sample',
        description: 'Sample invoice for testing',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    })

    // Create a line item
    await prisma.lineItem.create({
      data: {
        invoiceId: invoice.id,
        description: 'Sample Service',
        quantity: 1,
        unitPrice: 840.34,
        totalPrice: 840.34,
        category: 'Services'
      }
    })

    console.log('✅ Fallback sample data created successfully!')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
