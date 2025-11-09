import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface AnalyticsRecord {
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
    llmData: {
      invoice?: {
        value: {
          invoiceId?: { value: string }
          invoiceDate?: { value: string }
          deliveryDate?: { value: string }
        }
      }
      vendor?: {
        value: {
          vendorName?: { value: string }
          vendorAddress?: { value: string }
          vendorTaxId?: { value: string }
        }
      }
      customer?: {
        value: {
          customerName?: { value: string }
          customerAddress?: { value: string }
          customerTaxId?: string
        }
      }
      payment?: {
        value: {
          dueDate?: { value: string }
          paymentTerms?: { value: string }
          bankAccountNumber?: { value: string }
          netDays?: number
          discountPercentage?: number
        }
      }
      summary?: {
        value: {
          subTotal?: { value: number }
          totalTax?: { value: number }
          invoiceTotal?: { value: number }
          documentType?: string
          currencySymbol?: string
        }
      }
      lineItems?: {
        value: {
          items?: {
            value: Array<{
              srNo?: { value: number }
              description?: { value: string }
              quantity?: { value: number }
              unitPrice?: { value: number }
              totalPrice?: { value: number }
              vatRate?: { value: number }
              vatAmount?: { value: number }
              Sachkonto?: { value: string | number }
              BUSchluessel?: { value: string | number }
            }>
          }
        }
      }
    }
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

async function ingestRealAnalyticsData() {
  console.log('🚀 Starting real Analytics data ingestion...')
  
  try {
    // Read the real analytics data file
    const dataPath = path.join(process.cwd(), '../../../data/Analytics_Test_Data.json')
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Analytics data file not found at: ${dataPath}`)
    }

    console.log(`📂 Reading data from: ${dataPath}`)
    const rawData = fs.readFileSync(dataPath, 'utf-8')
    const analyticsData: AnalyticsRecord[] = JSON.parse(rawData)
    
    console.log(`📊 Found ${analyticsData.length} analytics records`)

    // Clear existing data
    console.log('🗑️ Clearing existing data...')
    await prisma.payment.deleteMany()
    await prisma.lineItem.deleteMany() 
    await prisma.invoice.deleteMany()
    await prisma.vendor.deleteMany()
    await prisma.customer.deleteMany()

    let processedCount = 0
    let vendorMap = new Map<string, string>()
    let customerMap = new Map<string, string>()

    // Process each analytics record
    for (const record of analyticsData) {
      try {
        const llmData = record.extractedData?.llmData
        if (!llmData || typeof llmData === 'string') {
          console.log(`⚠️ Skipping ${record._id} - invalid LLM data`)
          continue
        }

        // Extract core data
        const invoiceInfo = llmData.invoice?.value
        const vendorInfo = llmData.vendor?.value  
        const customerInfo = llmData.customer?.value
        const paymentInfo = llmData.payment?.value
        const summaryInfo = llmData.summary?.value
        const lineItemsInfo = llmData.lineItems?.value?.items?.value

        // Skip if missing essential data
        if (!invoiceInfo?.invoiceId?.value || !summaryInfo?.invoiceTotal?.value) {
          console.log(`⚠️ Skipping ${record._id} - missing required invoice data`)
          continue
        }

        // Create/get vendor
        let vendorId: string | null = null
        if (vendorInfo?.vendorName?.value) {
          const vendorKey = vendorInfo.vendorName.value.trim()
          if (!vendorMap.has(vendorKey)) {
            const vendor = await prisma.vendor.create({
              data: {
                name: vendorKey,
                email: generateEmail(vendorKey),
                phone: '+49-30-' + Math.floor(Math.random() * 90000000 + 10000000),
                address: vendorInfo.vendorAddress?.value || `${vendorKey} Address, Germany`,
                taxId: vendorInfo.vendorTaxId?.value || generateTaxId('DE')
              }
            })
            vendorMap.set(vendorKey, vendor.id)
            vendorId = vendor.id
          } else {
            vendorId = vendorMap.get(vendorKey)!
          }
        }

        // Create/get customer  
        let customerId: string | null = null
        if (customerInfo?.customerName?.value) {
          const customerKey = customerInfo.customerName.value.trim()
          if (!customerMap.has(customerKey)) {
            const customer = await prisma.customer.create({
              data: {
                name: customerKey,
                email: generateEmail(customerKey, 'billing'),
                phone: '+49-89-' + Math.floor(Math.random() * 90000000 + 10000000),
                address: customerInfo.customerAddress?.value || `${customerKey} Address, Germany`
              }
            })
            customerMap.set(customerKey, customer.id)
            customerId = customer.id
          } else {
            customerId = customerMap.get(customerKey)!
          }
        }

        // Determine invoice status
        const status = determineInvoiceStatus(record)
        
        // Parse dates safely
        const issueDate = parseDate(invoiceInfo.invoiceDate?.value, record.createdAt.$date)
        const dueDate = parseDate(paymentInfo?.dueDate?.value, null)

        // Skip if no vendor (required field)
        if (!vendorId) {
          console.log(`⚠️ Skipping ${record._id} - no vendor data`)
          continue
        }

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: invoiceInfo.invoiceId.value,
            vendorId,
            customerId: customerId || undefined, 
            issueDate,
            dueDate,
            totalAmount: Math.abs(summaryInfo.invoiceTotal.value),
            subtotalAmount: Math.abs(summaryInfo.subTotal?.value || summaryInfo.invoiceTotal.value * 0.84),
            taxAmount: Math.abs(summaryInfo.totalTax?.value || summaryInfo.invoiceTotal.value * 0.16),
            currency: (summaryInfo.currencySymbol as any)?.value === '€' ? 'EUR' : 'USD',
            status,
            category: determineCategory(record.name, lineItemsInfo),
            description: `Invoice from ${record.name}`
          }
        })

        // Create line items
        if (lineItemsInfo && Array.isArray(lineItemsInfo)) {
          for (const item of lineItemsInfo) {
            if (item.description?.value && item.quantity?.value != null && item.unitPrice?.value != null) {
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

        // Create payment if invoice is paid
        if (status === 'PAID' && paymentInfo?.bankAccountNumber?.value) {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: Math.abs(summaryInfo.invoiceTotal.value),
              paymentDate: issueDate,
              method: 'BANK_TRANSFER',
              reference: paymentInfo.bankAccountNumber.value.substring(0, 20),
              status: 'COMPLETED'
            }
          })
        }

        processedCount++
        
        if (processedCount % 20 === 0) {
          console.log(`✅ Processed ${processedCount} records...`)
        }

      } catch (error) {
        console.error(`❌ Error processing record ${record._id}:`, error)
      }
    }

    // Print final summary
    const summary = await getDatabaseSummary()
    console.log('\n🎉 Real Analytics data ingestion completed!')
    console.log(`✅ Successfully processed: ${processedCount} records`)
    console.log('\n📊 Final Database Summary:')
    console.log(`- Vendors: ${summary.vendors}`)
    console.log(`- Customers: ${summary.customers}`)
    console.log(`- Invoices: ${summary.invoices}`) 
    console.log(`- Line Items: ${summary.lineItems}`)
    console.log(`- Payments: ${summary.payments}`)
    console.log(`- Total Invoice Value: €${summary.totalValue.toLocaleString()}`)

    return summary

  } catch (error) {
    console.error('❌ Data ingestion failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Helper functions
function parseDate(dateStr: string | undefined, fallback: string | null): Date {
  if (dateStr) {
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) return parsed
  }
  if (fallback) {
    const parsed = new Date(fallback)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function determineInvoiceStatus(record: AnalyticsRecord): 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' {
  if (record.isValidatedByHuman) return 'PAID'
  if (record.status === 'processed') return 'SENT'
  return 'PENDING'
}

function determineCategory(fileName: string, lineItems?: any[]): string {
  const name = fileName.toLowerCase()
  
  if (name.includes('gutschrift') || name.includes('credit')) return 'Credit Note'
  if (name.includes('template') || name.includes('vorlage')) return 'Template'
  if (name.includes('marketing')) return 'Marketing'
  if (name.includes('consulting') || name.includes('beratung')) return 'Consulting'
  
  // Analyze line items
  if (lineItems && lineItems.length > 0) {
    const descriptions = lineItems
      .map(item => item.description?.value?.toLowerCase() || '')
      .join(' ')
    
    if (descriptions.includes('software') || descriptions.includes('license')) return 'Software'
    if (descriptions.includes('hardware') || descriptions.includes('equipment')) return 'Equipment'
    if (descriptions.includes('service') || descriptions.includes('dienstleistung')) return 'Services'
    if (descriptions.includes('material') || descriptions.includes('supply')) return 'Materials'
  }
  
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
  
  return 'General'
}

function generateEmail(name: string, prefix: string = 'contact'): string {
  const domain = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10) + '.de'
  return `${prefix}@${domain}`
}

function generateTaxId(countryCode: string): string {
  return `${countryCode}${Math.floor(Math.random() * 900000000 + 100000000)}`
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
    totalValue: totalValue._sum.totalAmount || 0
  }
}

// Run if called directly
if (require.main === module) {
  ingestRealAnalyticsData()
    .then(() => {
      console.log('✅ Analytics data ingestion completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Analytics data ingestion failed:', error)
      process.exit(1)
    })
}

export { ingestRealAnalyticsData }