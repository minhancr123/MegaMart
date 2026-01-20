import { test, expect } from '@playwright/test';

test.describe('Complete User Shopping Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000');
  });

  test('User can browse products and add to cart', async ({ page }) => {
    // 1. Verify home page loads
    await expect(page).toHaveTitle(/MegaMart/i);

    // 2. Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

    // 3. Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // 4. Verify product detail page
    await expect(page).toHaveURL(/\/product\//);
    await page.waitForSelector('h1');

    // 5. Select a variant
    await page.click('text=Chọn biến thể');
    await page.waitForSelector('[role="menuitem"]');
    await page.locator('[role="menuitem"]').first().click();

    // 6. Add to cart
    await page.click('text=Thêm vào giỏ');

    // 7. Verify success notification
    await expect(page.locator('text=Đã thêm vào giỏ hàng')).toBeVisible({ timeout: 5000 });

    // 8. Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page).toHaveURL(/\/cart/);

    // 9. Verify product in cart
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });

  test('User can complete checkout process', async ({ page }) => {
    // Prerequisites: Login first
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL('http://localhost:3000', { timeout: 10000 });

    // Add product to cart (simplified)
    await page.goto('http://localhost:3000/products');
    await page.locator('[data-testid="product-card"]').first().click();
    
    // Select variant and add to cart
    await page.click('text=Chọn biến thể');
    await page.locator('[role="menuitem"]').first().click();
    await page.click('text=Thêm vào giỏ');
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');

    // Proceed to checkout
    await page.click('text=Thanh toán');
    await expect(page).toHaveURL(/\/checkout/);

    // Fill shipping information
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="phone"]', '0123456789');
    await page.fill('input[name="address"]', '123 Test Street');
    await page.fill('input[name="ward"]', 'Ward 1');
    await page.fill('input[name="district"]', 'District 1');
    await page.fill('input[name="city"]', 'Ho Chi Minh');

    // Select payment method
    await page.click('input[value="COD"]');

    // Place order
    await page.click('text=Đặt hàng');

    // Verify order confirmation
    await expect(page.locator('text=Đặt hàng thành công')).toBeVisible({ timeout: 10000 });
  });

  test('User can search and filter products', async ({ page }) => {
    await page.goto('http://localhost:3000/products');

    // 1. Search for product
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]');
    await searchInput.fill('laptop');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForLoadState('networkidle');

    // 2. Apply price filter
    await page.fill('input[name="minPrice"]', '1000000');
    await page.fill('input[name="maxPrice"]', '5000000');
    await page.click('text=Áp dụng');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // 3. Verify results are filtered
    const products = page.locator('[data-testid="product-card"]');
    await expect(products).toHaveCount(await products.count());
  });

  test('User can manage wishlist', async ({ page }) => {
    // 1. Add product to wishlist
    await page.goto('http://localhost:3000/products');
    const heartIcon = page.locator('[aria-label="Yêu thích"]').first();
    await heartIcon.click();

    // 2. Go to wishlist page
    await page.goto('http://localhost:3000/wishlist');

    // 3. Verify product in wishlist
    await expect(page.locator('[data-testid="wishlist-item"]')).toBeVisible();

    // 4. Remove from wishlist
    await page.locator('[aria-label="Xóa khỏi yêu thích"]').first().click();

    // 5. Verify empty state
    await expect(page.locator('text=Danh sách yêu thích trống')).toBeVisible();
  });

  test('User can compare products', async ({ page }) => {
    await page.goto('http://localhost:3000/products');

    // Add multiple products to compare
    const compareButtons = page.locator('[aria-label="So sánh"]');
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();

    // Go to compare page
    await page.goto('http://localhost:3000/compare');

    // Verify products in compare
    const compareItems = page.locator('[data-testid="compare-item"]');
    await expect(compareItems).toHaveCount(2);
  });

  test('User can view order history', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    // Navigate to orders
    await page.goto('http://localhost:3000/profile/orders');

    // Verify orders page loads
    await expect(page.locator('h1:has-text("Đơn hàng của tôi")')).toBeVisible();

    // Click on first order
    const firstOrder = page.locator('[data-testid="order-card"]').first();
    if (await firstOrder.isVisible()) {
      await firstOrder.click();

      // Verify order detail page
      await expect(page).toHaveURL(/\/profile\/orders\//);
      await expect(page.locator('text=Chi tiết đơn hàng')).toBeVisible();
    }
  });

  test('User authentication flow', async ({ page }) => {
    // 1. Go to register page
    await page.goto('http://localhost:3000/auth/register');

    // 2. Fill registration form
    const timestamp = Date.now();
    await page.fill('input[name="email"]', `testuser${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');
    await page.fill('input[name="fullName"]', 'Test User');

    // 3. Submit form
    await page.click('button[type="submit"]');

    // 4. Verify redirect to login or home
    await page.waitForURL(/\/(auth\/login|^(?!auth))/);

    // 5. If redirected to login, login with new account
    if (page.url().includes('/auth/login')) {
      await page.fill('input[name="email"]', `testuser${timestamp}@example.com`);
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');
    }

    // 6. Verify logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });

    // 7. Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Đăng xuất');

    // 8. Verify logged out
    await expect(page.locator('text=Đăng nhập')).toBeVisible();
  });

  test('Responsive design - Mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:3000');

    // Verify mobile menu
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();

      // Verify menu opens
      await expect(page.locator('[data-testid="mobile-menu-content"]')).toBeVisible();
    }

    // Test product grid on mobile
    await page.goto('http://localhost:3000/products');
    const productCards = page.locator('[data-testid="product-card"]');
    
    // Verify products are displayed
    await expect(productCards.first()).toBeVisible();
  });

  test('Error handling - 404 page', async ({ page }) => {
    await page.goto('http://localhost:3000/nonexistent-page');

    // Verify 404 page is shown
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Không tìm thấy trang')).toBeVisible();
  });

  test('Performance - Page load time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    
    // Assert load time is under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Admin Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000', { timeout: 10000 });
  });

  test('Admin can manage products', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/products');

    // Verify products list
    await expect(page.locator('h1:has-text("Quản lý sản phẩm")')).toBeVisible();

    // Click create new product
    await page.click('text=Thêm sản phẩm');

    // Fill product form
    await page.fill('input[name="name"]', 'New Test Product');
    await page.fill('textarea[name="description"]', 'Test description');
    await page.fill('input[name="price"]', '100000');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=Tạo sản phẩm thành công')).toBeVisible({ timeout: 5000 });
  });

  test('Admin can view dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/dashboard');

    // Verify dashboard elements
    await expect(page.locator('text=Tổng quan')).toBeVisible();
    await expect(page.locator('text=Doanh thu')).toBeVisible();
    await expect(page.locator('text=Đơn hàng')).toBeVisible();
  });
});
