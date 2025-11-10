## ygo-genesys-helper

React + Vite single-page app that helps you validate Yu-Gi-Oh! Genesys decks. Paste any YDKE URL and the app will:

- Decode main/extra/side decks and pull live card details from the YGOProDeck API (images, types, ids).
- Match cards against the official Genesys point list, tally totals, and highlight anything over your selected cap (default 100 points).
- Surface per-section breakdowns plus an automatically updating share link in the `#deck=` hash (gzipped + base64 YDKE string).
- Show when the point list was last fetched; a scheduled GitHub Action refreshes it daily straight from [yugioh-card.com](https://www.yugioh-card.com/en/genesys/).

Inspired by [decks.ygoresources.com](https://decks.ygoresources.com/).

### Getting started

This project uses [pnpm](https://pnpm.io/) for dependency management (other package managers still work, but commands below assume pnpm).

```bash
pnpm install
pnpm update-card-list   # optional, ensures src/data/genesys-card-list.json is fresh
pnpm dev
```

Open http://localhost:5173 and paste a `ydke://` deck link. Adjust the point cap if you need a non-standard limit.

### Sharing decks

Whenever a valid YDKE string is detected the app stores a gzipped+base64 deck in the URL hash (`#deck=`). Copy the generated link to let friends load the exact same list instantly.

### Deployment & automation

- `pnpm build` produces the static site used by GitHub Pages. `vite.config.ts` already sets `base: '/ygo-genesys-helper/'` so deployment to `csiqueirasilva.github.io/ygo-genesys-helper` works out of the box.
- `.github/workflows/deploy.yml` builds the site on pushes to `main` (or manual dispatch) and publishes it with `actions/deploy-pages`.
- `.github/workflows/update-card-list.yml` runs daily at 06:00 UTC (and on demand) to re-scrape the Genesys point table, commit the refreshed `src/data/genesys-card-list.json`, and trigger a redeploy.

### Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check & build production bundle |
| `pnpm preview` | Preview the production build |
| `pnpm update-card-list` | Scrape yugioh-card.com for the latest Genesys point list and update `src/data/genesys-card-list.json` |

Feel free to adapt the styling or hook up additional APIs (e.g., local caching for YGOProDeck) if you need offline/advanced behavior. PRs welcome!
