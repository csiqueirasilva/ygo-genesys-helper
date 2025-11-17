import type { SavedDeckFolder } from '../types';
import { formatTimestamp } from '../lib/strings.ts';

interface SavedDeckModalProps {
  folders: SavedDeckFolder[];
  onLoadDeck: (folderId: string, deckId: string) => void;
  onClose: () => void;
  showUnsavedNotice?: boolean;
  onSaveCurrentDeck?: () => void;
}

export function SavedDeckModal({ folders, onLoadDeck, onClose, showUnsavedNotice, onSaveCurrentDeck }: SavedDeckModalProps) {
  const hasDecks = folders.some((folder) => folder.decks.length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Saved decks</p>
            <h2 className="text-2xl font-semibold">Swap decks</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-300 hover:text-white"
            aria-label="Close saved decks"
          >
            ×
          </button>
        </div>

        {showUnsavedNotice && onSaveCurrentDeck && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
            <p className="font-semibold text-white">Current deck isn&apos;t saved.</p>
            <p className="mt-1 text-amber-100/80">
              Save it to your library to reuse it later.
            </p>
            <button
              type="button"
              onClick={onSaveCurrentDeck}
              className="mt-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900"
            >
              Save to library
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          {!hasDecks ? (
            <p className="text-sm text-slate-400">No saved decks available. Save a deck on the import screen to access it here.</p>
          ) : (
            <div className="space-y-4">
              {folders.map((folder) => (
                <div key={folder.id} className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-sm font-semibold text-white">
                    {folder.name} · {folder.decks.length} deck{folder.decks.length === 1 ? '' : 's'}
                  </p>
                  {folder.decks.length === 0 ? (
                    <p className="text-xs text-slate-500">Empty folder</p>
                  ) : (
                    <ul className="space-y-2">
                      {folder.decks.map((deck) => (
                        <li
                          key={deck.id}
                          className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/40 p-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-white">{deck.name}</p>
                            <p className="text-xs text-slate-400">Saved {formatTimestamp(deck.savedAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onLoadDeck(folder.id, deck.id)}
                            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:border-white"
                          >
                            Load deck
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          <a href="#/" className="text-cyan-300 hover:underline">
            Manage folders and saved decks from the import screen.
          </a>
        </p>
      </div>
    </div>
  );
}
