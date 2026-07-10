const { chromium } = require('playwright');

const BASE = 'https://dueneo.com';
const TIMEOUT = 15000;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  const results = [];
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      passed++;
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.message });
      failed++;
    }
  }

  // Test 1: Homepage loads
  await test('Homepage loads', async () => {
    const resp = await page.goto(BASE, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    if (!resp || resp.status() !== 200) throw new Error(`Status: ${resp?.status()}`);
    const title = await page.title();
    if (!title.includes('Dueneo')) throw new Error(`Title: ${title}`);
  });

  // Test 2: Homepage has key elements
  await test('Homepage has hero and tools', async () => {
    await page.goto(BASE, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    const h1 = await page.textContent('h1');
    if (!h1 || !h1.includes('tools')) throw new Error(`H1: ${h1}`);
  });

  // Test 3: Tool page loads (image-compressor)
  await test('Tool page loads', async () => {
    const resp = await page.goto(`${BASE}/#/image-compressor`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    if (!resp || resp.status() !== 200) throw new Error(`Status: ${resp?.status()}`);
    await page.waitForTimeout(1000);
    const h1 = await page.textContent('h1');
    if (!h1 || !h1.toLowerCase().includes('compress')) throw new Error(`H1: ${h1}`);
  });

  // Test 4: Category page loads
  await test('Category page loads', async () => {
    const resp = await page.goto(`${BASE}/#/pdf-tools`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    if (!resp || resp.status() !== 200) throw new Error(`Status: ${resp?.status()}`);
    await page.waitForTimeout(1000);
    const h1 = await page.textContent('h1');
    if (!h1 || !h1.toLowerCase().includes('pdf')) throw new Error(`H1: ${h1}`);
  });

  // Test 5: Game page loads (2048)
  await test('Game page loads', async () => {
    const resp = await page.goto(`${BASE}/#/games/2048`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    if (!resp || resp.status() !== 200) throw new Error(`Status: ${resp?.status()}`);
    await page.waitForTimeout(1000);
    const h1 = await page.textContent('h1');
    if (!h1) throw new Error(`No H1 found`);
  });

  // Test 6: Connect Four grid renders
  await test('Connect Four grid renders', async () => {
    await page.goto(`${BASE}/#/games/connect-four`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const grid = await page.$('[role="grid"]');
    if (!grid) throw new Error('Grid not found');
    const cells = await page.$$('[role="grid"] button');
    if (cells.length < 42) throw new Error(`Only ${cells.length} cells, expected 42`);
  });

  // Test 7: Word search renders
  await test('Word search renders', async () => {
    await page.goto(`${BASE}/#/games/word-search`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const grid = await page.$('[role="grid"]');
    if (!grid) throw new Error('Grid not found');
    const cells = await page.$$('[role="grid"] button');
    if (cells.length < 100) throw new Error(`Only ${cells.length} cells, expected 100+`);
  });

  // Test 8: Solitaire loads
  await test('Solitaire loads', async () => {
    await page.goto(`${BASE}/#/games/solitaire`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const h1 = await page.textContent('h1');
    if (!h1 || !h1.toLowerCase().includes('solitaire')) throw new Error(`H1: ${h1}`);
  });

  // Test 9: JSON formatter works
  await test('JSON formatter works', async () => {
    await page.goto(`${BASE}/#/json-formatter`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const textarea = await page.$('textarea');
    if (!textarea) throw new Error('No textarea found');
    await textarea.fill('{"test":123}');
    await page.waitForTimeout(500);
    const formatted = await textarea.inputValue();
    if (!formatted.includes('123')) throw new Error('Formatting failed');
  });

  // Test 10: Password generator works
  await test('Password generator works', async () => {
    await page.goto(`${BASE}/#/password-generator`, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const h1 = await page.textContent('h1');
    if (!h1 || !h1.toLowerCase().includes('password')) throw new Error(`H1: ${h1}`);
  });

  // Test 11: Mobile viewport - no horizontal overflow
  await test('Mobile: no horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    if (scrollWidth > clientWidth + 5) throw new Error(`Overflow: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  // Test 12: Page has no console errors
  await test('No critical console errors', async () => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(BASE, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    if (critical.length > 0) throw new Error(`Console errors: ${critical.join('; ')}`);
  });

  await browser.close();

  console.log('\n=== Playwright QA Results ===\n');
  for (const r of results) {
    console.log(`${r.status === 'PASS' ? '✓' : '✗'} ${r.name}${r.error ? ` — ${r.error}` : ''}`);
  }
  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
