import { test, expect } from '@playwright/test';

test.describe('Debug — screenshot failing tools', () => {
  const pages = [
    'word-counter', 'base64-encoder', 'unit-converter',
    'gst-calculator', 'regex-tester', 'qr-code-generator',
  ];

  for (const slug of pages) {
    test(`screenshot ${slug}`, async ({ page }) => {
      await page.goto(`/#/${slug}`);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `test-results/debug-${slug}.png`, fullPage: true });
    });
  }

  const games = ['sudoku', 'tic-tac-toe', 'minesweeper'];
  for (const game of games) {
    test(`screenshot ${game}`, async ({ page }) => {
      await page.goto(`/#/games/${game}`);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `test-results/debug-${game}.png`, fullPage: true });
    });
  }
});
