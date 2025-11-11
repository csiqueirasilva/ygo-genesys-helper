import type { DeckCardGroup, DeckGroups, DeckSection } from '../types';

interface CardSectionsProps {
  deckGroups: DeckGroups | null;
  onCardSelect: (card: DeckCardGroup) => void;
}

const sections: DeckSection[] = ['main', 'extra', 'side'];

export function CardSections({ deckGroups, onCardSelect }: CardSectionsProps) {
  if (!deckGroups) {
    return <p className="text-sm text-slate-400">Paste a deck to unlock card insights.</p>;
  }

  const formatZoneTitle = (zone: DeckSection) => {
    const label = zone === 'main' ? 'Main Deck' : zone === 'extra' ? 'Extra Deck' : 'Side Deck';
    const cardCount = deckGroups[zone].reduce((sum, card) => sum + card.count, 0);
    return `${label} · ${cardCount} cards`;
  };

  return (
    <div className="space-y-8">
      {sections.map((zone) => (
        <div key={zone} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">{formatZoneTitle(zone)}</h3>
            <span className="text-sm text-slate-400">
              {deckGroups[zone].reduce((sum, card) => sum + card.totalPoints, 0)} pts ·{' '}
              {deckGroups[zone].reduce((sum, card) => sum + (card.notInList ? card.count : 0), 0)} off-list
            </span>
          </div>
          {deckGroups[zone].length === 0 ? (
            <p className="text-sm text-slate-500">No cards in this section.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {deckGroups[zone].map((card) => (
                <li
                  key={`${zone}-${card.id}`}
                  className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 transition hover:border-white/20"
                >
                  <button
                    type="button"
                    className="flex h-28 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    onClick={() => onCardSelect(card)}
                  >
                    {card.image ? (
                      <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">No art</span>
                    )}
                  </button>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <button type="button" className="text-left" onClick={() => onCardSelect(card)}>
                        <p className="font-semibold text-base text-white">{card.name}</p>
                      </button>
                      <p className="text-xs text-slate-400">{card.type ?? '—'}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-300">
                        {card.notInList ? (
                          <span className="rounded-full border border-white/15 px-2 py-0.5">0 pts (not listed)</span>
                        ) : (
                          <span className="rounded-full border border-white/15 px-2 py-0.5">{card.pointsPerCopy} pts each</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-white">Total {card.totalPoints} pts · ×{card.count}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
