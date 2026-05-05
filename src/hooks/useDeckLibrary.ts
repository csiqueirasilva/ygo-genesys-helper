import { useCallback, useState } from 'react';
import type { SavedDeckFolder } from '../types';
import { 
  SAVED_DECKS_STORAGE_KEY, 
  ensureFolders, 
  createFolder, 
  DEFAULT_FOLDER_NAME, 
  DEFAULT_FOLDER_ID
} from '../constants';

export function useDeckLibrary() {
  const [savedFolders, setSavedFolders] = useState<SavedDeckFolder[]>(() => {
    if (typeof window === 'undefined') return [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID)];
    try {
      const stored = window.localStorage.getItem(SAVED_DECKS_STORAGE_KEY);
      if (!stored) return [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID)];
      const parsed = JSON.parse(stored);
      // Basic validation: ensure it's the correct format
      return (parsed.folders && Array.isArray(parsed.folders)) ? parsed.folders : [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID)];
    } catch {
      return [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID)];
    }
  });

  const persistFolders = useCallback((folders: SavedDeckFolder[]) => {
    if (typeof window === 'undefined') return;
    const payload = { version: 2, folders };
    window.localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const setSavedFoldersAndPersist = useCallback(
    (producer: (prev: SavedDeckFolder[]) => SavedDeckFolder[]) => {
      setSavedFolders((prev) => {
        // Evaluate the producer to get the new state array
        const result = typeof producer === 'function' ? producer(prev) : producer;
        const next = ensureFolders(result);
        
        // Persist the actual resulting array to localStorage
        persistFolders(next);
        
        return next;
      });
    },
    [persistFolders]
  );

  return {
    savedFolders,
    setSavedFolders,
    setSavedFoldersAndPersist,
    persistFolders
  };
}
