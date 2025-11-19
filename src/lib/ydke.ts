import { gzip, ungzip } from 'pako';
import type { DeckSection } from '../types.ts';

export interface ParsedDeck {
  main: number[];
  extra: number[];
  side: number[];
  hasInferredIds?: boolean;
  inferredCardCount?: number;
}

const SECTION_NAMES: DeckSection[] = ['main', 'extra', 'side'];

export interface SimpleDeck {
  main: number[];
  extra: number[];
  side: number[];
}

export function parseYdke(rawInput: string): ParsedDeck {
  const sanitized = rawInput.trim();
  if (!sanitized) {
    throw new Error('Paste a YDKE link to get started.');
  }

  const ydkeMarker = sanitized.toLowerCase().indexOf('ydke://');
  const data = ydkeMarker >= 0 ? sanitized.slice(ydkeMarker + 7) : sanitized;
  const sections = data.replace(/\s+/g, '').split('!');

  if (sections.length < 3) {
    throw new Error('Incomplete YDKE link. Make sure it includes main, extra, and side sections.');
  }

  const [main, extra, side] = sections;

  const mainDecoded = decodeSection(main);
  const extraDecoded = decodeSection(extra);
  const sideDecoded = decodeSection(side);

  const inferredCount =
    mainDecoded.inferredCount + extraDecoded.inferredCount + sideDecoded.inferredCount;

  return {
    main: mainDecoded.cards,
    extra: extraDecoded.cards,
    side: sideDecoded.cards,
    hasInferredIds: inferredCount > 0 || undefined,
    inferredCardCount: inferredCount || undefined,
  };
}

interface DecodedSection {
  cards: number[];
  hasInferredIds: boolean;
  inferredCount: number;
}

function decodeSection(section: string): DecodedSection {
  if (!section) {
    return { cards: [], hasInferredIds: false, inferredCount: 0 };
  }

  const bytes = base64ToBytes(section);
  if (bytes.length % 4 !== 0) {
    throw new Error('Invalid YDKE data. Each section must be aligned to 4 bytes.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cards: number[] = [];

  let lastId = 0;
  let hadInferred = false;
  let inferredCount = 0;
  for (let offset = 0; offset < view.byteLength; offset += 4) {
    let cardId = view.getUint32(offset, true);
    if (cardId === 0 && lastId !== 0) {
      // Some deck editors encode alternate-art duplicates as 0. Keep them as 0 so users
      // can manually resolve the missing IDs, but still track that an inferred slot existed.
      hadInferred = true;
      inferredCount += 1;
    } else if (cardId !== 0) {
      lastId = cardId;
    }
    cards.push(cardId);
  }

  return { cards, hasInferredIds: hadInferred, inferredCount };
}

export function encodeDeckHash(ydke: string): string {
  const payload = gzip(ydke.trim());
  return bytesToBase64Url(payload);
}

export function decodeDeckHash(encoded: string): string {
  const bytes = base64ToBytes(encoded);
  const text = ungzip(bytes);
  return new TextDecoder().decode(text);
}

function base64ToBytes(encoded: string): Uint8Array {
  if (typeof atob !== 'function') {
    throw new Error('Base64 decoding is not available in this environment.');
  }

  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const neededPadding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(neededPadding);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof btoa !== 'function') {
    throw new Error('Base64 encoding is not available in this environment.');
  }

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function bytesToBase64Standard(bytes: Uint8Array): string {
  if (typeof btoa !== 'function') {
    throw new Error('Base64 encoding is not available in this environment.');
  }

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function getDeckSize(deck?: ParsedDeck): number {
  if (!deck) {
    return 0;
  }

  return SECTION_NAMES.reduce((total, section) => total + deck[section].length, 0);
}

function encodeSection(ids: number[]): string {
  if (ids.length === 0) {
    return '';
  }
  const bytes = new Uint8Array(ids.length * 4);
  const view = new DataView(bytes.buffer);
  ids.forEach((id, index) => view.setUint32(index * 4, id, true));
  return bytesToBase64Standard(bytes);
}

export function buildYdke(main: number[], extra: number[], side: number[]): string {
  const sections = [encodeSection(main), encodeSection(extra), encodeSection(side)].join('!');
  return `ydke://${sections}`;
}

export function parseYdk(text: string): SimpleDeck {
  const deck: SimpleDeck = { main: [], extra: [], side: [] };
  let current: DeckSection = 'main';

  text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith('#created')) {
        return;
      }

      const lower = line.toLowerCase();
      if (lower === '#main') {
        current = 'main';
        return;
      }
      if (lower === '#extra') {
        current = 'extra';
        return;
      }
      if (lower === '#side' || lower === '!side') {
        current = 'side';
        return;
      }
      if (line.startsWith('#') || line.startsWith('!')) {
        return;
      }

      const id = Number(line);
      if (Number.isFinite(id) && id > 0) {
        deck[current].push(id);
      }
    });

  return deck;
}
