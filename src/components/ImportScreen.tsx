import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { GenesysPayload, SavedDeckFolder } from '../types';
import { formatTimestamp } from '../lib/strings.ts';

interface ImportScreenProps {
  genesysData: GenesysPayload;
  deckInput: string;
  deckError: string | null;
  hasDeck: boolean;
  onDeckInputChange: (value: string) => void;
  onViewBreakdown: () => void;
  onImportYdkFile: (file: File) => void;
  onImportJsonDeck: (file: File) => void;
  savedFolders: SavedDeckFolder[];
  onSaveDeck: (name: string, folderId?: string) => void;
  onLoadSavedDeck: (folderId: string, deckId: string) => void;
  onDeleteSavedDeck: (folderId: string, deckId: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onExportSavedDecks: () => void;
  onImportSavedDecks: (file: File) => void;
}

export function ImportScreen({
  genesysData,
  deckInput,
  deckError,
  hasDeck,
  onDeckInputChange,
  onViewBreakdown,
  onImportYdkFile,
  onImportJsonDeck,
  savedFolders,
  onSaveDeck,
  onLoadSavedDeck,
  onDeleteSavedDeck,
  onCreateFolder,
  onDeleteFolder,
  onExportSavedDecks,
  onImportSavedDecks,
}: ImportScreenProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounter = useRef(0);
  const [savedName, setSavedName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const processFile = useCallback(
    (file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'json' || file.type === 'application/json') {
        onImportJsonDeck(file);
        return;
      }
      onImportYdkFile(file);
    },
    [onImportJsonDeck, onImportYdkFile],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      event.target.value = '';
    }
  };

