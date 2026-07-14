import { test, expect } from '@playwright/test';

test('crop image full flow', async ({ page }) => {
  await page.goto('/crop-image/');
  await page.waitForTimeout(3000);

  // Create test image
  const imgData = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = 'blue';
    ctx.fillRect(50, 50, 100, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const fs = require('fs');
  fs.writeFileSync('/tmp/test-crop.png', Buffer.from(imgData, 'base64'));

  // Upload
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('/tmp/test-crop.png');
  await page.waitForTimeout(2000);

  // Verify inputs appeared with correct defaults
  const wInput = page.locator('#crop-w');
  const wVal = await wInput.inputValue();
  console.log('Default width:', wVal);
  expect(parseInt(wVal)).toBeGreaterThan(0);

  // Click crop button (exact match)
  const cropBtn = page.getByRole('button', { name: 'Crop image', exact: true });
  await cropBtn.click();
  await page.waitForTimeout(2000);

  // Check output
  const output = page.locator('img[alt="Cropped"]');
  expect(await output.count()).toBeGreaterThan(0);
  console.log('Crop succeeded!');

  await page.screenshot({ path: 'test-results/crop-success.png', fullPage: true });
});
