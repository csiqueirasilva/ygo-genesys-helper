import { useState, useRef, useEffect } from 'react';

const EditIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const SaveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <rect x="3" y="7" width="12" height="14" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="m5 13 4 4 10-10" />
  </svg>
);

interface CardBreakdown {
  main: number;
  extra: number;
  side: number;
}

interface SummaryPanelProps {
  pointCap: number;
  totalPoints: number;
  cardBreakdown: CardBreakdown;
  cardsOverCap: boolean;
  pointsRemaining: number;
  shareUrl: string;
  shareStatus: 'idle' | 'copied' | 'error';
  unknownCards: number;
  blockedCount: number;
  blockedTotalCount: number;
  cardError: string | null;
  isFetchingCards: boolean;
  onPointCapChange: (value: number) => void;
  onCopyShareLink: () => void;
  onBrowsePointList: () => void;
  onShowBlocked: () => void;
  onBack: () => void;
  onShowSavedDecks: () => void;
  activeDeckName: string | null;
  onRenameDeck: (newName: string) => void;
  onSaveDeck: () => void;
  onExportTxt: () => void;
}

export function SummaryPanel({
  pointCap,
  totalPoints,
  cardBreakdown,
  cardsOverCap,
  pointsRemaining,
  shareUrl,
  shareStatus,
  unknownCards,
  blockedCount,
  blockedTotalCount,
  cardError,
  isFetchingCards,
  onPointCapChange,
  onCopyShareLink,
  onBrowsePointList,
  onShowBlocked,
  onBack,
  onShowSavedDecks,
  activeDeckName,
  onRenameDeck,
  onSaveDeck,
  onExportTxt
}: SummaryPanelProps) {
  const capLabel = pointCap > 0 ? `${pointCap}` : 'No cap';
  const mobileStatusLabel = cardsOverCap ? 'Over cap' : 'Within cap';

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setRenameInput(activeDeckName || '');
      // Slight delay to ensure the input is rendered before focusing
      setTimeout(() => renameInputRef.current?.focus(), 10);
    }
  }, [isRenaming, activeDeckName]);

  const handleRenameSubmit = () => {
    const trimmed = renameInput.trim();
    if (trimmed && trimmed !== activeDeckName) {
      onRenameDeck(trimmed);
    }
    setIsRenaming(false);
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-panel p-3 shadow-panel space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-400 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-sm transition hover:shadow-md md:text-sm"
          >
            <span aria-hidden="true" className="text-base md:text-lg">
              ↩
            </span>
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to import deck</span>
          </button>
          <button
            type="button"
            onClick={onBrowsePointList}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-sm transition hover:shadow-md md:text-sm"
          >
            <span className="h-2 w-2 rounded-full bg-white/70" aria-hidden="true" />
            <span className="sm:hidden">Genesys</span>
            <span className="hidden sm:inline">Genesys list</span>
          </button>
          <button
            type="button"
            onClick={onShowSavedDecks}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:border-white/40 md:text-sm"
          >
            <span className="sm:hidden">Saved</span>
            <span className="hidden sm:inline">Saved decks</span>
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center uppercase justify-center gap-2 rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-slate-100 disabled:opacity-40 transition hover:bg-slate-700"
            onClick={onExportTxt}
            aria-label="Export to TXT"
          >
            <span className="hidden md:inline">Export TXT</span>
            <span className="md:hidden">TXT</span>
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center uppercase justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accentSecondary px-5 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
            disabled={!shareUrl}
            onClick={onCopyShareLink}
            aria-label={shareStatus === 'copied' ? 'Deck link copied' : 'Copy deck link'}
          >
            <span className="md:hidden">
              {shareStatus === 'copied' ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <CopyIcon className="h-5 w-5" />
              )}
            </span>
            <span className="hidden md:inline">
              {shareStatus === 'copied' ? 'Deck link copied' : 'Copy deck link'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
        <div className="flex-1">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="w-full bg-transparent text-lg font-semibold text-white outline-none"
            />
          ) : (
            <h2 className="text-lg font-semibold text-white truncate" title={activeDeckName || 'Untitled deck'}>
              {activeDeckName || 'Untitled deck'}
            </h2>
          )}
        </div>
        {activeDeckName ? (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Rename deck"
            title="Rename deck"
          >
            <EditIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSaveDeck}
            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-400 transition hover:bg-emerald-500/20 hover:text-emerald-300"
            aria-label="Save deck"
            title="Save deck locally"
          >
            <SaveIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {shareStatus === 'error' && (
        <p className="text-xs text-rose-300">Clipboard is unavailable. Copy the link manually.</p>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-400">Points</p>
            <p className={`text-2xl font-bold tracking-tight ${cardsOverCap ? 'text-rose-200' : 'text-white'}`}>
              {totalPoints}
              {pointCap > 0 ? ` / ${capLabel}` : ''}
            </p>
            <p className={`text-[0.6rem] uppercase tracking-[0.3em] ${cardsOverCap ? 'text-rose-200' : 'text-emerald-200'}`}>{mobileStatusLabel}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Main {cardBreakdown.main} / Extra {cardBreakdown.extra} / Side {cardBreakdown.side}
        </p>
      </div>

      <div className="hidden gap-2 sm:grid sm:grid-cols-3">
        <label className="flex flex-col rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
          <span>Max points</span>
          <input
            type="number"
            min={0}
            max={500}
            value={pointCap}
            className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-2 py-1.5 text-center text-2xl font-bold tracking-tight text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            onChange={(event) => onPointCapChange(Number(event.target.value) || 0)}
          />
        </label>

        <div
          className={`flex flex-col items-center rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-400 ${
            cardsOverCap ? 'border-rose-400/60 bg-rose-500/5' : ''
          }`}
        >
          <span>Total points</span>
          <span className={`mt-1 text-2xl font-bold tracking-tight ${cardsOverCap ? 'text-rose-200' : 'text-slate-50'}`}>
            {totalPoints}
          </span>
          <span className={`mt-1 text-[0.65rem] uppercase tracking-[0.2em] ${cardsOverCap ? 'text-rose-200' : 'text-emerald-200'}`}>
            {cardsOverCap ? 'Over cap' : 'Within cap'}
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
          <span>Main / Extra / Side</span>
          <div className="flex items-baseline justify-between gap-4 text-slate-100">
            <span className="text-xl font-semibold tracking-tight text-slate-300">
              {cardBreakdown.main} / {cardBreakdown.extra} / {cardBreakdown.side}
            </span>
          </div>
          {pointCap > 0 && (
            <span className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
              {cardsOverCap ? `-${Math.abs(pointsRemaining)} points` : `${pointsRemaining} points remaining`}
            </span>
          )}
          {unknownCards > 0 && (
            <span className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
              {unknownCards} cards at 0 pts
            </span>
          )}
        </div>
      </div>

      {blockedCount > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-amber-200"
            onClick={onShowBlocked}
          >
            {blockedCount} blocked card types ({blockedTotalCount} cards)
          </button>
        </div>
      )}

      {cardError && <p className="text-xs text-rose-300">{cardError}</p>}
      {isFetchingCards && <p className="text-xs text-slate-400">Loading card details…</p>}
    </section>
  );
}
