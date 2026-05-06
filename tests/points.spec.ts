import { expect, type Page, test } from '@playwright/test';

const COMPRESSED_DECK_PAYLOAD =
  'ydke://H4sIAAAAAAAAAx3Qy3KCMBQA0F9BtnbGRymoMy5uIAQIBQPxgTtEBIuCktaAnf57O_2Asznfaq8u1P5Y5YvRKIiYAL5e-4AntinRLks72LwSwexj12JUXnEL7r6k0iRJLMDgcw_FzzkumBhFLvZX4xgBOnxJBltD4Cd2KIgO9QWFy62AwksTsPPbDKwPYTaWZsAdhqGkxeqNHjQcoVpCSDtZ8LPIXKy1jokIbteASjoBSOJPBuThYLk5Nn6D6-Sewn5Kr4WNyQng368EzsGjGa6s0twMAZbLwYykFjzQtZC-3DfvZpV5Geg9z5kfBOEMPTl_QDYeG9LeJVtm6RbTwZTCAN99bzSk63cf5UT2zB_2J7AH6ota_72Fh_xyFpVC8joXvVC2JlOm46mucAcrPAI3UH9-AW9uur9iAQAA';

const NAMED_SHARED_DECK_PATH =
  '/#/results?deck=H4sIAAAAAAAAAw3QSXKCQBQA0KtEtiYFAqJY5eI3gxPQflBQdyCD2g7dOAVSuXvyjvB-pEYaSU3OipEs318rH-pguH9HbTn1ndIUO7KR0wvGssqZW9NiCBmctMp6z0wd7taygGBt82oag7ElPaQXSBwtgOAQtGgveplJrEciI9bxS3F0WQsJXZoKRhPXANL7FiXk-_T6nqZerINYUUJS1laYcF93XBwMcnBoV0N4pgJd7yIYifqCw7rLpw5ZtrWAZj67IByjOYMZO-4AgmdSre3sfHNB7acEx-NOG648SG8h4mxTDrdOxCdnYCLk6FG4K7ZhCI-USr6touR59Qmf32oIbifjTfnkqkNzEDJkQxrhwlg9mNuRPqXr_1tY5F9OU9w_Egs_VEU1pN8__kbSElEBAAA';

async function dispatchPaste(page: Page, text: string) {
  await page.evaluate((payload) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text', payload);
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(pasteEvent);
  }, text);
}

async function dismissWarningIfPresent(page: Page) {
  const continueButton = page.getByRole('button', { name: 'Continue' });
  if (await continueButton.count()) {
    await continueButton.click();
  }
}

test.describe('Deck persistence', () => {
  test('should update points correctly after fetch and keep the saved deck in sync', async ({ page }) => {
    await page.goto('/');

    await dispatchPaste(page, COMPRESSED_DECK_PAYLOAD);
    await expect(page).toHaveURL(/#\/results/);

    await dismissWarningIfPresent(page);
    const saveButton = page.locator('button[title="Save deck locally"]');
    await expect(saveButton).toBeVisible({ timeout: 30000 });
    await saveButton.click();

    await expect(page.locator('button[title="Rename deck"]')).toBeVisible();

    await page.getByRole('button', { name: /Back/ }).first().click();
    const untitledDeckButton = page.getByRole('button', { name: 'Untitled deck', exact: true });
    await expect(untitledDeckButton).toBeVisible();
    await expect(page.locator('text=100 pts').first()).toBeVisible({ timeout: 30000 });

    await untitledDeckButton.click();
    await expect(page.locator('button[title="Rename deck"]')).toBeVisible();
  });

  test('should allow a named shared deck to be saved locally', async ({ page }) => {
    await page.goto(NAMED_SHARED_DECK_PATH);
    await expect(page).toHaveURL(/#\/results\?deck=/);

    await dismissWarningIfPresent(page);
    const saveButton = page.locator('button[title="Save deck locally"]');
    await expect(saveButton).toBeVisible({ timeout: 30000 });
    await saveButton.click();

    await expect(page.locator('button[title="Rename deck"]')).toBeVisible();

    await page.getByRole('button', { name: /Back/ }).first().click();
    const redEyesDeckButton = page.getByRole('button', { name: 'Red-Eyes WCQ 2026', exact: true });
    await expect(redEyesDeckButton).toBeVisible({ timeout: 30000 });

    await redEyesDeckButton.click();
    await expect(page.locator('button[title="Rename deck"]')).toBeVisible();
  });
});
