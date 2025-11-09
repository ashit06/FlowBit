import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

interface FlowbitAnalyticsData {
  _id: string
  name: string
  filePath: string
  fileSize: { $numberLong: string }
  fileType: string
  status: string
  organizationId: string
  departmentId: string
  createdAt: { $date: string }
  updatedAt: { $date: string }
  extractedData: {
    llmData: any
  }
  analyticsId?: string
  processedAt?: { $date: string }
  validatedData?: {
    lastValidatedAt: string
    validatedBy: string
    status: string
  }
  isValidatedByHuman?: boolean
}

export async function ingestFlowbitData(): Promise<void> {
  console.log('🚀 Starting Flowbit Analytics data ingestion...')
  
  try {
    // Try multiple possible paths for the analytics data
    const possiblePaths = [
      path.join(process.cwd(), '../../../Analytics_Test_Data.json'),
      path.join(process.cwd(), '../../../data/Analytics_Test_Data.json'),
      path.join(process.cwd(), '../../Analytics_Test_Data.json'),
      path.join(process.cwd(), '../../data/Analytics_Test_Data.json')
    ]
    
    let dataPath = ''
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        dataPath = testPath
        break
      }
    }
    
    if (!dataPath) {
      throw new Error('Analytics_Test_Data.json not found in expected locations')
    }

    console.log(`📂 Reading Analytics data from: ${dataPath}`)
    const rawData = fs.readFileSync(dataPath, 'utf-8')
    const analyticsRecords: FlowbitAnalyticsData[] = JSON.parse(rawData)
    
    console.log(`📊 Found ${analyticsRecords.length} analytics records`)

    // Clear existing data
    console.log('🗑️ Clearing existing data...')
    await prisma.payment.deleteMany()
    await prisma.lineItem.deleteMany() 
    await prisma.invoice.deleteMany()
    await prisma.vendor.deleteMany()
    await prisma.customer.deleteMany()

    let processedCount = 0
    let skippedCount = 0

    // Process each record
    for (const record of analyticsRecords) {
      try {
        if (!record.extractedData?.llmData) {
          skippedCount++
          continue
        }

        const llmData = record.extractedData.llmData
        
        // Handle different data structures
        let invoiceData, vendorData, customerData, summaryData, lineItemsData
        
        if (typeof llmData === 'string') {
          // Skip records with string-only LLM data
          skippedCount++
          continue
        }

        // Extract nested data safely
        invoiceData = llmData.invoice?.value
        vendorData = llmData.vendor?.value  
        customerData = llmData.customer?.value
        summaryData = llmData.summary?.value
        lineItemsData = llmData.lineItems?.value?.items?.value

        // Must have basic invoice info
        if (!invoiceData?.invoiceId?.value || !summaryData?.invoiceTotal?.value) {
          skippedCount++
          continue
        }

        // Create or find vendor
        let vendor = null
        if (vendorData?.vendorName?.value) {
          // Try to find existing vendor first
          vendor = await prisma.vendor.findFirst({
            where: { name: vendorData.vendorName.value }
          })
          
          if (!vendor) {
            vendor = await prisma.vendor.create({
              data: {
                name: vendorData.vendorName.value,
                email: generateEmail(vendorData.vendorName.value),
                phone: generatePhone(),
                address: vendorData.vendorAddress?.value || 'Address not provided',
                taxId: vendorData.vendorTaxId?.value || generateTaxId()
              }
            })
          }
        }

        // Create or find customer
        let customer = null
        if (customerData?.customerName?.value) {
          // Try to find existing customer first
          customer = await prisma.customer.findFirst({
            where: { name: customerData.customerName.value }
          })
          
          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                name: customerData.customerName.value,
                email: generateEmail(customerData.customerName.value, 'billing'),
                phone: generatePhone(),
                address: customerData.customerAddress?.value || 'Address not provided'
              }
            })
          }
        }

        // Must have vendor for invoice creation
        if (!vendor) {
          skippedCount++
          continue
        }

        // Determine status
        let status: 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' = 'PENDING'
        if (record.isValidatedByHuman) status = 'PAID'
        else if (record.status === 'processed') status = 'SENT'

        // Parse dates
        const issueDate = parseDate(invoiceData.invoiceDate?.value) || new Date(record.createdAt.$date)
        const dueDate = parseDate(llmData.payment?.value?.dueDate?.value)

        // Extract invoice number
        const invoiceNumber = invoiceData.invoiceId.value

        // Handle negative values (credit notes)
        const totalAmount = Math.abs(summaryData.invoiceTotal.value)
        const subtotalAmount = Math.abs(summaryData.subTotal?.value || totalAmount * 0.84)
        const taxAmount = Math.abs(summaryData.totalTax?.value || totalAmount * 0.16)

        // Check if invoice already exists to avoid duplicates
        const existingInvoice = await prisma.invoice.findFirst({
          where: { invoiceNumber }
        })

        if (existingInvoice) {
          console.log(`⏭️ Skipping duplicate invoice: ${invoiceNumber}`)
          continue
        }

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            vendorId: vendor.id,
            customerId: customer ? customer.id : null,
            issueDate,
            dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now if no due date
            totalAmount: totalAmount + taxAmount,
            taxAmount,
            subtotalAmount,
            status,
          },
        })

        // Create line items
        if (lineItemsData && Array.isArray(lineItemsData)) {
          for (const item of lineItemsData) {
            if (item.description?.value && item.quantity?.value && item.unitPrice?.value) {
              await prisma.lineItem.create({
                data: {
                  invoiceId: invoice.id,
                  description: item.description.value,
                  quantity: Math.abs(item.quantity.value),
                  unitPrice: Math.abs(item.unitPrice.value),
                  totalPrice: Math.abs(item.totalPrice?.value || (item.quantity.value * item.unitPrice.value)),
                  category: categorizeLineItem(item.description.value)
                }
              })
            }
          }
        }

        // Create payment if paid
        if (status === 'PAID') {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: totalAmount,
              paymentDate: issueDate,
              method: 'BANK_TRANSFER',
              reference: invoice.invoiceNumber,
              status: 'COMPLETED'
            }
          })
        }

        processedCount++
        
        if (processedCount % 25 === 0) {
          console.log(`✅ Processed ${processedCount} records...`)
        }

      } catch (error) {
        console.error(`❌ Error processing record ${record._id}:`, error)
        skippedCount++
      }
    }

    // Final summary
    const summary = await getDatabaseSummary()
    console.log('\n🎉 Flowbit Analytics data ingestion completed!')
    console.log(`✅ Successfully processed: ${processedCount} invoices`)
    console.log(`⚠️ Skipped: ${skippedCount} records`)
    console.log('\n📊 Database Summary:')
    console.log(`- Vendors: ${summary.vendors}`)
    console.log(`- Customers: ${summary.customers}`)
    console.log(`- Invoices: ${summary.invoices}`)
    console.log(`- Line Items: ${summary.lineItems}`)
    console.log(`- Payments: ${summary.payments}`)
    console.log(`- Total Value: €${summary.totalValue.toLocaleString()}`)

  } catch (error) {
    console.error('❌ Flowbit data ingestion failed:', error)
    throw error
  }
}

