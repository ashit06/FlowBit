#!/bin/bash

# Render.com PostgreSQL Setup Script for Flowbit Analytics
echo "🚀 Setting up Render.com PostgreSQL connection..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}✅ Render.com PostgreSQL Database Configured!${NC}"
echo -e "${BLUE}Database Details:${NC}"
echo "Host: dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com"
echo "Database: flowbit_dsmj"
echo "User: flowbit_dsmj_user"
echo "Port: 5432"
echo ""

echo -e "${BLUE}🔧 Setting up the database schema...${NC}"

# Navigate to API directory and push schema
cd apps/api

echo -e "${YELLOW}� Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🔄 Pushing database schema to Render PostgreSQL...${NC}"
npx prisma generate
npx prisma db push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema pushed successfully!${NC}"
    
    echo -e "${YELLOW}� Seeding sample data...${NC}"
    # Create seed script if it doesn't exist
    if [ ! -f "prisma/seed.ts" ]; then
        echo -e "${BLUE}Creating seed script...${NC}"
        cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create customers
  const customer = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Acme Corporation',
      email: 'billing@acme.com',
      address: '123 Business St, San Francisco, CA'
    }
  })

  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { id: 1 },
      update: {},
      create: { name: 'Phunk GmbH', contactEmail: 'contact@phunk.de' }
    }),
    prisma.vendor.upsert({
      where: { id: 2 },
      update: {},
      create: { name: 'Tech Solutions Ltd', contactEmail: 'info@techsolutions.com' }
    }),
    prisma.vendor.upsert({
      where: { id: 3 },
      update: {},
      create: { name: 'Global Supply Co', contactEmail: 'orders@globalsupply.com' }
    })
  ])

  // Create invoices
  const invoices = await Promise.all([
    prisma.invoice.upsert({
      where: { id: 1 },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-001',
        customerId: customer.id,
        vendorId: vendors[0].id,
        totalAmount: 736.78,
        status: 'PAID',
        issueDate: new Date('2024-08-19'),
        dueDate: new Date('2024-09-19')
      }
    }),
    prisma.invoice.upsert({
      where: { id: 2 },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-002',
        customerId: customer.id,
        vendorId: vendors[1].id,
        totalAmount: 2450.00,
        status: 'PAID',
        issueDate: new Date('2024-08-16'),
        dueDate: new Date('2024-09-16')
      }
    }),
    prisma.invoice.upsert({
      where: { id: 3 },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-003',
        customerId: customer.id,
        vendorId: vendors[2].id,
        totalAmount: 1200.00,
        status: 'PENDING',
        issueDate: new Date('2024-08-17'),
        dueDate: new Date('2024-09-17')
      }
    })
  ])

  // Create line items
  await Promise.all([
    prisma.lineItem.create({
      data: {
        invoiceId: invoices[0].id,
        description: 'Marketing Services',
        quantity: 1,
        unitPrice: 736.78,
        totalPrice: 736.78
      }
    }),
    prisma.lineItem.create({
      data: {
        invoiceId: invoices[1].id,
        description: 'Operations Consulting',
        quantity: 1,
        unitPrice: 2450.00,
        totalPrice: 2450.00
      }
    }),
    prisma.lineItem.create({
      data: {
        invoiceId: invoices[2].id,
        description: 'Facilities Management',
        quantity: 1,
        unitPrice: 1200.00,
        totalPrice: 1200.00
      }
    })
  ])

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
EOF

        # Add seed script to package.json
        npm pkg set prisma.seed="ts-node prisma/seed.ts"
        npm install -D ts-node
    fi
    
    # Run the seed
    npx prisma db seed
    
    echo -e "${GREEN}✅ Database setup complete!${NC}"
else
    echo -e "${RED}❌ Failed to push schema. Please check your connection.${NC}"
    exit 1
fi

cd ../..

echo ""
echo -e "${BLUE}� Ready to start the application:${NC}"
echo "1. Start API server: cd apps/api && npm run dev"
echo "2. Start AI service: cd services/vanna && python3 main.py"
echo "3. Start frontend: cd apps/web && npm run dev"
echo ""
echo -e "${GREEN}🎉 Your Render.com PostgreSQL database is now configured and ready!${NC}"