  const handleSavedLibraryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportSavedDecks(file);
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (savedFolders.length === 0) {
      setSelectedFolderId('');
      return;
    }
    if (!savedFolders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(savedFolders[0].id);
    }
  }, [savedFolders, selectedFolderId]);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types?.includes('Files')) {
      dragCounter.current += 1;
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    dragCounter.current = 0;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div
      className="relative space-y-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="rounded-[32px] border border-cyan-400/60 bg-black/70 px-8 py-10 text-center text-cyan-100 shadow-lg">
            <p className="text-xl font-semibold uppercase tracking-[0.3em]">Drop deck file</p>
            <p className="mt-2 text-sm text-cyan-200">Drag a .ydk or .json file anywhere on the screen to import.</p>
          </div>
        </div>
      )}
      <header className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-6 shadow-panel flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Yu-Gi-Oh! Genesys</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">Genesys helper</h1>
              <a
                href="/ygo-genesys-helper/"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-slate-200 transition hover:border-white/60 hover:text-white"
                aria-label="Open Genesys helper home"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M10 14 21 3" />
                  <path d="M21 10V3h-7" />
                  <path d="M21 21H3V3" />
                </svg>
              </a>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Paste your YDKE link, get instant point totals, see which cards consume the most points, and share your build
              with a single link.
            </p>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <p>
              Data powered by{' '}
              <a href="https://ygoprodeck.com/" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                YGOProDeck
              </a>
            </p>
            <p>
              <a href="https://www.yugioh-card.com/en/genesys/" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                Genesys list
              </a>{' '}
              last updated
            </p>
            <p className="text-lg font-semibold text-white">{formatTimestamp(genesysData.lastUpdated)}</p>
            <p>{genesysData.cards.length} tracked cards</p>
          </div>
        </div>
      </header>

      <section className="rounded-[28px] border border-white/10 bg-panel/90 p-5 shadow-panel space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">1. Paste your YDKE deck</h2>
          <span className="text-sm text-slate-400">Example: ydke://AAA..!BBB..!CCC!</span>
        </div>
        <textarea
          spellCheck={false}
          placeholder="ydke://..."
          className="w-full min-h-[140px] rounded-2xl border border-white/10 bg-black/40 p-4 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          value={deckInput}
          onChange={(event) => onDeckInputChange(event.target.value)}
        />
        {deckError && <p className="text-sm text-rose-300">{deckError}</p>}
        {!deckError && !hasDeck && (
          <p className="text-sm text-slate-400">Your point breakdown will appear as soon as we detect a valid YDKE link.</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            className="rounded-full bg-gradient-to-r from-accent to-accentSecondary px-6 py-3 text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!hasDeck || Boolean(deckError)}
            onClick={onViewBreakdown}
          >
            View point breakdown
          </button>
          <small className="text-xs text-slate-400">Requires a valid YDKE link.</small>
        </div>
        <div className="flex flex-col gap-1">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-dashed border-white/20 px-6 py-3 text-sm font-medium text-slate-200 hover:border-white/40">
            <span>Import deck from .ydk or .json file</span>
            <input type="file" accept=".ydk,.json,text/plain,application/json" className="sr-only" onChange={handleFileChange} />
          </label>
          <small className="text-xs text-slate-400">We’ll convert YDK or Tag Force JSON decks into YDKE automatically.</small>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-panel/90 p-5 shadow-panel space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">2. Saved decks</h2>
          <span className="text-sm text-slate-400">
            Store decks in this browser and export/import them as JSON backups.
          </span>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Deck name
            </label>
            <input
              type="text"
              value={savedName}
              onChange={(event) => setSavedName(event.target.value)}
              placeholder="Deck name"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
            />
          </div>
          <div className="w-full space-y-1 md:w-56">
            <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Folder
            </label>
            <select
              value={selectedFolderId}
              onChange={(event) => setSelectedFolderId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold uppercase tracking-[0.15em] text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
            >
              {savedFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-6 py-3 text-sm font-semibold text-slate-900 disabled:opacity-40"
            disabled={!hasDeck || Boolean(deckError) || !selectedFolderId}
            onClick={() => {
              onSaveDeck(savedName, selectedFolderId);
              setSavedName('');
            }}
          >
            Save current deck
          </button>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              New folder
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Folder name"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
            />
          </div>
          <button
            type="button"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-white/40"
            onClick={() => {
              const trimmed = newFolderName.trim();
              if (!trimmed) {
                return;
              }
              onCreateFolder(trimmed);
              setNewFolderName('');
            }}
          >
            Create folder
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/40"
            onClick={onExportSavedDecks}
          >
            Export saved decks
          </button>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/40">
            Import saved decks
            <input type="file" accept="application/json,.json" className="sr-only" onChange={handleSavedLibraryChange} />
          </label>
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          {savedFolders.every((folder) => folder.decks.length === 0) ? (
            <p className="text-sm text-slate-400">
              No saved decks yet. Save a deck above to keep it available between sessions.
            </p>
          ) : (
            savedFolders.map((folder) => (
              <div key={folder.id} className="space-y-2 rounded-2xl border border-white/5 bg-black/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {folder.name} · {folder.decks.length} deck{folder.decks.length === 1 ? '' : 's'}
                  </h3>
                  <button
                    type="button"
                    className="text-xs text-rose-200 hover:text-rose-100 disabled:opacity-40"
                    onClick={() => onDeleteFolder(folder.id)}
                    disabled={folder.decks.length > 0 || savedFolders.length <= 1}
                  >
                    Delete folder
                  </button>
                </div>
                {folder.decks.length === 0 ? (
                  <p className="text-xs text-slate-500">Empty folder.</p>
                ) : (
                  <ul className="space-y-2">
                    {folder.decks.map((deck) => (
                      <li
                        key={deck.id}
                        className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/40 p-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-white">{deck.name}</p>
                          <p className="text-xs text-slate-400">
                            Saved {new Date(deck.savedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:border-white"
                            onClick={() => onLoadSavedDeck(folder.id, deck.id)}
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-rose-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200 hover:border-rose-300"
                            onClick={() => onDeleteSavedDeck(folder.id, deck.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
