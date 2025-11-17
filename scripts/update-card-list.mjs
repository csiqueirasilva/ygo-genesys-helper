import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const CARD_LIST_URL = 'https://www.yugioh-card.com/en/genesys/';
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../src/data/genesys-card-list.json');

const html = await fetch(CARD_LIST_URL);
if (!html.ok) {
  throw new Error(`Failed to fetch Genesys list (${html.status} ${html.statusText})`);
}

const $ = load(await html.text());
const rows = $('table tbody tr');

const cards = [];
rows.each((_, row) => {
  const name = $(row).find('td').eq(0).text().replace(/\s+/g, ' ').trim();
  const pointsText = $(row).find('td').eq(1).text().trim();
  if (!name) {
    return;
  }

  const numericPoints = Number(pointsText.replace(/[^\d.]/g, ''));
  cards.push({
    name,
    points: Number.isFinite(numericPoints) ? numericPoints : 0,
  });
});

if (cards.length === 0) {
  throw new Error('Parsed zero cards from Genesys table.');
}

cards.sort((a, b) => a.name.localeCompare(b.name));

const payload = {
  source: CARD_LIST_URL,
  lastUpdated: new Date().toISOString(),
  cards,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.debug(`Saved ${cards.length} cards to ${outputPath}`);
