import { test, expect } from '@playwright/test';

test('scribble dispatchEvent test', async ({ page }) => {
  await page.goto('/games/scribble/');
  await page.waitForTimeout(3000);

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 5000 });

  const box = await canvas.boundingBox();
  if (!box || box.width < 100) return;

  // Use dispatchEvent to directly trigger mousedown on the canvas
  await page.evaluate(({ x, y }) => {
    const c = document.querySelector('canvas');
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const event = new MouseEvent('mousedown', {
      clientX: x + 50,
      clientY: y + 50,
      bubbles: true,
    });
    c.dispatchEvent(event);
  }, { x: box.x, y: box.y });

  await page.waitForTimeout(100);

  // Check if canvas was initialized
  const state = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { w: c?.width, h: c?.height };
  });
  console.log('After mousedown:', JSON.stringify(state));

  // Move mouse
  await page.evaluate(({ x, y }) => {
    const c = document.querySelector('canvas');
    if (!c) return;
    for (let i = 1; i <= 10; i++) {
      const event = new MouseEvent('mousemove', {
        clientX: x + 50 + i * 10,
        clientY: y + 50,
        bubbles: true,
      });
      c.dispatchEvent(event);
    }
  }, { x: box.x, y: box.y });

  await page.waitForTimeout(100);

  // Mouse up
  await page.evaluate(({ x, y }) => {
    const c = document.querySelector('canvas');
    if (!c) return;
    const event = new MouseEvent('mouseup', {
      clientX: x + 150,
      clientY: y + 50,
      bubbles: true,
    });
    c.dispatchEvent(event);
  }, { x: box.x, y: box.y });

  await page.waitForTimeout(500);

  const len1 = await page.evaluate(() => document.querySelector('canvas')?.toDataURL().length ?? 0);
  console.log('Stroke 1:', len1);

  // Second stroke
  await page.evaluate(({ x, y }) => {
    const c = document.querySelector('canvas');
    if (!c) return;
    c.dispatchEvent(new MouseEvent('mousedown', { clientX: x + 50, clientY: y + 100, bubbles: true }));
  }, { x: box.x, y: box.y });
  await page.waitForTimeout(100);

  await page.evaluate(({ x, y }) => {
    const c = document.querySelector('canvas');
    if (!c) return;
    for (let i = 1; i <= 10; i++) {
      c.dispatchEvent(new MouseEvent('mousemove', { clientX: x + 50 + i * 10, clientY: y + 100, bubbles: true }));
    }
  }, { x: box.x, y: box.y });
  await page.waitForTimeout(100);

  await page.evaluate(({ x, y }) => {
    const c = document.querySelector('canvas');
    if (!c) return;
    c.dispatchEvent(new MouseEvent('mouseup', { clientX: x + 150, clientY: y + 100, bubbles: true }));
  }, { x: box.x, y: box.y });

  await page.waitForTimeout(500);

  const len2 = await page.evaluate(() => document.querySelector('canvas')?.toDataURL().length ?? 0);
  console.log('Stroke 2:', len2);

  await page.screenshot({ path: 'test-results/scribble-dispatch.png' });

  expect(len1).toBeGreaterThan(1000);
  expect(len2).toBeGreaterThan(1000);
});
