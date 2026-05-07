import { expect, type Page, test } from '@playwright/test';
import { buildYdke, parseYdke } from '../src/lib/ydke';

const INITIAL_SAVED_DECK =
  'ydke://NRQsATUULAE1FCwBX2AhAV9gIQFfYCEBXcaxAV3GsQFdxrEBfCBMBXwgTAWAlpgAgJaYAIgfDAOIHwwDiB8MAw8/0AAPP9AAnc0gA53NIAPXGp8B1xqfAX32vwB99r8ASnBJAxVjAAMVYwADFWMAA0QZ8ABEGfAARBnwACPWnQJrxxMFa8cTBWvHEwVvdu8Ab3bvAG927wBdoLoEXaC6BA==!kcJcA5HCXAPhsMkCV2FkA1dhZAPoNDoA6DQ6ACws7AIsLOwCLCzsAsgyjgHIMo4ByDKOAeuqiwXrqosF!reIKAq3iCgLzHSEE8x0hBCPWnQIj1p0C4rHCBOKxwgTiscIE3lXNBV2gugSAlpgAodUqAqHVKgKh1SoC';

const NEW_IMPORTED_DECK =
  'ydke://svTMArN8cwSzfHMEf9qZBX/amQV/2pkFrOe8AbAj3gCwI94AsCPeADUHgwI1B4MC1QOmAdUDpgHVA6YBYTc0A2E3NAMrVv0EK1b9BCtW/QTj/dEE4/3RBIYXoAHXGp8B1xqfAdotXgCpM4EFqTOBBakzgQUuaqQFLmqkBS5qpAU+pHEBPzrqAyJImQAiSJkAIkiZAANuWgUDbloFA25aBQ==!zRTLAaoRQQIXf8YESpGlAkqRpQLOAs0D66qLBf0dYgSWunMBpJorANoj6wOpGn4Ayhq/Ab8OSQK6TtkF!!';

const CANONICAL_IMPORTED_DECK = (() => {
  const parsed = parseYdke(NEW_IMPORTED_DECK);
  return buildYdke(parsed.main, parsed.extra, parsed.side);
})();

const USER_STORAGE = {
  'ygo-genesys-folder-open': JSON.stringify({
    'folder-mi2kpi10-023sve': true,
    'folder-default': true,
  }),
  'ygo-genesys-saved-decks-v1': JSON.stringify({
    version: 2,
    folders: [
      {
        id: 'folder-default',
        name: 'Unsorted',
        decks: [
          {
            id: 'mov9uf4s-n2ms14',
            name: 'Red-Eyes WCQ (Advanced)',
            deck: INITIAL_SAVED_DECK,
            savedAt: '2026-05-07T09:16:13.468Z',
            summary: { main: 40, extra: 15, side: 15, points: 100, version: 2 },
          },
          {
            id: 'mov8n0jq-hbd4b0',
            name: 'Obelisk WCQ (Genesys)',
            deck: INITIAL_SAVED_DECK,
            savedAt: '2026-05-07T08:45:02.062Z',
            summary: { main: 40, extra: 15, side: 15, points: 100, version: 2 },
          },
        ],
      },
    ],
  }),
  'ygo-user-profile': JSON.stringify({
    fullName: 'CAIO SIQUEIRA DA SILVA',
    konamiId: '0416188924',
    residency: 'BRAZIL',
    eventName: 'WCQ - Nacional de Yu-Gi-Oh! 2026',
    eventDate: '2026-05-09',
  }),
};

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

test('pasting a new deck over a loaded saved deck resets the active saved deck state', async ({ page }) => {
  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) {
      window.localStorage.setItem(key, value);
    }
  }, USER_STORAGE);

  await page.goto('/');

  const obeliskDeckButton = page.getByRole('button', { name: 'Obelisk WCQ (Genesys)', exact: true });
  await expect(obeliskDeckButton).toBeVisible({ timeout: 30000 });
  await obeliskDeckButton.click();

  await dismissWarningIfPresent(page);
  await expect(page.locator('button[title="Rename deck"]')).toBeVisible({ timeout: 30000 });

  await dispatchPaste(page, NEW_IMPORTED_DECK);
  await dismissWarningIfPresent(page);

  await expect(page.locator('button[title="Save deck locally"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('button[title="Rename deck"]')).toHaveCount(0);

  await page.locator('button[title="Save deck locally"]').click();
  await expect(page.locator('button[title="Rename deck"]')).toBeVisible({ timeout: 30000 });

  await page.getByRole('button', { name: /Back/ }).first().click();

  const untitledDeckButton = page.getByRole('button', { name: 'Untitled deck', exact: true });
  await expect(untitledDeckButton).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Obelisk WCQ (Genesys)', exact: true })).toBeVisible();

  const savedState = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('ygo-genesys-saved-decks-v1') ?? 'null'),
  );

  const folder = savedState.folders.find((entry: { id: string }) => entry.id === 'folder-default');
  expect(folder).toBeTruthy();

  const obelisk = folder.decks.find((deck: { name: string }) => deck.name === 'Obelisk WCQ (Genesys)');
  const untitled = folder.decks.find((deck: { name: string }) => deck.name === 'Untitled deck');

  expect(obelisk?.deck).toBe(INITIAL_SAVED_DECK);
  expect(untitled?.deck).toBe(CANONICAL_IMPORTED_DECK);
  expect(folder.decks).toHaveLength(3);
});
