import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('crop draggable box on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only test');

  const imgData = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(100, 50, 200, 150);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync('/tmp/test-crop.png', Buffer.from(imgData, 'base64'));

  await page.goto('/crop-image/');
  await page.waitForTimeout(3000);

  // Upload image
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('/tmp/test-crop.png');
  await page.waitForTimeout(2000);

  // Check if draggable overlay exists
  const overlay = page.locator('.cursor-move').first();
  const overlayCount = await overlay.count();
  console.log('Draggable overlay count:', overlayCount);

  if (overlayCount > 0) {
    const box = await overlay.boundingBox();
    console.log('Overlay box:', JSON.stringify(box));

    if (box) {
      // Try dragging the overlay
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      console.log('Tapped overlay center');
    }
  }

  // Check resize handles
  const handles = page.locator('.cursor-nw-resize, .cursor-se-resize');
  const handleCount = await handles.count();
  console.log('Resize handles:', handleCount);

  await page.screenshot({ path: 'test-results/crop-mobile.png', fullPage: true });
});

test('crop download produces correct image', async ({ page }) => {
  const imgData = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(50, 50, 100, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync('/tmp/test-crop2.png', Buffer.from(imgData, 'base64'));

  await page.goto('/crop-image/');
  await page.waitForTimeout(3000);

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('/tmp/test-crop2.png');
  await page.waitForTimeout(2000);

  // Set specific crop region
  await page.locator('#crop-x').fill('50');
  await page.locator('#crop-y').fill('50');
  await page.locator('#crop-w').fill('100');
  await page.locator('#crop-h').fill('100');
  await page.waitForTimeout(1000);

  // Check auto-preview output
  const outputImg = page.locator('img[alt="Cropped"]');
  const count = await outputImg.count();
  console.log('Auto-preview output count:', count);

  if (count > 0) {
    const src = await outputImg.getAttribute('src');
    console.log('Output src:', src?.substring(0, 60));
    
    // Verify the output image loads
    const naturalWidth = await outputImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
    const naturalHeight = await outputImg.evaluate((el: HTMLImageElement) => el.naturalHeight);
    console.log(`Output dimensions: ${naturalWidth}x${naturalHeight}`);
    
    // Should be 100x100 (the crop region)
    expect(naturalWidth).toBe(100);
    expect(naturalHeight).toBe(100);
  }

  await page.screenshot({ path: 'test-results/crop-correct.png', fullPage: true });
});
