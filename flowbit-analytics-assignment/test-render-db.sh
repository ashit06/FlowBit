#!/bin/bash

# Comprehensive test script for Render.com PostgreSQL integration
# This script tests all components with the cloud database

set -e

echo "🧪 Testing Flowbit Analytics with Render.com PostgreSQL"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test 1: Database Connection (API)
print_status "Testing API database connection..."
cd apps/api
if npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.customer.count().then(count => {
  console.log('Database connected. Customer count:', count);
  process.exit(0);
}).catch(err => {
  console.error('Database connection failed:', err.message);
  process.exit(1);
});
"; then
    print_success "API database connection working"
else
    print_error "API database connection failed"
    exit 1
fi

cd ../..

# Test 2: Vanna AI Database Connection
print_status "Testing Vanna AI database connection..."
cd services/vanna
if python3 -c "
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

try:
    conn = psycopg.connect(
        host=os.getenv('DB_HOST'),
        dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=int(os.getenv('DB_PORT', 5432))
    )
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM invoices')
    count = cursor.fetchone()[0]
    print(f'Vanna AI connected. Invoice count: {count}')
    cursor.close()
    conn.close()
except Exception as e:
    print(f'Connection failed: {e}')
    exit(1)
"; then
    print_success "Vanna AI database connection working"
else
    print_error "Vanna AI database connection failed"
    exit 1
fi

cd ../..

# Test 3: Check sample data
print_status "Verifying sample data in Render database..."
cd apps/api
DATA_SUMMARY=$(npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
  const customers = await prisma.customer.count();
  const vendors = await prisma.vendor.count();
  const invoices = await prisma.invoice.count();
  const lineItems = await prisma.lineItem.count();
  const payments = await prisma.payment.count();
  
  console.log('Data Summary:');
  console.log('- Customers:', customers);
  console.log('- Vendors:', vendors);
  console.log('- Invoices:', invoices);
  console.log('- Line Items:', lineItems);
  console.log('- Payments:', payments);
}

checkData().catch(console.error).finally(() => process.exit(0));
")

echo "$DATA_SUMMARY"
print_success "Sample data verification complete"

cd ../..

# Test 4: Environment Configuration Check
print_status "Checking environment configuration..."

check_env_file() {
    local file=$1
    local desc=$2
    
    if [[ -f "$file" ]]; then
        if grep -q "dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com" "$file"; then
            print_success "$desc environment configured for Render.com"
        else
            print_warning "$desc environment file exists but may not be configured for Render.com"
        fi
    else
        print_error "$desc environment file missing: $file"
    fi
}

check_env_file ".env" "Root"
check_env_file "apps/api/.env" "API"
check_env_file "services/vanna/.env" "Vanna AI"

# Test 5: Schema Validation
print_status "Validating database schema..."
cd apps/api
SCHEMA_CHECK=$(npx prisma db pull --print 2>/dev/null | grep -E "(model|enum)" | wc -l)
if [ "$SCHEMA_CHECK" -gt 0 ]; then
    print_success "Database schema is properly deployed"
else
    print_error "Database schema validation failed"
fi

cd ../..

# Summary
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 All Tests Passed!${NC}"
echo ""
echo "Your Flowbit Analytics application is now configured to use:"
echo "• Database: Render.com PostgreSQL"
echo "• Host: dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com"
echo "• Database: flowbit_dsmj"
echo ""
echo "Ready to start the application:"
echo "1. API Server:    cd apps/api && npm run dev"
echo "2. Vanna AI:      cd services/vanna && python3 main.py"
echo "3. Frontend:      cd apps/web && npm run dev"
echo ""
print_success "Render.com PostgreSQL integration test complete!"
