import type { CardDetails } from '../types.ts';

const API_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const CHUNK_SIZE = 40;

interface ApiCardImage {
  image_url?: string;
  image_url_small?: string;
}

interface ApiResponse {
  data?: ApiCard[];
  error?: string;
}

interface ApiCard {
  id: number;
  name: string;
  type?: string;
  race?: string;
  level?: number;
  linkval?: number;
  desc?: string;
  ygoprodeck_url?: string;
  card_images?: ApiCardImage[];
}

export async function fetchCardsByIds(ids: number[]): Promise<Record<number, CardDetails>> {
  const unique = Array.from(new Set(ids.filter((id) => id > 0)));
  if (unique.length === 0) {
    return {};
  }

  const resolved: Record<number, CardDetails> = {};

  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const cards = await fetchChunk(chunk);
    cards.forEach((card) => {
      resolved[card.id] = {
        id: card.id,
        name: card.name,
        type: card.type,
        race: card.race,
        level: card.level,
        linkValue: card.linkval,
        image: card.card_images?.[0]?.image_url_small ?? card.card_images?.[0]?.image_url,
        desc: card.desc,
        ygoprodeckUrl: card.ygoprodeck_url,
      };
    });
  }

  return resolved;
}

async function fetchChunk(chunk: number[]): Promise<ApiCard[]> {
  const joined = chunk.join(',');
  const url = `${API_ENDPOINT}?id=${joined}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const payload = (await response.json()) as ApiResponse;
      return payload.data ?? [];
    }

    // If the bulk request fails (usually due to an unknown card id),
    // fall back to querying each card individually.
    if (chunk.length === 1) {
      return [];
    }
  } catch (error) {
    if (chunk.length === 1) {
      throw new Error(
        `Failed to load card ${chunk[0]} from YGOProDeck: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const midpoint = Math.ceil(chunk.length / 2);
  const left = await fetchChunk(chunk.slice(0, midpoint));
  const right = await fetchChunk(chunk.slice(midpoint));

  return [...left, ...right];
}

export async function fetchCardByName(name: string): Promise<CardDetails | null> {
  const buildCard = (card: ApiCard): CardDetails => ({
    id: card.id,
    name: card.name,
    type: card.type,
    race: card.race,
    level: card.level,
    linkValue: card.linkval,
    image: card.card_images?.[0]?.image_url_small ?? card.card_images?.[0]?.image_url,
    desc: card.desc,
    ygoprodeckUrl: card.ygoprodeck_url,
  });

  const search = async (query: string, mode: 'name' | 'fname'): Promise<CardDetails | null> => {
    const url = `${API_ENDPOINT}?${mode}=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as ApiResponse;
      const card = payload.data?.[0];
      return card ? buildCard(card) : null;
    } catch {
      return null;
    }
  };

  return (await search(name, 'name')) ?? (await search(name, 'fname'));
}
