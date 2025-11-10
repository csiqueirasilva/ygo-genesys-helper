import { gzip, ungzip } from 'pako';
import type { DeckSection } from '../types.ts';

export interface ParsedDeck {
  main: number[];
  extra: number[];
  side: number[];
}

const SECTION_NAMES: DeckSection[] = ['main', 'extra', 'side'];

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

  return {
    main: decodeSection(main),
    extra: decodeSection(extra),
    side: decodeSection(side),
  };
}

function decodeSection(section: string): number[] {
  if (!section) {
    return [];
  }

  const bytes = base64ToBytes(section);
  if (bytes.length % 4 !== 0) {
    throw new Error('Invalid YDKE data. Each section must be aligned to 4 bytes.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cards: number[] = [];

  for (let offset = 0; offset < view.byteLength; offset += 4) {
    cards.push(view.getUint32(offset, true));
  }

  return cards;
}

export function encodeDeckHash(ydke: string): string {
  const payload = gzip(ydke.trim());
  return bytesToBase64(payload);
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

function bytesToBase64(bytes: Uint8Array): string {
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

export function getDeckSize(deck?: ParsedDeck): number {
  if (!deck) {
    return 0;
  }

  return SECTION_NAMES.reduce((total, section) => total + deck[section].length, 0);
}
