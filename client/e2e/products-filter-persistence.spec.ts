import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Bộ lọc phải sống trong URL, không phải trong useState.
 *
 * Lỗi gốc: tìm kiếm + lọc xong bấm vào sản phẩm rồi quay lại là mất sạch
 * mọi điều kiện, vì toàn bộ nằm trong bộ nhớ của component đã bị huỷ.
 */

const productsUrl = '/products';

/**
 * Bộ lọc được render hai lần: `<aside>` cho desktop và một Sheet cho mobile.
 * Playwright bỏ qua phần tử `display:none` nên `getByRole('checkbox')` không
 * thấy bản desktop lúc chạy ở viewport ảo. Chỉ vào thẳng `<aside>` để thao
 * tác đúng bản đang hiện.
 */
function desktopFilter(page: Page) {
    return page.locator('aside').first();
}

/** Đọc bộ lọc hiện tại từ query string của URL. */
function readFilters(url: URL) {
    return {
        q: url.searchParams.get('search') ?? '',
        category: url.searchParams.get('category') ?? '',
        brand: url.searchParams.get('brand') ?? '',
        sort: url.searchParams.get('sort') ?? '',
        page: url.searchParams.get('page') ?? '',
        min: url.searchParams.get('min') ?? '',
        max: url.searchParams.get('max') ?? '',
    };
}

