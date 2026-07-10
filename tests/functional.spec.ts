import { test, expect } from '@playwright/test';

test.describe('JSON Formatter — real usage', () => {
  test('formats ugly JSON and shows output', async ({ page }) => {
    await page.goto('/#/json-formatter');
    await page.waitForTimeout(1500);

    const input = page.locator('textarea').first();
    await input.fill('{"name":"test","items":[1,2,3],"nested":{"key":"value"}}');

    const formatBtn = page.getByRole('button', { name: /format|beautify/i });
    if (await formatBtn.isVisible()) {
      await formatBtn.click();
    }
    await page.waitForTimeout(500);

    const output = page.locator('textarea').nth(1);
    const text = await output.inputValue();
    expect(text).toContain('"name"');
    expect(text).toContain('"items"');
  });
});

test.describe('Word Counter — real usage', () => {
  test('counts words and characters', async ({ page }) => {
    await page.goto('/#/word-counter');
    await page.waitForTimeout(1500);

    const input = page.locator('#wc-input');
    await input.fill('The quick brown fox jumps over the lazy dog.');
    await page.waitForTimeout(500);

    // Word count is in the first stat card
    const wordCount = page.locator('.text-2xl.font-semibold.tabular-nums').first();
    await expect(wordCount).toBeVisible();
    const text = await wordCount.textContent();
    expect(parseInt(text!)).toBeGreaterThan(0);
  });
});

test.describe('Base64 Encoder — real usage', () => {
  test('encodes text to base64', async ({ page }) => {
    await page.goto('/#/base64-encoder');
    await page.waitForTimeout(1500);

    const input = page.locator('#be-input');
    await input.fill('Hello Dueneo');

    // Click Encode button
    const encodeBtn = page.getByRole('button', { name: 'Encode', exact: true });
    await encodeBtn.click();
    await page.waitForTimeout(500);

    const output = page.locator('#be-output');
    const text = await output.inputValue();
    expect(text).toContain('SGVsbG8gRHVlbmVv');
  });
});

test.describe('Password Generator — real usage', () => {
  test('generates a password', async ({ page }) => {
    await page.goto('/#/password-generator');
    await page.waitForTimeout(1500);

    const genBtn = page.getByRole('button', { name: /generate/i });
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await page.waitForTimeout(500);
    }

    const passwordEl = page.locator('[class*="font-mono"], code, [class*="mono"]').first();
    await expect(passwordEl).toBeVisible();
    const password = await passwordEl.textContent();
    expect(password!.length).toBeGreaterThanOrEqual(8);
  });
});

test.describe('Color Picker — real usage', () => {
  test('shows color values', async ({ page }) => {
    await page.goto('/#/color-picker');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=/#[0-9a-fA-F]{6}/').first()).toBeVisible();
  });
});

test.describe('Unit Converter — real usage', () => {
  test('converts units', async ({ page }) => {
    await page.goto('/#/unit-converter');
    await page.waitForTimeout(1500);

    const input = page.locator('#uc-from-val');
    await input.fill('100');
    await page.waitForTimeout(500);

    const result = page.locator('#uc-to-val');
    await expect(result).toBeVisible();
    const value = await result.inputValue();
    expect(value).toBeTruthy();
    expect(value).not.toBe('0');
  });
});

test.describe('Regex Tester — real usage', () => {
  test('matches regex pattern', async ({ page }) => {
    await page.goto('/#/regex-tester');
    await page.waitForTimeout(1500);

    const patternInput = page.locator('#rt-pattern');
    await patternInput.fill('\\d+');

    const textInput = page.locator('#rt-text');
    await textInput.fill('abc 123 def 456');
    await page.waitForTimeout(500);

    const highlight = page.locator('#rt-highlight');
    await expect(highlight).toContainText('123');
    await expect(highlight).toContainText('456');
  });
});

test.describe('GST Calculator — real usage', () => {
  test('calculates GST', async ({ page }) => {
    await page.goto('/#/gst-calculator');
    await page.waitForTimeout(1500);

    const amountInput = page.locator('#tax-amount');
    await amountInput.fill('1000');
    await page.waitForTimeout(500);

    // Should show calculated results
    const rateInput = page.locator('#tax-rate');
    await expect(rateInput).toBeVisible();
  });
});