// Helper functions
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  
  try {
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

function getCurrency(summaryData: any): string {
  if (summaryData.currencySymbol?.value === '€') return 'EUR'
  if (summaryData.currencySymbol?.value === '$') return 'USD'
  if (summaryData.currencySymbol?.value === '£') return 'GBP'
  return 'EUR' // Default to EUR for German invoices
}

function determineCategory(fileName: string): string {
  const name = fileName.toLowerCase()
  
  if (name.includes('gutschrift') || name.includes('credit')) return 'Credit Note'
  if (name.includes('template') || name.includes('vorlage')) return 'Template'
  if (name.includes('marketing')) return 'Marketing'
  if (name.includes('consulting') || name.includes('beratung')) return 'Consulting'
  if (name.includes('invoice') || name.includes('rechnung')) return 'Standard Invoice'
  
  return 'General'
}

function categorizeLineItem(description: string): string {
  const desc = description.toLowerCase()
  
  if (desc.includes('software') || desc.includes('license')) return 'Software'
  if (desc.includes('hardware') || desc.includes('equipment')) return 'Hardware'
  if (desc.includes('consulting') || desc.includes('beratung')) return 'Consulting'
  if (desc.includes('marketing') || desc.includes('werbung')) return 'Marketing'
  if (desc.includes('service') || desc.includes('dienstleistung')) return 'Services'
  if (desc.includes('material') || desc.includes('supply')) return 'Materials'
  if (desc.includes('arbeit') || desc.includes('work') || desc.includes('hour')) return 'Labor'
  
  return 'Other'
}

function generateEmail(name: string, prefix: string = 'contact'): string {
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .substring(0, 15)
  
  return `${prefix}@${cleanName}.de`
}

function generatePhone(): string {
  return `+49-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000000 + 1000000)}`
}

function generateTaxId(): string {
  return `DE${Math.floor(Math.random() * 900000000 + 100000000)}`
}

async function getDatabaseSummary() {
  const [vendors, customers, invoices, lineItems, payments] = await Promise.all([
    prisma.vendor.count(),
    prisma.customer.count(),
    prisma.invoice.count(),
    prisma.lineItem.count(),
    prisma.payment.count()
  ])

  const totalValue = await prisma.invoice.aggregate({
    _sum: { totalAmount: true }
  })

  return {
    vendors,
    customers,
    invoices,
    lineItems,
    payments,
    totalValue: Number(totalValue._sum.totalAmount) || 0
  }
}

// CLI execution
if (require.main === module) {
  ingestFlowbitData()
    .then(() => {
      console.log('✅ Flowbit Analytics data ingestion completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Ingestion failed:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}