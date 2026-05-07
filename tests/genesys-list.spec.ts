import { expect, test } from '@playwright/test';

const SHARED_DECK_PATH =
  '/#/results?deck=H4sIAAAAAAAAAw3QSXKCQBQA0KtEtiYFAqJY5eI3gxPQflBQdyCD2g7dOAVSuXvyjvB-pEYaSU3OipEs318rH-pguH9HbTn1ndIUO7KR0wvGssqZW9NiCBmctMp6z0wd7taygGBt82oag7ElPaQXSBwtgOAQtGgveplJrEciI9bxS3F0WQsJXZoKRhPXANL7FiXk-_T6nqZerINYUUJS1laYcF93XBwMcnBoV0N4pgJd7yIYifqCw7rLpw5ZtrWAZj67IByjOYMZO-4AgmdSre3sfHNB7acEx-NOG648SG8h4mxTDrdOxCdnYCLk6FG4K7ZhCI-USr6touR59Qmf32oIbifjTfnkqkNzEDJkQxrhwlg9mNuRPqXr_1tY5F9OU9w_Egs_VEU1pN8__kbSElEBAAA';

test('Genesys list defaults to points descending', async ({ page }) => {
  await page.goto(SHARED_DECK_PATH);

  const openPointList = page.getByRole('button', { name: 'Genesys list' });
  await expect(openPointList).toBeVisible({ timeout: 30000 });
  await openPointList.click();

  await expect(page.getByText('Point list')).toBeVisible({ timeout: 30000 });

  const cards = page.locator('[data-testid="genesys-point-card"]');
  await expect(cards.first()).toBeVisible({ timeout: 30000 });

  const points = await cards.evaluateAll((elements) =>
    elements
      .slice(0, 12)
      .map((element) => Number((element as HTMLElement).dataset.points ?? '0')),
  );

  expect(points.length).toBeGreaterThan(1);
  for (let index = 0; index < points.length - 1; index += 1) {
    expect(points[index]).toBeGreaterThanOrEqual(points[index + 1]);
  }
});
