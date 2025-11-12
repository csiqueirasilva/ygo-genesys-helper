import { useEffect, useMemo, useState } from 'react';
import type { CardDetails, DeckSection } from '../types';
import { formatCardTypeLabel } from '../lib/strings';
import { searchCards } from '../lib/ygoprodeck';

const PAGE_SIZE = 5;
const zoneLabels: Record<DeckSection, string> = {
  main: 'Main Deck',
  extra: 'Extra Deck',
  side: 'Side Deck',
};

export interface MissingReplacementPick {
  card: CardDetails;
  count: number;
}

interface MissingIdResolverProps {
  zone: DeckSection;
  cardName: string;
  missingCount: number;
  onClose: () => void;
  onResolve: (selection: MissingReplacementPick[]) => void;
}

export function MissingIdResolver({
  zone,
  cardName,
  missingCount,
  onClose,
  onResolve,
}: MissingIdResolverProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<CardDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCards, setSelectedCards] = useState<CardDetails[]>([]);

  // Reset internal state whenever a different missing group is opened.
  useEffect(() => {
    setQuery('');
    setDebouncedQuery('');
    setPage(0);
    setResults([]);
    setSearchError(null);
    setSelectedCards([]);
  }, [zone, cardName]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Clamp selection when the number of available slots shrinks.
  useEffect(() => {
    setSelectedCards((prev) => {
      if (prev.length <= missingCount) {
        return prev;
      }
      return prev.slice(0, missingCount);
    });
  }, [missingCount]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery]);

  useEffect(() => {
    const normalized = debouncedQuery.trim();
    if (normalized.length < 3) {
      setResults([]);
      setSearchError(null);
      setHasMore(false);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    (async () => {
      try {
        const { cards, hasMore: more } = await searchCards({
          query: normalized,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        setResults(cards);
        setHasMore(more);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setResults([]);
        setHasMore(false);
        setSearchError(
          error instanceof Error ? error.message : 'Unable to search cards right now.',
        );
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page]);

  const selectedSummary = useMemo<MissingReplacementPick[]>(() => {
    const grouped = new Map<number, MissingReplacementPick>();
    selectedCards.forEach((card) => {
      const existing = grouped.get(card.id);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(card.id, { card, count: 1 });
      }
    });
    return Array.from(grouped.values());
  }, [selectedCards]);

  const remainingSlots = Math.max(missingCount - selectedCards.length, 0);

  const handleAddCard = (card: CardDetails) => {
    setSelectedCards((prev) => {
      if (prev.length >= missingCount) {
        return prev;
      }
      return [...prev, card];
    });
  };

  const handleRemoveSingle = (cardId: number) => {
    setSelectedCards((prev) => {
      const copy = [...prev];
      let targetIndex = -1;
      for (let index = copy.length - 1; index >= 0; index -= 1) {
        if (copy[index].id === cardId) {
          targetIndex = index;
          break;
        }
      }
      if (targetIndex === -1) {
        return prev;
      }
      copy.splice(targetIndex, 1);
      return copy;
    });
  };

  const handleConfirm = () => {
    if (selectedSummary.length === 0 || missingCount === 0) {
      return;
    }
    onResolve(selectedSummary);
  };

  const handleClear = () => setSelectedCards([]);

  const disableAddButtons = selectedCards.length >= missingCount || missingCount === 0;
  const showSearchPrompt = debouncedQuery.trim().length < 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">
              Resolve missing cards
            </p>
            <h2 className="text-2xl font-semibold text-white">{cardName}</h2>
            <p className="text-sm text-slate-400">
              {zoneLabels[zone]} · {missingCount} missing slot{missingCount === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            className="text-2xl text-slate-300 hover:text-white"
            onClick={onClose}
            aria-label="Close missing id resolver"
          >
            ×
          </button>
        </div>

        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-white/10 bg-black/30 p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Search YGOProDeck
              <input
                type="search"
                value={query}
                placeholder="Enter at least 3 characters"
                className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white tracking-normal outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="mt-3 flex-1 space-y-2 overflow-hidden">
              {showSearchPrompt ? (
                <p className="text-sm text-slate-500">
                  Start typing to search the public YGOProDeck database.
                </p>
              ) : searchError ? (
                <p className="text-sm text-rose-300">{searchError}</p>
              ) : isSearching ? (
                <p className="text-sm text-slate-400">Searching cards…</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-slate-500">No cards found. Try a different keyword.</p>
              ) : (
                <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {results.map((card) => (
                    <li
                      key={card.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2"
                    >
                      <div className="h-16 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {card.image ? (
                          <img src={card.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                            No art
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{card.name}</p>
                        <p className="text-xs text-slate-400">
                          {formatCardTypeLabel(card.type, card.race)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white disabled:opacity-40"
                        disabled={disableAddButtons}
                        onClick={() => handleAddCard(card)}
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 font-semibold uppercase tracking-wide text-white disabled:opacity-40"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={page === 0 || showSearchPrompt || isSearching}
              >
                Prev
              </button>
              <span>Page {page + 1}</span>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 font-semibold uppercase tracking-wide text-white disabled:opacity-40"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!hasMore || showSearchPrompt || isSearching}
              >
                Next
              </button>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Replacement picks
                </p>
                <p className="text-lg font-semibold text-white">
                  {selectedCards.length} / {missingCount} selected
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline disabled:opacity-40"
                onClick={handleClear}
                disabled={selectedCards.length === 0}
              >
                Clear
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              {selectedSummary.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Pick cards from the search results to replace each missing ID. You can select the
                  same card multiple times.
                </p>
              ) : (
                <ul className="space-y-3">
                  {selectedSummary.map((entry) => (
                    <li
                      key={entry.card.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="h-16 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {entry.card.image ? (
                          <img
                            src={entry.card.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                            No art
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{entry.card.name}</p>
                        <p className="text-xs text-slate-400">
                          {formatCardTypeLabel(entry.card.type, entry.card.race)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-7 w-7 rounded-full border border-white/20 text-center text-sm font-semibold text-white disabled:opacity-40"
                          onClick={() => handleRemoveSingle(entry.card.id)}
                        >
                          −
                        </button>
                        <span className="text-base font-semibold text-white">×{entry.count}</span>
                        <button
                          type="button"
                          className="h-7 w-7 rounded-full border border-white/20 text-center text-sm font-semibold text-white disabled:opacity-40"
                          onClick={() => handleAddCard(entry.card)}
                          disabled={disableAddButtons}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 space-y-2 text-center">
              {remainingSlots > 0 ? (
                <p className="text-xs text-slate-400">
                  {remainingSlots} slot{remainingSlots === 1 ? '' : 's'} will remain missing after
                  confirmation.
                </p>
              ) : (
                <p className="text-xs text-emerald-300">All missing slots will be replaced.</p>
              )}
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-900 disabled:opacity-40"
                onClick={handleConfirm}
                disabled={selectedSummary.length === 0 || missingCount === 0}
              >
                Confirm replacements
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
