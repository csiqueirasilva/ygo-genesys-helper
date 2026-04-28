import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const GENESYS_META_URL = 'https://ygoprodeck.com/category/format/tournament%20meta%20decks%20(genesys)';
const ADVANCED_META_URL = 'https://ygoprodeck.com/category/format/tournament%20meta%20decks';
const API_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../src/data/meta-data.json');

async function fetchAllCardsWithMisc() {
  console.log('Fetching all cards with misc info...');
  const response = await fetch(`${API_ENDPOINT}?misc=yes`);
  if (!response.ok) throw new Error('Failed to fetch cards');
  const payload = await response.json();
  return payload.data;
}

async function fetchBanlist() {
  console.log('Fetching TCG Banlist...');
  const response = await fetch(`${API_ENDPOINT}?banlist=tcg`);
  if (!response.ok) throw new Error('Failed to fetch banlist');
  const payload = await response.json();
  const banlist = {};
  payload.data.forEach(card => {
    banlist[card.id] = card.banlist_info.ban_tcg;
  });
  return banlist;
}

async function scrapeRecentDecks(url) {
  console.log(`Scraping meta decks from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Warning: Failed to fetch meta page ${url}`);
    return [];
  }
  const $ = load(await response.text());
  
  const decks = [];
  $('.deck_article-card-container').each((_, el) => {
    const titleEl = $(el).find('.deck_article-card-title');
    const name = titleEl.text().trim();
    const deckUrl = titleEl.attr('href');
    const statsEl = $(el).find('.deck_article-card-stats');
    const meta = statsEl.text().replace(/\s+/g, ' ').trim();
    
    if (name && deckUrl) {
      decks.push({ name, url: `https://ygoprodeck.com${deckUrl}`, meta });
    }
  });
  
  return decks;
}

try {
  const [allCards, banlist, genesysDecks, advancedDecks] = await Promise.all([
    fetchAllCardsWithMisc(),
    fetchBanlist(),
    scrapeRecentDecks(GENESYS_META_URL),
    scrapeRecentDecks(ADVANCED_META_URL)
  ]);

  // Process card popularity
  const popularCards = {};
  allCards.forEach(card => {
    const misc = card.misc_info?.[0];
    if (misc && (misc.viewsweek > 20 || misc.staple === 'Yes')) {
      popularCards[card.id] = {
        name: card.name,
        viewsweek: misc.viewsweek,
        views: misc.views || 0,
        upvotes: misc.upvotes || 0,
        downvotes: misc.downvotes || 0,
        staple: misc.staple === 'Yes',
        archetype: card.archetype,
        formats: misc.formats || []
      };
    }
  });

  const payload = {
    lastUpdated: new Date().toISOString(),
    genesys: {
      recentDecks: genesysDecks.slice(0, 30),
    },
    advanced: {
      recentDecks: advancedDecks.slice(0, 30),
      banlist,
    },
    popularCards,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved meta data to ${outputPath} (${Object.keys(popularCards).length} popular cards)`);
} catch (error) {
  console.error('Meta data update failed:', error);
  process.exit(1);
}
