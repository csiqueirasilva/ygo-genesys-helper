import type { CardDetails } from '../types.ts';

const API_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const CHUNK_SIZE = 40;

interface ApiCardImage {
  image_url?: string;
  image_url_small?: string;
  image_url_cropped?: string;
}

interface ApiMeta {
  total_rows?: number;
  rows_remaining?: number;
  total_pages?: number;
  pages_remaining?: number;
  next_page_offset?: number;
}

interface ApiResponse {
  data?: ApiCard[];
  error?: string;
  meta?: ApiMeta;
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
  misc_info?: Array<{
    konami_id?: number;
  }>;
}

const adaptApiCard = (card: ApiCard): CardDetails => ({
  id: card.id,
  name: card.name,
  type: card.type,
  race: card.race,
  level: card.level,
  linkValue: card.linkval,
  image: card.card_images?.[0]?.image_url_small ?? card.card_images?.[0]?.image_url,
  imageCropped: card.card_images?.[0]?.image_url_cropped ?? card.card_images?.[0]?.image_url,
  desc: card.desc,
  ygoprodeckUrl: card.ygoprodeck_url,
});

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
        ...adaptApiCard(card),
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
  const search = async (query: string, mode: 'name' | 'fname'): Promise<CardDetails | null> => {
    const url = `${API_ENDPOINT}?${mode}=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as ApiResponse;
      const card = payload.data?.[0];
      return card ? adaptApiCard(card) : null;
    } catch {
      return null;
    }
  };

  return (await search(name, 'name')) ?? (await search(name, 'fname'));
}

export async function fetchCardsByKonamiIds(ids: number[]): Promise<Record<number, CardDetails>> {
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
    const joined = chunk.join(',');
    const url = `${API_ENDPOINT}?konami_id=${joined}&misc=yes`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }
      const payload = (await response.json()) as ApiResponse;
      payload.data?.forEach((card) => {
        const konamiId = card.misc_info?.[0]?.konami_id;
        if (!konamiId) {
          return;
        }
        resolved[konamiId] = adaptApiCard(card);
      });
    } catch (error) {
      throw new Error(
        `Failed to load Konami IDs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return resolved;
}

export interface CardSearchOptions {
  query: string;
  page?: number;
  pageSize?: number;
}

export interface CardSearchResult {
  cards: CardDetails[];
  total: number;
  hasMore: boolean;
}

export async function searchCards(options: CardSearchOptions): Promise<CardSearchResult> {
  const { query, page = 0, pageSize = 5 } = options;
  const trimmed = query.trim();
  if (!trimmed) {
    return { cards: [], total: 0, hasMore: false };
  }

  const offset = page * pageSize;
  const wildcardQuery = trimmed.replace(/\s+/g, '%');
  const params = new URLSearchParams({
    fname: wildcardQuery,
    num: String(pageSize),
    offset: String(offset),
  });
  const url = `${API_ENDPOINT}?${params.toString()}`;

  try {
    const response = await fetch(url);
    let payload: ApiResponse | null = null;
    try {
      payload = (await response.json()) as ApiResponse;
    } catch {
      payload = null;
    }

    const errorMessage =
      payload?.error ?? (response.ok ? null : `Search failed with status ${response.status}`);
    if (errorMessage) {
      const normalized = errorMessage.toLowerCase();
      if (normalized.includes('no card matching')) {
        return { cards: [], total: 0, hasMore: false };
      }
      throw new Error(errorMessage);
    }

    const safePayload: ApiResponse = payload ?? {};
    const cards = safePayload.data?.map((card) => adaptApiCard(card)) ?? [];
    const total = safePayload.meta?.total_rows ?? cards.length;
    const hasMore =
      Boolean(safePayload.meta?.rows_remaining && safePayload.meta.rows_remaining > 0) ||
      Boolean(safePayload.meta?.pages_remaining && safePayload.meta.pages_remaining > 0) ||
      Boolean(safePayload.meta?.next_page_offset);

    return {
      cards,
      total,
      hasMore,
    };
  } catch (error) {
    throw new Error(
      `Unable to search YGOProDeck: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
