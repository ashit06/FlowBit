#!/bin/bash
# API Server Test Script

echo "🧪 Testing API Server..."

# Test health endpoint
echo "Testing /health endpoint:"
curl -s http://localhost:3001/health || echo "❌ Health check failed"
echo ""

# Test stats endpoint  
echo "Testing /api/stats endpoint:"
curl -s http://localhost:3001/api/stats || echo "❌ Stats endpoint failed"
echo ""

# Test invoice trends
echo "Testing /api/invoice-trends endpoint:"
curl -s http://localhost:3001/api/invoice-trends | head -3 || echo "❌ Invoice trends failed"
echo ""

echo "✅ API testing complete"