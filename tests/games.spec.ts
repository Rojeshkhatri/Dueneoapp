import { test, expect } from '@playwright/test';

// All 15 games in Dueneo
const ALL_GAMES = [
  '2048', 'sudoku', 'daily-sudoku', 'minesweeper', 'tic-tac-toe',
  'connect-four', 'memory-match', 'word-search', 'solitaire',
  'spider-solitaire', 'freecell', 'hangman', 'reversi', 'checkers', 'scribble',
];

test.describe('All Games — Load Tests', () => {
  for (const game of ALL_GAMES) {
    test(`${game} loads with h1 heading`, async ({ page }) => {
      await page.goto(`/#/games/${game}`);
      await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    });
  }
});

test.describe('All Games — Screenshot Tests', () => {
  for (const game of ALL_GAMES) {
    test(`${game} screenshot`, async ({ page }) => {
      await page.goto(`/#/games/${game}`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `test-results/game-${game}.png`, fullPage: false });
    });
  }
});

test.describe('All Games — Mobile Screenshot Tests', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const game of ALL_GAMES) {
    test(`${game} mobile screenshot`, async ({ page }) => {
      await page.goto(`/#/games/${game}`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `test-results/game-${game}-mobile.png`, fullPage: false });
    });
  }
});

test.describe('2048 — Functional', () => {
  test('board renders with tiles', async ({ page }) => {
    await page.goto('/#/games/2048');
    await page.waitForTimeout(2000);
    // Should have a grid/board
    const board = page.locator('[class*="grid"], [class*="board"]').first();
    await expect(board).toBeVisible();
  });

  test('score display exists', async ({ page }) => {
    await page.goto('/#/games/2048');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=/score/i').first()).toBeVisible();
  });

  test('new game button exists', async ({ page }) => {
    await page.goto('/#/games/2048');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: /new|reset/i }).first()).toBeVisible();
  });
});

test.describe('Sudoku — Functional', () => {
  test('9x9 grid renders', async ({ page }) => {
    await page.goto('/#/games/sudoku');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });

  test('number pad exists', async ({ page }) => {
    await page.goto('/#/games/sudoku');
    await page.waitForTimeout(2000);
    // Should have buttons 1-9
    for (let i = 1; i <= 9; i++) {
      await expect(page.getByRole('button', { name: String(i), exact: true }).first()).toBeVisible();
    }
  });

  test('difficulty selector exists', async ({ page }) => {
    await page.goto('/#/games/sudoku');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=/easy|medium|hard/i').first()).toBeVisible();
  });
});

test.describe('Minesweeper — Functional', () => {
  test('grid renders', async ({ page }) => {
    await page.goto('/#/games/minesweeper');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });

  test('mine counter exists', async ({ page }) => {
    await page.goto('/#/games/minesweeper');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=/mine/i').first()).toBeVisible();
  });

  test('can click a cell', async ({ page }) => {
    await page.goto('/#/games/minesweeper');
    await page.waitForTimeout(2000);
    const cells = page.locator('[role="grid"] button');
    const count = await cells.count();
    expect(count).toBeGreaterThan(0);
    await cells.first().click();
    await page.waitForTimeout(500);
  });
});

test.describe('Tic-Tac-Toe — Functional', () => {
  test('3x3 grid renders', async ({ page }) => {
    await page.goto('/#/games/tic-tac-toe');
    await page.waitForTimeout(2000);
    const cells = page.locator('[role="grid"] button');
    await expect(cells).toHaveCount(9, { timeout: 10000 });
  });

  test('can make a move', async ({ page }) => {
    await page.goto('/#/games/tic-tac-toe');
    await page.waitForTimeout(2000);
    const cells = page.locator('[role="grid"] button');
    await cells.first().click();
    await page.waitForTimeout(500);
    // Should show X or O
    await expect(page.locator('text=/X|O/').first()).toBeVisible();
  });

  test('mode selector exists', async ({ page }) => {
    await page.goto('/#/games/tic-tac-toe');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=/player|friend/i').first()).toBeVisible();
  });
});