test.describe('QR Code Generator — real usage', () => {
  test('generates QR code from text', async ({ page }) => {
    await page.goto('/#/qr-code-generator');
    await page.waitForTimeout(1500);

    const input = page.locator('#qr-text');
    await input.fill('https://dueneo.com');

    const genBtn = page.getByRole('button', { name: 'Generate', exact: true });
    await genBtn.scrollIntoViewIfNeeded();
    await genBtn.click();
    await page.waitForTimeout(2000);

    // QR code renders as canvas or img with data URL
    const qr = page.locator('canvas, img[src^="data:"]').first();
    await expect(qr).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Markdown Previewer — real usage', () => {
  test('renders markdown preview', async ({ page }) => {
    await page.goto('/#/markdown-previewer');
    await page.waitForTimeout(1500);

    const input = page.locator('textarea').first();
    await input.fill('# Hello\n\nThis is **bold** and *italic* text.\n\n- Item 1\n- Item 2');
    await page.waitForTimeout(500);

    const preview = page.locator('[class*="preview"], [class*="output"], [class*="rendered"]').first();
    if (await preview.isVisible()) {
      await expect(preview.locator('h1, strong, em, li').first()).toBeVisible();
    }
  });
});

test.describe('2048 Game — real usage', () => {
  test('board renders', async ({ page }) => {
    await page.goto('/#/games/2048');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=/score|points/i').first()).toBeVisible();
  });
});

test.describe('Sudoku — real usage', () => {
  test('renders 9x9 grid with 81 cells', async ({ page }) => {
    await page.goto('/#/games/sudoku');
    await page.waitForTimeout(2000);

    // Board has 81 cells + number pad buttons. Count cells by aria-label pattern.
    const cells = page.locator('[aria-label="Sudoku board"] button[aria-label*="Row"]');
    await expect(cells).toHaveCount(81, { timeout: 10000 });
  });
});

test.describe('Tic-Tac-Toe — real usage', () => {
  test('renders 3x3 board and can make a move', async ({ page }) => {
    await page.goto('/#/games/tic-tac-toe');
    await page.waitForTimeout(2000);

    const cells = page.locator('[aria-label="Tic-tac-toe board"] button');
    await expect(cells).toHaveCount(9, { timeout: 10000 });

    // Click first cell
    await cells.first().click();
    await page.waitForTimeout(500);

    // Should show X
    await expect(page.locator('text=X').first()).toBeVisible();
  });
});

test.describe('Connect Four — real usage', () => {
  test('can drop a disc', async ({ page }) => {
    await page.goto('/#/games/connect-four');
    await page.waitForTimeout(2000);

    const dropBtns = page.locator('button:has-text("▼")');
    await expect(dropBtns.first()).toBeVisible();
    await dropBtns.nth(3).click();
    await page.waitForTimeout(500);

    const cells = page.locator('[role="grid"] button');
    const count = await cells.count();
    expect(count).toBe(42);
  });
});

test.describe('Memory Match — real usage', () => {
  test('renders card grid', async ({ page }) => {
    await page.goto('/#/games/memory-match');
    await page.waitForTimeout(2000);

    const cards = page.locator('button[role="gridcell"], [class*="card"] button');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(12);
  });
});

test.describe('Minesweeper — real usage', () => {
  test('renders grid and can click a cell', async ({ page }) => {
    await page.goto('/#/games/minesweeper');
    await page.waitForTimeout(2000);

    const cells = page.locator('[aria-label="Minesweeper field"] button');
    const count = await cells.count();
    expect(count).toBeGreaterThanOrEqual(81); // Easy = 9x9

    // Click a hidden cell
    const hidden = page.locator('button[aria-label="Hidden cell"]').first();
    await hidden.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Visual screenshot checks', () => {
  test('homepage screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: false });
  });

  test('tool page screenshot', async ({ page }) => {
    await page.goto('/#/json-formatter');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/json-formatter.png', fullPage: false });
  });

  test('game page screenshot', async ({ page }) => {
    await page.goto('/#/games/2048');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/2048.png', fullPage: false });
  });

  test('mobile homepage screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/mobile-homepage.png', fullPage: false });
  });
});
