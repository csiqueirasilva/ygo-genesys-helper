import type { SavedDeckFolder, SavedDeckEntry } from '../types';
import { 
  createFolder, 
  DEFAULT_FOLDER_NAME, 
  DEFAULT_FOLDER_ID,
  generateFolderId
} from '../constants';

export const normalizeDeckEntry = (raw: any): SavedDeckEntry | null => {
  const deck = typeof raw?.deck === 'string' ? raw.deck.trim() : '';
  if (!deck) return null;

  const id =
    typeof raw?.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  
  const name = typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Untitled deck';
  const savedAt = typeof raw?.savedAt === 'string' && raw.savedAt.trim() ? raw.savedAt : new Date().toISOString();
  
  const summary = raw?.summary && typeof raw.summary === 'object'
      ? {
          main: Number(raw.summary.main) || 0,
          extra: Number(raw.summary.extra) || 0,
          side: Number(raw.summary.side) || 0,
          points: Number.isFinite(Number(raw.summary.points)) ? Number(raw.summary.points) : undefined,
          version: Number(raw.summary.version) || undefined,
        }
      : undefined;

  return { id, name, deck, savedAt, summary };
};

export const normalizeFolders = (raw: any, ensureDefault = true): SavedDeckFolder[] => {
  let folders: SavedDeckFolder[] = [];
  if (Array.isArray(raw?.folders)) {
    folders = raw.folders
      .map((folder: any): SavedDeckFolder | null => {
        const decks = Array.isArray(folder?.decks)
          ? folder.decks.map((entry: any) => normalizeDeckEntry(entry)).filter(Boolean) as SavedDeckEntry[]
          : [];
        const name = typeof folder?.name === 'string' && folder.name.trim() ? folder.name.trim() : DEFAULT_FOLDER_NAME;
        const id = typeof folder?.id === 'string' && folder.id.trim() ? folder.id.trim() : generateFolderId();
        return createFolder(name, id, decks);
      })
      .filter(Boolean) as SavedDeckFolder[];
  } else if (Array.isArray(raw?.decks)) {
    const decks = raw.decks.map((entry: any) => normalizeDeckEntry(entry)).filter(Boolean) as SavedDeckEntry[];
    folders = [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID, decks)];
  } else if (Array.isArray(raw)) {
    const decks = raw.map((entry: any) => normalizeDeckEntry(entry)).filter(Boolean) as SavedDeckEntry[];
    folders = [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID, decks)];
  }

  return ensureDefault && folders.length === 0 ? [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID)] : folders;
};
