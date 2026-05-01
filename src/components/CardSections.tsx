import { useMemo, useState } from 'react';
import type { DeckCardGroup, DeckGroups, DeckSection, MetaData, Format } from '../types';
import { formatCardTypeLabel } from '../lib/strings';
import metaDataPayload from '../data/meta-data.json';

const metaData = metaDataPayload as MetaData;

interface CardSectionsProps {
  deckGroups: DeckGroups | null;
  format: Format;
  onCardSelect: (card: DeckCardGroup) => void;
  onMetaClick: (cardId: number) => void;
  onUpdateCardCount: (zone: DeckSection, cardId: number, delta: number) => void;
  onRemoveCard: (zone: DeckSection, cardId: number) => void;
  onAddCard: (zone: DeckSection, card: any) => void;
  onMissingCardSelect?: (card: DeckCardGroup) => void;
  sortMode: Record<DeckSection, 'points' | 'default'>;
  onSortModeChange: (zone: DeckSection, mode: 'points' | 'default') => void;
  blockedCardIds: Set<number>;
}

const sections: DeckSection[] = ['main', 'extra', 'side'];

export function CardSections({
  deckGroups,
  format,
  onCardSelect,
  onMetaClick,
  onUpdateCardCount,
  onRemoveCard,
  onAddCard,
  onMissingCardSelect,
  sortMode,
  onSortModeChange,
  blockedCardIds,
}: CardSectionsProps) {
  if (!deckGroups) {
    return <p className="text-sm text-slate-400">Paste a deck to unlock card insights.</p>;
  }

  const [gridView, setGridView] = useState<Record<DeckSection, boolean>>({
    main: true,
    extra: true,
    side: true,
  });
  const [editMode, setEditMode] = useState<Record<DeckSection, boolean>>({
    main: false,
    extra: false,
    side: false,
  });

  const toggleGridView = (zone: DeckSection) => {
    setGridView((prev) => ({ ...prev, [zone]: !prev[zone] }));
  };

  const toggleEditMode = (zone: DeckSection) => {
    setEditMode((prev) => ({ ...prev, [zone]: !prev[zone] }));
  };

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
                onClick={() => toggleEditMode(zone)}
                className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] transition ${
                  editMode[zone]
                    ? 'border-amber-400 bg-amber-400/20 text-amber-100'
                    : 'border-white/10 bg-black/20 text-slate-400 hover:text-slate-200'
                }`}
              >
                {editMode[zone] ? 'Editing' : 'Edit'}
              </button>
              {editMode[zone] && (
                <button
                  type="button"
                  onClick={() => onAddCard(zone, null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-slate-900 shadow-lg transition hover:bg-cyan-400 active:scale-95 font-bold text-lg"
                  title="Add card"
                >
                  +
                </button>
              )}
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] transition ${
                  gridView[zone]
                    ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                    : 'border-white/15 bg-black/20 text-slate-300 hover:border-white/30'
                }`}
                onClick={() => toggleGridView(zone)}
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
              { deckGroups[zone].length === 0 ? (
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

                const banStatus = metaData.advanced.banlist[card.id.toString()];
                const isForbidden = (format === 'genesys' && card.id > 0 && blockedCardIds.has(card.id)) || 
                                  (format === 'advanced' && banStatus === 'Forbidden');
                
                const limitCount = format === 'advanced' 
                  ? (banStatus === 'Limited' ? 1 : banStatus === 'Semi-Limited' ? 2 : 3)
                  : 3;
                
                const isOverLimit = format === 'advanced' && card.count > limitCount;

                const cardMeta = metaData.popularCards[card.id.toString()];
                const isRelevantMeta = cardMeta && (
                  cardMeta.staple || 
                  (format === 'genesys' && cardMeta.metaContext?.genesys) ||
                  (format === 'advanced' && cardMeta.metaContext?.advanced)
                );

                if (gridView[zone]) {
                  const colors = getFrameColors(card);
                  return (
                    <li
                      key={`${zone}-${card.id}-${card.name}-grid-${index}`}
                      className={`relative overflow-hidden rounded-xl border text-xs text-white transition ${
                        isForbidden || isOverLimit ? 'border-rose-500/50 bg-rose-500/10' : 'border-white/15 bg-black/30'
                      }`}
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
                          <div
                            className={`absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold shadow-lg backdrop-blur-sm ${
                              isForbidden || isOverLimit 
                                ? 'border-rose-400 bg-rose-600 text-white' 
                                : format === 'advanced' && banStatus
                                  ? 'border-amber-400/50 bg-amber-600/90 text-white'
                                  : format === 'advanced' 
                                    ? 'border-white/20 bg-black/60 text-slate-400 opacity-0 group-hover:opacity-100'
                                    : 'border-white/50 bg-black/80'
                            }`}
                          >
                            {isForbidden ? '✕' : isOverLimit ? `!${limitCount}` : format === 'advanced' && banStatus ? (banStatus === 'Limited' ? '1' : '2') : format === 'genesys' ? card.totalPoints : ''}
                          </div>
                          {editMode[zone] && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemoveCard(zone, card.id); }}
                              className="absolute left-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl hover:bg-rose-500 active:scale-90 font-bold border-2 border-white/20"
                              title="Remove card"
                            >
                              ✕
                            </button>
                          )}
                          {isRelevantMeta && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMetaClick(card.id);
                              }}
                              className="absolute right-2 top-2 rounded-md bg-cyan-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-cyan-400"
                            >
                              META
                            </button>
                          )}
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
                          {card.id > 0 && format === 'genesys' &&
                            (card.notInList ? (
                              <span className="rounded-full border border-white/15 px-2 py-0.5">0 pts (not listed)</span>
                            ) : (
                              <span className="rounded-full border border-white/15 px-2 py-0.5">{card.pointsPerCopy} pts each</span>
                            ))}
                          {format === 'advanced' && banStatus && (
                            <span className={`rounded-full px-2 py-0.5 font-bold ${
                              banStatus === 'Forbidden' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {banStatus}
                            </span>
                          )}
                          {isOverLimit && (
                             <span className="rounded-full bg-rose-600 px-2 py-0.5 text-white font-bold animate-pulse">
                              OVER LIMIT ({limitCount})
                            </span>
                          )}
                          {isRelevantMeta && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMetaClick(card.id);
                              }}
                              className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-cyan-300 font-medium hover:bg-cyan-500/30"
                            >
                              Meta Staple/Trend
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-semibold text-white">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border text-base ${
                            isForbidden || isOverLimit ? 'border-rose-200 bg-rose-600/90 text-white' : format === 'advanced' && banStatus ? 'border-amber-400/50 bg-amber-600/90 text-white' : 'border-white/30 bg-black/40'
                          }`}
                        >
                          {isForbidden ? '✕' : isOverLimit ? `!${limitCount}` : format === 'advanced' && banStatus ? (banStatus === 'Limited' ? '1' : '2') : format === 'genesys' ? card.totalPoints : ''}
                        </div>
                        <span className={isOverLimit ? 'text-rose-400 font-black' : ''}>×{card.count}</span>
                        <div className="flex gap-1 ml-auto">
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdateCardCount(zone, card.id, -1); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
                          >
                            -
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdateCardCount(zone, card.id, 1); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
                          >
                            +
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveCard(zone, card.id); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/20 ml-1"
                            title="Remove from deck"
                          >
                            ×
                          </button>
                        </div>
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
