import { useMemo, useState } from 'react';
import type { DeckCardGroup, DeckGroups, DeckSection } from '../types';
import { formatCardTypeLabel } from '../lib/strings';

interface CardSectionsProps {
  deckGroups: DeckGroups | null;
  onCardSelect: (card: DeckCardGroup) => void;
  onMissingCardSelect?: (card: DeckCardGroup) => void;
  sortMode: Record<DeckSection, 'points' | 'default'>;
  onSortModeChange: (zone: DeckSection, mode: 'points' | 'default') => void;
}

const sections: DeckSection[] = ['main', 'extra', 'side'];

export function CardSections({
  deckGroups,
  onCardSelect,
  onMissingCardSelect,
  sortMode,
  onSortModeChange,
}: CardSectionsProps) {
  if (!deckGroups) {
    return <p className="text-sm text-slate-400">Paste a deck to unlock card insights.</p>;
  }

  const [gridView, setGridView] = useState<Record<DeckSection, boolean>>({
    main: true,
    extra: true,
    side: true,
  });

  const expandedCards = useMemo(() => {
    return sections.reduce<Record<DeckSection, DeckCardGroup[]>>((acc, zone) => {
      if (!deckGroups) {
        acc[zone] = [];
        return acc;
      }
      if (!gridView[zone]) {
        acc[zone] = deckGroups[zone];
        return acc;
      }
      const expanded: DeckCardGroup[] = [];
      deckGroups[zone].forEach((card) => {
        if (card.count <= 1) {
          expanded.push(card);
          return;
        }
        for (let index = 0; index < card.count; index += 1) {
          expanded.push({
            ...card,
            count: 1,
            totalPoints: card.totalPoints / card.count,
          });
        }
      });
      acc[zone] = expanded;
      return acc;
    }, { main: [], extra: [], side: [] });
  }, [deckGroups, gridView]);

  const formatZoneTitle = (zone: DeckSection) => {
    const label = zone === 'main' ? 'Main Deck' : zone === 'extra' ? 'Extra Deck' : 'Side Deck';
    const cardCount = deckGroups[zone].reduce((sum, card) => sum + card.count, 0);
    return `${label} · ${cardCount} cards`;
  };

  const getFrameColors = (card: DeckCardGroup) => {
    const type = (card.type ?? '').toLowerCase();
    const base = { header: '#111827', badge: '#0f172a' };
    if (type.includes('spell')) {
      return { header: '#0f766e', badge: '#0f172a' };
    }
    if (type.includes('trap')) {
      return { header: '#6d1a5d', badge: '#0f172a' };
    }
    if (type.includes('synchro')) {
      return { header: '#94a3b8', badge: '#1e293b' };
    }
    if (type.includes('fusion')) {
      return { header: '#633974', badge: '#1f2937' };
    }
    if (type.includes('ritual')) {
      return { header: '#1d4ed8', badge: '#1e293b' };
    }
    if (type.includes('xyz')) {
      return { header: '#0f172a', badge: '#111827' };
    }
    if (type.includes('link')) {
      return { header: '#0c4a6e', badge: '#0f172a' };
    }
    if (type.includes('pendulum')) {
      return { header: '#0d9488', badge: '#0f172a' };
    }
    if (type.includes('monster') && type.includes('normal')) {
      return { header: '#d97706', badge: '#1f1305' };
    }
    if (type.includes('monster')) {
      return { header: '#7c2d12', badge: '#1c1917' };
    }
    return base;
  };

  return (
    <div className="space-y-6">
      {sections.map((zone) => (
        <div key={zone} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{formatZoneTitle(zone)}</h3>
              <span>
                {deckGroups[zone].reduce((sum, card) => sum + card.totalPoints, 0)} pts ·{' '}
                {deckGroups[zone].reduce((sum, card) => sum + (card.notInList ? card.count : 0), 0)} off-list
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] transition ${
                  gridView[zone]
                    ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                    : 'border-white/15 bg-black/20 text-slate-300 hover:border-white/30'
                }`}
                onClick={() => setGridView((prev) => ({ ...prev, [zone]: !prev[zone] }))}
                aria-pressed={gridView[zone]}
                title={gridView[zone] ? 'Show list view' : 'Show grid view'}
              >
                <span aria-hidden="true">{gridView[zone] ? '☰' : '▦'}</span>
                <span className="sr-only">Toggle grid view</span>
              </button>
              <label className="flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">
                Sort
                <select
                  className="rounded-full border border-white/10 bg-slate-900/80 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 outline-none focus:border-accent"
                  value={sortMode[zone]}
                  onChange={(event) => onSortModeChange(zone, event.target.value as 'points' | 'default')}
                >
                  <option value="points">Points ↓</option>
                  <option value="default">Default</option>
                </select>
              </label>
            </div>
          </div>
          {deckGroups[zone].length === 0 ? (
            <p className="text-sm text-slate-500">No cards in this section.</p>
          ) : (
            <ul
              className={
                gridView[zone]
                  ? 'grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                  : 'grid gap-3 md:grid-cols-2'
              }
            >
              {expandedCards[zone].map((card, index) => {
                const handleSelect = () => {
                  if (card.id <= 0) {
                    onMissingCardSelect?.(card);
                    return;
                  }
                  onCardSelect(card);
                };

                if (gridView[zone]) {
                  const colors = getFrameColors(card);
                  return (
                    <li
                      key={`${zone}-${card.id}-${card.name}-grid-${index}`}
                      className="relative overflow-hidden rounded-xl border border-white/15 bg-black/30 text-xs text-white"
                    >
                      <button type="button" className="block w-full" onClick={handleSelect}>
                        <div className="relative">
                          {card.fullImage || card.image ? (
                            <img
                              src={card.fullImage ?? card.image}
                              alt={card.name}
                              className="h-40 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-36 items-center justify-center bg-slate-900 text-slate-400">No art</div>
                          )}
                          <div className="absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-black/80 text-sm font-semibold">
                            {card.totalPoints}
                          </div>
                        </div>
                        <div
                          className="flex flex-col gap-1 px-2 py-3"
                          style={{ backgroundColor: colors.header, minHeight: '80px' }}
                        >
                          <p
                            className="text-sm font-semibold leading-tight"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {card.name}
                          </p>
                          <p
                            className="text-[10px] text-slate-100"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {card.displayType ?? formatCardTypeLabel(card.type, card.race)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                }

                return (
                  <li
                    key={`${zone}-${card.id}-${card.name}`}
                    className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 transition hover:border-white/20"
                  >
                    <button
                      type="button"
                      className="flex h-28 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
                      onClick={handleSelect}
                    >
                      {card.image ? (
                        <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">No art</span>
                      )}
                    </button>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <button type="button" className="text-left" onClick={handleSelect}>
                          <p className="font-semibold text-base text-white">{card.name}</p>
                        </button>
                        <p className="text-xs text-slate-400">
                          {card.displayType ?? formatCardTypeLabel(card.type, card.race)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-300">
                          {card.id <= 0 && (
                            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-amber-200">
                              Missing ID · Click to replace
                            </span>
                          )}
                          {card.id > 0 &&
                            (card.notInList ? (
                              <span className="rounded-full border border-white/15 px-2 py-0.5">0 pts (not listed)</span>
                            ) : (
                              <span className="rounded-full border border-white/15 px-2 py-0.5">{card.pointsPerCopy} pts each</span>
                            ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-semibold text-white">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-base">
                          {card.totalPoints}
                        </div>
                        <span>×{card.count}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
