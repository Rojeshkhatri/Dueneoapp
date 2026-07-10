import { test, expect } from '@playwright/test';

test.describe('Dueneo Homepage', () => {
  test('loads with hero and tool grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('tools');
  });

  test('search box works', async ({ page, isMobile }) => {
    await page.goto('/');
    const placeholder = isMobile
      ? 'Search 238 tools and 15 games — image compressor, pdf merge, sudoku…'
      : 'Search tools and games…';
    const search = page.getByPlaceholder(placeholder);
    await search.fill('compress');
    await expect(page.locator('text=Image Compressor').first()).toBeVisible();
  });
});

test.describe('Tool Pages', () => {
  const tools = [
    { slug: 'image-compressor', keyword: 'compress' },
    { slug: 'pdf-merge', keyword: 'merge' },
    { slug: 'json-formatter', keyword: 'JSON' },
    { slug: 'password-generator', keyword: 'password' },
    { slug: 'qr-code-generator', keyword: 'QR' },
    { slug: 'word-counter', keyword: 'word' },
    { slug: 'base64-encoder', keyword: 'Base64' },
    { slug: 'color-picker', keyword: 'color' },
    { slug: 'invoice-generator', keyword: 'invoice' },
    { slug: 'gst-calculator', keyword: 'GST' },
    { slug: 'unit-converter', keyword: 'unit' },
    { slug: 'regex-tester', keyword: 'regex' },
    { slug: 'image-resizer', keyword: 'resize' },
    { slug: 'csv-to-excel', keyword: 'CSV' },
    { slug: 'markdown-previewer', keyword: 'markdown' },
  ];

  for (const tool of tools) {
    test(`${tool.slug} loads with heading`, async ({ page }) => {
      await page.goto(`/#/${tool.slug}`);
      await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    });
  }
});

test.describe('Game Pages', () => {
  const games = [
    '2048', 'sudoku', 'minesweeper', 'tic-tac-toe',
    'connect-four', 'memory-match', 'word-search', 'solitaire',
  ];

  for (const game of games) {
    test(`${game} loads`, async ({ page }) => {
      await page.goto(`/#/games/${game}`);
      await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    });
  }

  test('connect-four has 42 cells', async ({ page }) => {
    await page.goto('/#/games/connect-four');
    const cells = page.locator('[role="grid"] button');
    await expect(cells).toHaveCount(42, { timeout: 10000 });
  });

  test('word-search has grid', async ({ page }) => {
    await page.goto('/#/games/word-search');
    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no horizontal overflow on homepage', async ({ page }) => {
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('no horizontal overflow on tool page', async ({ page }) => {
    await page.goto('/#/image-compressor');
    await page.waitForTimeout(2000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
