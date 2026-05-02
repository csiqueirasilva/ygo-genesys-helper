import { useState, useMemo, useRef, useCallback } from 'react';
import type { SavedDeckEntry, DeckSection, SavedDeckFolder, ParsedDeck } from '../types';
import { parseYdke, buildYdke } from '../lib/ydke';
import { toast } from 'sonner';
import { 
  SAVED_SUMMARY_VERSION 
} from '../constants';

export type DeckInputSource = 'manual' | 'file' | 'json' | 'saved' | 'url' | 'system';

export function useActiveDeck(
  setSavedFoldersAndPersist: (producer: (prev: SavedDeckFolder[]) => SavedDeckFolder[]) => void,
  savedFolders: SavedDeckFolder[]
) {
  const [deckInput, setDeckInput] = useState('');
  const [activeDeck, setActiveDeck] = useState<{ folderId?: string; deckId?: string; name: string } | null>(null);
  const deckInputSourceRef = useRef<DeckInputSource>('system');
  const lastSavedDeckRef = useRef('');

  const { deck, deckError } = useMemo(() => {
    const sanitized = deckInput.trim();
    if (!sanitized) return { deck: null, deckError: null };
    try {
      return { deck: parseYdke(sanitized), deckError: null };
    } catch (error) {
      return {
        deck: null,
        deckError: error instanceof Error ? error.message : 'Invalid YDKE link.',
      };
    }
  }, [deckInput]);

  const handleSaveDeck = useCallback(
    (name: string, folderId?: string, points?: number) => {
      const deckString = deckInput.trim();
      if (!deckString) {
        toast.error('Load or paste a deck before saving.');
        return;
      }
      
      let canonicalDeck = deckString;
      let parsed: ParsedDeck | null = null;
      try {
        parsed = parseYdke(deckString);
        canonicalDeck = buildYdke(parsed.main, parsed.extra, parsed.side);
      } catch {}

      const trimmedName = name.trim();
      const fallbackName = trimmedName || activeDeck?.name || 'Untitled deck';
      const timestamp = new Date().toISOString();
      const summary = {
        main: parsed?.main.length || 0,
        extra: parsed?.extra.length || 0,
        side: parsed?.side.length || 0,
        points: points,
        version: SAVED_SUMMARY_VERSION
      };

      const folderIdToSearch = activeDeck?.folderId;
      const deckIdToSearch = activeDeck?.deckId;
      const existingFolder = folderIdToSearch ? savedFolders.find(f => f.id === folderIdToSearch) : null;
      const existingDeck = deckIdToSearch ? existingFolder?.decks.find(d => d.id === deckIdToSearch) : null;

      if (existingDeck && folderIdToSearch && deckIdToSearch) {
        let updatedName = '';
        setSavedFoldersAndPersist((prev) =>
          prev.map((folder) => {
            if (folder.id !== folderIdToSearch) return folder;
            const decks = folder.decks.map((deckEntry) => {
              if (deckEntry.id !== deckIdToSearch) return deckEntry;
              const nextName = trimmedName || deckEntry.name;
              updatedName = nextName;
              return {
                ...deckEntry,
                name: nextName,
                deck: canonicalDeck,
                savedAt: timestamp,
                summary,
              };
            });
            return { ...folder, decks };
          }),
        );
        toast.success('Saved deck updated.');
        setActiveDeck({ folderId: folderIdToSearch, deckId: deckIdToSearch, name: updatedName || existingDeck.name });
        lastSavedDeckRef.current = deckString;
        return;
      }

      const entry: SavedDeckEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: fallbackName,
        deck: canonicalDeck,
        savedAt: timestamp,
        summary,
      };

      setSavedFoldersAndPersist((prev) => {
        const next = [...prev];
        let targetIndex = folderId ? next.findIndex((f) => f.id === folderId) : -1;
        if (targetIndex < 0) targetIndex = 0;
        
        const targetFolder = next[targetIndex];
        targetFolder.decks = [entry, ...targetFolder.decks].slice(0, 200);
        
        setActiveDeck({ folderId: targetFolder.id, deckId: entry.id, name: entry.name });
        toast.success('Deck saved locally.');
        return next;
      });
      lastSavedDeckRef.current = deckString;
    },
    [deckInput, activeDeck, savedFolders, setSavedFoldersAndPersist]
  );

  const handleUpdateCardCount = useCallback((zone: DeckSection, cardId: number, delta: number) => {
    const parsed = parseYdke(deckInput);
    const section = parsed[zone];
    const index = section.indexOf(cardId);
    if (index === -1 && delta < 0) return;
    
    if (delta > 0) {
      section.push(cardId);
    } else {
      section.splice(index, 1);
    }
    
    deckInputSourceRef.current = 'manual';
    setDeckInput(buildYdke(parsed.main, parsed.extra, parsed.side));
  }, [deckInput]);

  const handleRemoveCard = useCallback((zone: DeckSection, cardId: number) => {
    const parsed = parseYdke(deckInput);
    const section = parsed[zone];
    const index = section.indexOf(cardId);
    if (index !== -1) {
      section.splice(index, 1);
      deckInputSourceRef.current = 'manual';
      setDeckInput(buildYdke(parsed.main, parsed.extra, parsed.side));
    }
  }, [deckInput]);

  const handleAddCard = useCallback((zone: DeckSection, cardId: number) => {
    const parsed = parseYdke(deckInput);
    parsed[zone].push(cardId);
    deckInputSourceRef.current = 'manual';
    setDeckInput(buildYdke(parsed.main, parsed.extra, parsed.side));
  }, [deckInput]);

  return {
    deckInput,
    setDeckInput,
    activeDeck,
    setActiveDeck,
    deckInputSourceRef,
    lastSavedDeckRef,
    deck,
    deckError,
    handleSaveDeck,
    handleUpdateCardCount,
    handleRemoveCard,
    handleAddCard
  };
}
