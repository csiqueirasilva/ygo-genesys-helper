import { useMemo } from 'react';
import type { DeckGroups, DeckSection, DeckCardGroup, CardDetails } from '../types';
import { normalizeCardName, formatCardTypeLabel } from '../lib/strings';

export function useDeckStats(
  deck: { main: number[]; extra: number[]; side: number[] } | null,
  cardDetails: Record<number, CardDetails>,
  genesysPointMap: Map<string, number>
) {
  const deckGroups = useMemo<DeckGroups | null>(() => {
    if (!deck) return null;

    const sections: DeckSection[] = ['main', 'extra', 'side'];
    const groups: DeckGroups = { main: [], extra: [], side: [] };

    sections.forEach((zone) => {
      const counts = new Map<number, number>();
      deck[zone].forEach((id) => {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });

      const list: DeckCardGroup[] = [];
      counts.forEach((count, id) => {
        const details = cardDetails[id];
        const name = details?.name ?? `Card #${id}`;
        const points = genesysPointMap.get(normalizeCardName(name)) ?? 0;

        list.push({
          id,
          name,
          count,
          zone,
          type: details?.type,
          race: details?.race,
          displayType: formatCardTypeLabel(details?.type, details?.race),
          desc: details?.desc,
          level: details?.level,
          linkValue: details?.linkValue,
          image: details?.imageCropped,
          fullImage: details?.image,
          pointsPerCopy: points,
          totalPoints: points * count,
          missingInfo: !details,
          notInList: points === 0 && !details,
        });
      });

      // Simple sort: Points desc, then Name
      list.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
      groups[zone] = list;
    });

    return groups;
  }, [deck, cardDetails, genesysPointMap]);

  const totalPoints = useMemo(() => {
    if (!deckGroups) return 0;
    return (
      deckGroups.main.reduce((sum, c) => sum + c.totalPoints, 0) +
      deckGroups.extra.reduce((sum, c) => sum + c.totalPoints, 0) +
      deckGroups.side.reduce((sum, c) => sum + c.totalPoints, 0)
    );
  }, [deckGroups]);

  return { deckGroups, totalPoints };
}
