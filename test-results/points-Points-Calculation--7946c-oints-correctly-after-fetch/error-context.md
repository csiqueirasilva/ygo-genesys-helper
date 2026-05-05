# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: points.spec.ts >> Points Calculation >> should update points correctly after fetch
- Location: tests/points.spec.ts:7:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/results" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - main [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]:
            - generic [ref=e9]:
              - paragraph [ref=e10]: Yu-Gi-Oh! Genesys
              - heading "Genesys helper" [level=1] [ref=e11]
              - paragraph [ref=e12]: Paste a YDKE link, instantly check points, and share your build with a single link.
            - button "Open Player Profile" [ref=e13] [cursor=pointer]: 👤
          - generic [ref=e14]:
            - generic [ref=e15]:
              - paragraph [ref=e16]: Last updated
              - paragraph [ref=e17]: May 4, 2026, 05:36 AM
            - generic [ref=e18]:
              - paragraph [ref=e19]: Tracked cards
              - paragraph [ref=e20]: "657"
            - generic [ref=e21]:
              - paragraph [ref=e22]: Powered by
              - paragraph [ref=e23]:
                - link "YGOProDeck" [ref=e24] [cursor=pointer]:
                  - /url: https://ygoprodeck.com/
        - generic [ref=e25]:
          - generic [ref=e26]:
            - paragraph [ref=e27]: Quick import
            - heading "Paste anywhere to load a deck" [level=2] [ref=e28]
            - paragraph [ref=e29]:
              - text: Press Ctrl + V (or Cmd + V) with a valid
              - code [ref=e30]: ydke://
              - text: link. We'll auto-save it as Untitled deck and jump straight to the point breakdown. Drag-and-drop of .ydk/.json decks anywhere works too.
            - generic [ref=e31]:
              - button "Upload .ydk / .json" [ref=e32] [cursor=pointer]:
                - generic [ref=e33]: Upload .ydk / .json
                - generic [ref=e34]: ↗
              - button "Go to saved library" [ref=e35] [cursor=pointer]:
                - generic [ref=e36]: Go to saved library
                - generic [ref=e37]: ↓
          - button "Choose File" [ref=e38]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]:
            - paragraph [ref=e42]: Library
            - heading "Saved decks" [level=2] [ref=e43]
          - generic [ref=e44]:
            - button "Export" [ref=e45] [cursor=pointer]
            - generic [ref=e46] [cursor=pointer]:
              - text: Import
              - button "Import" [ref=e47]
            - button "Create folder" [ref=e48] [cursor=pointer]:
              - img [ref=e49]
        - paragraph [ref=e50]: No saved decks yet. Any saved deck will appear here automatically.
        - status [ref=e51]
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Use the URL provided by the user
  4  | const BUGGY_DECK_YDKE = 'ydke://H4sIAAAAAAAAAx3Qy3KCMBQA0F9BtnbGRymoMy5uIAQIBQPxgTtEBIuCktaAnf57O_2Asznfaq8u1P5Y5YvRKIiYAL5e-4AntinRLks72LwSwexj12JUXnEL7r6k0iRJLMDgcw_FzzkumBhFLvZX4xgBOnxJBltD4Cd2KIgO9QWFy62AwksTsPPbDKwPYTaWZsAdhqGkxeqNHjQcoVpCSDtZ8LPIXKy1jokIbteASjoBSOJPBuThYLk5Nn6D6-Sewn5Kr4WNyQng368EzsGjGa6s0twMAZbLwYykFjzQtZC-3DfvZpV5Geg9z5kfBOEMPTl_QDYeG9LeJVtm6RbTwZTCAN99bzSk63cf5UT2zB_2J7AH6ota_72Fh_xyFpVC8joXvVC2JlOm46mucAcrPAI3UH9-AW9uur9iAQAA';
  5  | 
  6  | test.describe('Points Calculation', () => {
  7  |   test('should update points correctly after fetch', async ({ page }) => {
  8  |     await page.goto('/');
  9  | 
  10 |     // Paste a YDKE to load a deck
  11 |     await page.evaluate((ydke) => {
  12 |       const dataTransfer = new DataTransfer();
  13 |       dataTransfer.setData('text', ydke);
  14 |       const pasteEvent = new ClipboardEvent('paste', {
  15 |         clipboardData: dataTransfer,
  16 |         bubbles: true,
  17 |         cancelable: true,
  18 |       });
  19 |       window.dispatchEvent(pasteEvent);
  20 |     }, BUGGY_DECK_YDKE);
  21 |     
> 22 |     await page.waitForURL('**/results');
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  23 | 
  24 |     // Wait for the total points to show 100 in the UI
  25 |     await expect(page.locator('text=100').first()).toBeVisible({ timeout: 10000 });
  26 | 
  27 |     // Save the deck
  28 |     await page.locator('button[title="Save deck locally"]').click();
  29 | 
  30 |     // Verify it changed to an Edit button (Rename deck)
  31 |     const editButton = page.locator('button[title="Rename deck"]');
  32 |     await expect(editButton).toBeVisible();
  33 | 
  34 |     // Open Saved Decks modal
  35 |     const savedDecksBtn = page.getByText('Saved decks', { exact: true });
  36 |     await savedDecksBtn.click();
  37 |     
  38 |     // Close the modal
  39 |     await page.locator('button[aria-label="Close saved decks"]').click();
  40 | 
  41 |     // Navigate back to home page
  42 |     const backBtn = page.locator('button:has-text("Back")').first();
  43 |     await backBtn.click();
  44 | 
  45 |     // Check the points displayed on the index page for the saved deck
  46 |     await expect(page.locator('text=100 pts').first()).toBeVisible({ timeout: 5000 });
  47 |   });
  48 | });
  49 | 
```