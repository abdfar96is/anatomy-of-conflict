import { expect, test, type Page } from '@playwright/test';

// Fails the test on any console error or uncaught exception.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('a share link opens the dossier in Arabic, and English flips the layout', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#country-SAU');
  await expect(page.locator('#dossier')).toBeVisible();
  await expect(page.locator('#dossier')).toContainText('السعودية');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#map canvas')).toHaveCount(2);
  await page.locator('#topbar [data-k="lang"]').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#dossier')).toContainText('Saudi Arabia');
  expect(errors).toEqual([]);
});

test('a pipeline share link loads the energy data on demand and opens the line', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#pipeline-P0547');
  await expect(page.locator('#legend')).toContainText('كم', { timeout: 30_000 });
  await expect(page.locator('#dossier')).toContainText('كركوك');
  await expect(page.locator('#dossier a[href="https://creativecommons.org/licenses/by/4.0/"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

for (const view of ['network', 'timeline', 'sources']) {
  test(`#view-${view} opens the view`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(`/#view-${view}`);
    await expect(page.locator('#viewpanel')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('compare and tour links work from a cold load', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#compare-USA-CHN');
  await expect(page.locator('#viewpanel')).toBeVisible();
  await page.goto('/#tour-energy');
  await page.reload();
  await expect(page.locator('#tour')).toBeVisible();
  expect(errors).toEqual([]);
});

test('phone width has no sideways scroll', async ({ page }) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#conflict-sudan');
  await expect(page.locator('#dossier')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

test('on a phone, picking a record while a view is open swaps the view for the dossier sheet', async ({ page }) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#view-network');
  await expect(page.locator('#viewpanel')).toBeVisible();
  await page.keyboard.press('/');
  await page.locator('#palette input').fill('السعوديه');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dossier')).toBeVisible();
  await expect(page.locator('#viewpanel')).toBeHidden();
  expect(errors).toEqual([]);
});
