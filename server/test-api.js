/**
 * Script để test tất cả API endpoints
 * Chạy: node test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testUserId = '';
let testProductId = '';
let testOrderId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${testName}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function testHealthCheck() {
  log('\n=== Testing Health Check ===', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/`);
    logTest('GET / - Health check', response.status === 200, `Status: ${response.status}`);
    return true;
  } catch (error) {
    logTest('GET / - Health check', false, error.message);
    return false;
  }
}

async function testAuth() {
  log('\n=== Testing Authentication ===', 'cyan');
  let allPassed = true;

  // Test Register
  try {
    const timestamp = Date.now();
    const registerData = {
      email: `test${timestamp}@example.com`,
      password: 'Test123!@#',
      fullName: 'Test User',
    };

    const response = await axios.post(`${BASE_URL}/auth/register`, registerData);
    logTest('POST /auth/register - Register user', response.status === 201, 
      `User ID: ${response.data.id || response.data.user?.id}`);
    
    testUserId = response.data.id || response.data.user?.id;
    
    // Try to login with new account
    await sleep(500);
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: registerData.email,
      password: registerData.password,
    });
    
    if (loginResponse.data.accessToken || loginResponse.data.token) {
      authToken = loginResponse.data.accessToken || loginResponse.data.token;
      logTest('POST /auth/login - Login', true, 'Token received');
    } else {
      logTest('POST /auth/login - Login', false, 'No token received');
      allPassed = false;
    }
  } catch (error) {
    logTest('POST /auth/register or /auth/login', false, error.response?.data?.message || error.message);
    allPassed = false;
  }

  return allPassed;
}

async function testProducts() {
  log('\n=== Testing Products ===', 'cyan');
  let allPassed = true;

  // Test Get All Products
  try {
    const response = await axios.get(`${BASE_URL}/products?page=1&limit=10`);
    logTest('GET /products - Get all products', response.status === 200,
      `Found ${response.data.data?.length || response.data.length || 0} products`);
    
    if (response.data.data && response.data.data.length > 0) {
      testProductId = response.data.data[0].id;
    } else if (response.data.length > 0) {
      testProductId = response.data[0].id;
    }
  } catch (error) {
    logTest('GET /products', false, error.response?.data?.message || error.message);
    allPassed = false;
  }

  // Test Get Product Detail
  if (testProductId) {
    try {
      const response = await axios.get(`${BASE_URL}/products/${testProductId}`);
      logTest('GET /products/:id - Get product detail', response.status === 200,
        `Product: ${response.data.name}`);
    } catch (error) {
      logTest('GET /products/:id', false, error.response?.data?.message || error.message);
      allPassed = false;
    }
  }

  // Test Search Products
  try {
    const response = await axios.get(`${BASE_URL}/products?search=laptop`);
    logTest('GET /products?search - Search products', response.status === 200,
      `Found ${response.data.data?.length || response.data.length || 0} results`);
  } catch (error) {
    logTest('GET /products?search', false, error.response?.data?.message || error.message);
    allPassed = false;
  }

  return allPassed;
}

async function testCategories() {
  log('\n=== Testing Categories ===', 'cyan');
  let allPassed = true;

  try {
    const response = await axios.get(`${BASE_URL}/categories`);
    logTest('GET /categories - Get all categories', response.status === 200,
      `Found ${response.data.length || 0} categories`);
  } catch (error) {
    logTest('GET /categories', false, error.response?.data?.message || error.message);
    allPassed = false;
  }

  return allPassed;
}

async function testCart() {
  log('\n=== Testing Cart ===', 'cyan');
  
  if (!authToken) {
    log('⚠ Skipping cart tests - No auth token', 'yellow');
    return false;
  }

  let allPassed = true;
  const config = {
    headers: { Authorization: `Bearer ${authToken}` }
  };

  // Test Get Cart
  try {
    const response = await axios.get(`${BASE_URL}/cart`, config);
    logTest('GET /cart - Get user cart', response.status === 200,
      `Cart items: ${response.data.items?.length || 0}`);
  } catch (error) {
    logTest('GET /cart', false, error.response?.data?.message || error.message);
    allPassed = false;
  }

  // Test Add to Cart
  if (testProductId) {
    try {
      const response = await axios.post(`${BASE_URL}/cart`, {
        productId: testProductId,
        quantity: 1,
      }, config);
      
      logTest('POST /cart - Add to cart', 
        response.status === 200 || response.status === 201,
        'Product added to cart');
    } catch (error) {
      logTest('POST /cart', false, error.response?.data?.message || error.message);
      allPassed = false;
    }
  }

  return allPassed;
}

async function testOrders() {
  log('\n=== Testing Orders ===', 'cyan');
  
  if (!authToken) {
    log('⚠ Skipping order tests - No auth token', 'yellow');
    return false;
  }

  let allPassed = true;
  const config = {
    headers: { Authorization: `Bearer ${authToken}` }
  };

  // Test Get User Orders
  try {
    const response = await axios.get(`${BASE_URL}/orders`, config);
    logTest('GET /orders - Get user orders', response.status === 200,
      `Found ${response.data.length || 0} orders`);
    
    if (response.data.length > 0) {
      testOrderId = response.data[0].id;
    }
  } catch (error) {
    logTest('GET /orders', false, error.response?.data?.message || error.message);
    allPassed = false;
  }

  // Test Get Order Detail
  if (testOrderId) {
    try {
      const response = await axios.get(`${BASE_URL}/orders/${testOrderId}`, config);
      logTest('GET /orders/:id - Get order detail', response.status === 200,
        `Order status: ${response.data.status}`);
    } catch (error) {
      logTest('GET /orders/:id', false, error.response?.data?.message || error.message);
      allPassed = false;
    }
  }

  return allPassed;
}

async function testUser() {
  log('\n=== Testing User Profile ===', 'cyan');
  
  if (!authToken) {
    log('⚠ Skipping user tests - No auth token', 'yellow');
    return false;
  }

  let allPassed = true;
  const config = {
    headers: { Authorization: `Bearer ${authToken}` }
  };

  // Test Get Profile
  try {
    const response = await axios.get(`${BASE_URL}/user/profile`, config);
    logTest('GET /user/profile - Get user profile', response.status === 200,
      `User: ${response.data.fullName || response.data.email}`);
  } catch (error) {
    logTest('GET /user/profile', false, error.response?.data?.message || error.message);
    allPassed = false;
  }

  return allPassed;
}

// Main test runner
async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║   MegaMart API Testing Suite          ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');
  
  log(`\nTesting API at: ${BASE_URL}`, 'cyan');
  log('Starting tests in 2 seconds...\n', 'yellow');
  await sleep(2000);

  const results = {
    healthCheck: false,
    auth: false,
    products: false,
    categories: false,
    cart: false,
    orders: false,
    user: false,
  };

  try {
    results.healthCheck = await testHealthCheck();
    await sleep(500);
    
    results.auth = await testAuth();
    await sleep(500);
    
    results.products = await testProducts();
    await sleep(500);
    
    results.categories = await testCategories();
    await sleep(500);
    
    results.cart = await testCart();
    await sleep(500);
    
    results.orders = await testOrders();
    await sleep(500);
    
    results.user = await testUser();
  } catch (error) {
    log(`\nUnexpected error: ${error.message}`, 'red');
  }

  // Print summary
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║          TEST SUMMARY                  ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;
  const failed = total - passed;

  log(`\nTotal Tests: ${total}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`, 
    passed === total ? 'green' : 'yellow');

  // Detail breakdown
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${test.charAt(0).toUpperCase() + test.slice(1)}`, color);
  });

  log('\n' + '='.repeat(50) + '\n', 'blue');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