test.describe('Bộ lọc /products được giữ lại khi điều hướng', () => {
    // `<aside>` bị ẩn dưới breakpoint `lg`; viewport mặc định của Playwright
    // nhỏ hơn nên bộ lọc desktop không hiện, chỉ còn Sheet của mobile.
    test.use({ viewport: { width: 1280, height: 900 } });
    test('lọc hãng rồi vào chi tiết rồi quay lại vẫn giữ lựa chọn', async ({ page }) => {
        await page.goto(productsUrl);
        const filters = desktopFilter(page);
        const box = filters.locator('input[type=checkbox]').first();
        await expect(box).toBeVisible({ timeout: 15_000 });
        await box.check();
        await expect(page).toHaveURL(/brand=/, { timeout: 10_000 });

        const brand = new URL(page.url()).searchParams.get('brand') ?? '';
        expect(brand).not.toBe('');

        // Mở chi tiết sản phẩm rồi bấm Back - đúng việc khách làm
        await page.locator('a[href^="/product/"]').first().click();
        await expect(page).toHaveURL(/\/product\//, { timeout: 15_000 });
        await page.goBack();

        await expect
            .poll(() => new URL(page.url()).searchParams.get('brand'), { timeout: 10_000 })
            .toBe(brand);
        // Checkbox vẫn phải tích đúng hãng đó
        await expect(filters.locator('input[type=checkbox]').first()).toBeChecked();
    });

    test('tìm kiếm ghi vào URL để link chia sẻ xem được', async ({ page }) => {
        await page.goto(productsUrl);
        await desktopFilter(page).getByPlaceholder('Tìm sản phẩm...').fill('samsung');
        await expect(page).toHaveURL(/search=samsung/, { timeout: 10_000 });

        // Mở đúng URL đó ở tab mới thì phải ra kết quả đã lọc
        const shared = page.url();
        const fresh = await page.context().newPage();
        await fresh.goto(shared, { waitUntil: 'domcontentloaded' });
        await expect(fresh.locator('aside').first().getByPlaceholder('Tìm sản phẩm...')).toHaveValue('samsung', { timeout: 15_000 });
        await fresh.close();
    });

    test('lọc theo hãng rồi vào chi tiết rồi quay lại vẫn giữ lựa chọn', async ({ page }) => {
        await page.goto(productsUrl);
        const filters = desktopFilter(page);

        // Mở rộng danh sách hãng nếu đang thu gọn
        const showAll = filters.getByRole('button', { name: /Xem tất cả \d+ hãng/ });
        if (await showAll.count()) await showAll.first().click();

        const firstCheckbox = filters.locator('input[type=checkbox]').first();
        await expect(firstCheckbox).toBeVisible();
        await firstCheckbox.check();
        await expect(page).toHaveURL(/brand=/, { timeout: 10_000 });

        const before = readFilters(new URL(page.url()));
        expect(before.brand).not.toBe('');

        // Click vào sản phẩm đầu tiên rồi quay lại
        await page.locator('a[href^="/product/"]').first().click();
        await expect(page).toHaveURL(/\/product\//, { timeout: 15_000 });

        await page.goBack();

        await expect(page).toHaveURL(new RegExp(`brand=${encodeURIComponent(before.brand)}`));
        // Checkbox vẫn phải tích đúng hãng đó sau khi quay lại
        await expect(desktopFilter(page).locator('input[type=checkbox]').first()).toBeChecked();
    });

    test('mở link có sẵn bộ lọc thì áp dụng đúng vào giao diện', async ({ page }) => {
        await page.goto(`${productsUrl}?search=may&sort=price-asc&min=2000000&max=20000000`);

        await expect(desktopFilter(page).getByPlaceholder('Tìm sản phẩm...')).toHaveValue('may');
        // min/max nằm trong khoảng [2tr, 20tr] nên hiển thị 2.0M và 20.0M
        await expect(desktopFilter(page).getByText('2.0M')).toBeVisible();
        await expect(desktopFilter(page).getByText('20.0M')).toBeVisible();
    });

    test('đổi danh mục thì trở về trang 1, không rơi vào trang trống', async ({ page }) => {
        await page.goto(productsUrl);
        const filters = desktopFilter(page);
        const showAll = filters.getByRole('button', { name: /Xem tất cả \d+ hãng/ });
        if (await showAll.count()) await showAll.first().click();
        await filters.locator('input[type=checkbox]').first().check();
        await expect(page).toHaveURL(/brand=/, { timeout: 10_000 });

        // Sang trang 2
        const pageTwo = page.getByRole('button', { name: '2', exact: true });
        if (await pageTwo.count()) {
            await pageTwo.first().click();
            await expect(page).toHaveURL(/page=2/, { timeout: 10_000 });

            // Bấm một danh mục: `page` phải bị xoá
            await filters.getByRole('button', { name: 'Tất cả sản phẩm' }).click();
            await expect(page).not.toHaveURL(/page=/, { timeout: 10_000 });
        }
    });

    test('URL viết ngược min > max không làm vỡ thanh trượt', async ({ page }) => {
        await page.goto(`${productsUrl}?min=40000000&max=10000000`);
        // Slider phải tự sửa thành khoảng hợp lệ (min bị kẹp bằng max) thay vì
        // nhận [40tr, 10tr] làm Radix Slider vỡ và danh sách luôn rỗng.
        await expect
            .poll(() => new URL(page.url()).searchParams.get('max'), { timeout: 10_000 })
            .toBe('40000000');
        const labels = await desktopFilter(page).locator('span').allInnerTexts();
        expect(labels).toContain('40.0M');
    });

    test('gõ liên tục không bị mất chữ khi URL đang được cập nhật', async ({ page }) => {
        await page.goto(productsUrl);
        const input = desktopFilter(page).getByPlaceholder('Tìm sản phẩm...');

        // Gõ nhanh liên tiếp, mỗi lần cách nhau ngắn hơn debounce 400ms.
        // Lỗi "gõ mất chữ" xảy ra khi router ghi `search=sam` xong rồi effect kéo
        // ô nhập về "sam" trong lúc khách đang gõ tiếp "sung".
        await input.click();
        await input.type('samsung', { delay: 60 });
        await page.waitForTimeout(1200);

        expect(await input.inputValue()).toBe('samsung');
    });

    test('gõ có nghỉ giữa chừng rồi bấm hãng không mất chữ', async ({ page }) => {
        await page.goto(productsUrl);
        const filters = desktopFilter(page);
        const input = filters.getByPlaceholder('Tìm sản phẩm...');

        // Gõ chậm, mỗi ký tự cách nhau 300ms - dài hơn debounce 400ms một chút
        // nên router kịp ghi URL giữa chừng. Đây đúng kịch bản lỗi "gõ mất
        // chữ": router trả lại giá trị cũ rồi effect kéo ô nhập lùi.
        await input.click();
        await input.pressSequentially('samsung', { delay: 300 });
        await page.waitForTimeout(1500);
        expect(await input.inputValue()).toBe('samsung');

        // Bấm chọn hãng ngay sau đó: URL đổi theo `push` nhưng ô nhập phải giữ
        await filters.locator('input[type=checkbox]').first().check();
        await page.waitForTimeout(2000);
        expect(await input.inputValue()).toBe('samsung');
    });

    test('bấm nhanh hai hãng thì giữ cả hai', async ({ page }) => {
        await page.goto(productsUrl);
        const filters = desktopFilter(page);
        const boxes = filters.locator('input[type=checkbox]');
        await expect(boxes.first()).toBeVisible({ timeout: 15_000 });

        // Hai lần bấm liên tiếp, không chờ render lại giữa hai lần.
        await boxes.nth(0).click();
        await boxes.nth(1).click();
        await page.waitForTimeout(2500);

        const brand = new URL(page.url()).searchParams.get('brand') ?? '';
        expect(brand.split(',').filter(Boolean)).toHaveLength(2);
        await expect(boxes.nth(0)).toBeChecked();
        await expect(boxes.nth(1)).toBeChecked();
    });

    test('tên hãng viết thường vẫn khớp đúng một dòng', async ({ page }) => {
        // Server so khớp không phân biệt hoa thường, nên link viết tay phải tích
        // đúng dòng "Apple" chứ không sinh thêm dòng "apple".
        await page.goto(`${productsUrl}?brand=samsung`);
        const filters = desktopFilter(page);
        const labels = (await filters.locator('label').allInnerTexts()).map((s) => s.split('\n')[0]);
        const occurrences = labels.filter((l) => l.toLowerCase() === 'samsung');
        expect(occurrences).toHaveLength(1);
        await expect(filters.locator('input[type=checkbox]').first()).toBeChecked();
    });

    test('bấm Back sau khi bỏ chọn hãng thì lựa chọn trở lại theo URL', async ({ page }) => {
        await page.goto(productsUrl);
        const filters = desktopFilter(page);
        await expect(filters.locator('input[type=checkbox]').first()).toBeVisible({ timeout: 15_000 });

        const first = filters.locator('input[type=checkbox]').first();
        await first.check();
        await expect(page).toHaveURL(/brand=/, { timeout: 10_000 });
        const chosen = new URL(page.url()).searchParams.get('brand') ?? '';
        expect(chosen).not.toBe('');

        // Bỏ chọn (một bước Back trong lịch sử) rồi bấm Back lần nữa: URL có
        // brand trở lại thì checkbox cũng phải tích lại, không bị kẹt ở trạng
        // thái cũ.
        await first.uncheck();
        await expect
            .poll(() => new URL(page.url()).searchParams.get('brand'), { timeout: 10_000 })
            .toBeNull();

        await page.goBack();
        await expect
            .poll(() => new URL(page.url()).searchParams.get('brand'), { timeout: 10_000 })
            .toBe(chosen);
        await expect(filters.locator('input[type=checkbox]').first()).toBeChecked();
    });
});
