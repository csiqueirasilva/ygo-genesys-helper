import { test, expect } from '@playwright/test';

// Use a simple valid YDKE representing 1x Ash Blossom (14558127)
const ASH_BLOSSOM_YDKE = 'ydke://8hXnAA==!!!';

test.describe('Deck Saving and Editing', () => {
  test('should save a deck and update it in place without duplication', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Paste a YDKE to load a deck
    await page.evaluate((ydke) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text', ydke);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(pasteEvent);
    }, ASH_BLOSSOM_YDKE);
    
    // Wait for navigation to /results
    await page.waitForURL('**/results');

    // Click "Save deck locally" button (identified by its title or icon)
    const saveButton = page.locator('button[title="Save deck locally"]');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify it changed to an Edit button (Rename deck)
    const editButton = page.locator('button[title="Rename deck"]');
    await expect(editButton).toBeVisible();

    // Open Saved Decks modal to check it's saved
    const savedDecksBtn = page.getByText('Saved decks', { exact: true });
    await savedDecksBtn.click();
    
    // Check that there is exactly 1 deck saved in the modal
    const deckEntries = page.locator('ul.space-y-2 > li');
    await expect(deckEntries).toHaveCount(1);
    
    // Close the modal
    await page.locator('button[aria-label="Close saved decks"]').click();

    // Now, let's remove the card to trigger an in-place update
    // We need to enter edit mode for the Main Deck
    const editSectionBtn = page.getByText('Edit Section').first();
    await editSectionBtn.click();

    // Find the removal 'X' button on the card
    const removeCardBtn = page.locator('button[title="Remove card"]');
    await expect(removeCardBtn).toBeVisible();
    await removeCardBtn.click();

    // Check that the card is removed (0 cards in main deck)
    await expect(page.getByText('0 / 0 / 0')).toBeVisible();

    // The auto-save effect should have updated the saved deck
    // Let's check the Saved Decks modal again
    await savedDecksBtn.click();
    
    // Check that there is still exactly 1 deck saved (no duplication)
    await expect(deckEntries).toHaveCount(1);
  });
});