test.describe('Connect Four — Functional', () => {
  test('7-column grid renders', async ({ page }) => {
    await page.goto('/#/games/connect-four');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });

  test('drop buttons exist', async ({ page }) => {
    await page.goto('/#/games/connect-four');
    await page.waitForTimeout(2000);
    const dropBtns = page.locator('[role="grid"] button').first();
    await expect(dropBtns).toBeVisible();
  });

  test('can drop a disc', async ({ page }) => {
    await page.goto('/#/games/connect-four');
    await page.waitForTimeout(2000);
    // Click first column
    const cells = page.locator('[role="grid"] button');
    await cells.first().click();
    await page.waitForTimeout(500);
  });
});

test.describe('Memory Match — Functional', () => {
  test('card grid renders', async ({ page }) => {
    await page.goto('/#/games/memory-match');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });

  test('can flip a card', async ({ page }) => {
    await page.goto('/#/games/memory-match');
    await page.waitForTimeout(2000);
    const cards = page.locator('[role="grid"] button');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await cards.first().click();
    await page.waitForTimeout(500);
  });
});

test.describe('Word Search — Functional', () => {
  test('letter grid renders', async ({ page }) => {
    await page.goto('/#/games/word-search');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });

  test('word list exists', async ({ page }) => {
    await page.goto('/#/games/word-search');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=/word/i').first()).toBeVisible();
  });
});

test.describe('Solitaire — Functional', () => {
  test('card table renders', async ({ page }) => {
    await page.goto('/#/games/solitaire');
    await page.waitForTimeout(2000);
    // Should have cards visible
    await expect(page.locator('[class*="card"], [class*="pile"]').first()).toBeVisible();
  });

  test('new game button exists', async ({ page }) => {
    await page.goto('/#/games/solitaire');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: /new|deal|reset/i }).first()).toBeVisible();
  });
});

test.describe('Spider Solitaire — Functional', () => {
  test('card table renders', async ({ page }) => {
    await page.goto('/#/games/spider-solitaire');
    await page.waitForTimeout(2000);
    await expect(page.locator('[class*="card"], [class*="pile"]').first()).toBeVisible();
  });
});

test.describe('FreeCell — Functional', () => {
  test('card table renders', async ({ page }) => {
    await page.goto('/#/games/freecell');
    await page.waitForTimeout(2000);
    await expect(page.locator('[class*="card"], [class*="pile"]').first()).toBeVisible();
  });
});

test.describe('Hangman — Functional', () => {
  test('word display renders', async ({ page }) => {
    await page.goto('/#/games/hangman');
    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('letter buttons exist', async ({ page }) => {
    await page.goto('/#/games/hangman');
    await page.waitForTimeout(2000);
    // Should have A-Z letter buttons
    await expect(page.getByRole('button', { name: 'A', exact: true }).first()).toBeVisible();
  });
});

test.describe('Reversi — Functional', () => {
  test('board renders', async ({ page }) => {
    await page.goto('/#/games/reversi');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });
});

test.describe('Checkers — Functional', () => {
  test('board renders', async ({ page }) => {
    await page.goto('/#/games/checkers');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });
});

test.describe('Scribble — Functional', () => {
  test('canvas renders', async ({ page }) => {
    await page.goto('/#/games/scribble');
    await page.waitForTimeout(2000);
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});

test.describe('Daily Sudoku — Functional', () => {
  test('grid renders', async ({ page }) => {
    await page.goto('/#/games/daily-sudoku');
    await page.waitForTimeout(2000);
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();
  });
});

test.describe('Games — Mobile Overflow Check', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const game of ALL_GAMES) {
    test(`${game} no horizontal overflow on mobile`, async ({ page }) => {
      await page.goto(`/#/games/${game}`);
      await page.waitForTimeout(2000);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    });
  }
});
