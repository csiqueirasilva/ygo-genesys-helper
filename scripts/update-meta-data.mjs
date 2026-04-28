import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const GENESYS_META_URL = 'https://ygoprodeck.com/category/format/tournament%20meta%20decks%20(genesys)';
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

async function scrapeGenesysArchetypes() {
  console.log('Scraping Genesys meta archetypes...');
  const response = await fetch(GENESYS_META_URL);
  if (!response.ok) throw new Error('Failed to fetch Genesys meta page');
  const $ = load(await response.text());
  
  const decks = [];
  $('.deck_article-card-container').each((_, el) => {
    const titleEl = $(el).find('.deck_article-card-title');
    const name = titleEl.text().trim();
    const url = titleEl.attr('href');
    const statsEl = $(el).find('.deck_article-card-stats');
    const meta = statsEl.text().replace(/\s+/g, ' ').trim();
    
    if (name && url) {
      decks.push({ name, url: `https://ygoprodeck.com${url}`, meta });
    }
  });
  
  return decks;
}

try {
  const [allCards, recentDecks] = await Promise.all([
    fetchAllCardsWithMisc(),
    scrapeGenesysArchetypes()
  ]);

  if (recentDecks.length === 0) {
    console.warn('Warning: Scraped zero decks from Genesys meta page.');
  }

  // Process card popularity
  const popularCards = {};
  allCards.forEach(card => {
    const misc = card.misc_info?.[0];
    // Threshold viewsweek > 20 to keep data size reasonable
    if (misc && (misc.viewsweek > 20 || misc.staple === 'Yes')) {
      popularCards[card.id] = {
        name: card.name,
        viewsweek: misc.viewsweek,
        staple: misc.staple === 'Yes',
        archetype: card.archetype
      };
    }
  });

  // Extract unique archetypes from recent decks
  const metaArchetypes = Array.from(new Set(recentDecks.map(d => d.name)));

  const payload = {
    lastUpdated: new Date().toISOString(),
    recentDecks: recentDecks.slice(0, 50),
    metaArchetypes,
    popularCards,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved meta data to ${outputPath} (${Object.keys(popularCards).length} popular cards, ${recentDecks.length} recent decks)`);
} catch (error) {
  console.error('Meta data update failed:', error);
  process.exit(1);
}
