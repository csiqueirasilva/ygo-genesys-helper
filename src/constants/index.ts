import type { SavedDeckFolder, SavedDeckEntry } from '../types';

export const DEFAULT_POINT_CAP = 100;
export const SAVED_DECKS_STORAGE_KEY = 'ygo-genesys-saved-decks-v1';
export const DEFAULT_FOLDER_ID = 'folder-default';
export const DEFAULT_FOLDER_NAME = 'Unsorted';
export const SAVED_SUMMARY_VERSION = 2;
export const FOLDER_OPEN_STORAGE_KEY = 'ygo-genesys-folder-open';
export const USER_PROFILE_STORAGE_KEY = 'ygo-user-profile';

export const generateFolderId = () => `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createFolder = (name: string, id?: string, decks: SavedDeckEntry[] = []): SavedDeckFolder => ({
  id: id ?? generateFolderId(),
  name,
  decks,
});

export const ensureFolders = (folders: SavedDeckFolder[]) =>
  folders.length > 0 ? folders : [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID)];
