// API Integration Test Script
const https = require('http');

async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${description}: ${res.statusCode} - ${data.substring(0, 100)}...`);
        resolve({ success: true, status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description}: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(5000, () => {
      console.log(`⏱️ ${description}: Timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting API Integration Tests...\n');

  const tests = [
    ['/health', 'Health Check'],
    ['/api/stats', 'Stats Endpoint'],
    ['/api/invoice-trends', 'Invoice Trends'],
    ['/api/vendors/top10', 'Top Vendors'],
    ['/api/invoices', 'Invoices List']
  ];

  for (const [path, description] of tests) {
    await testEndpoint(path, description);
  }

  console.log('\n🎉 API Integration Tests Complete!');
}

runTests();