import { useState, useEffect } from 'react';
import { fetchCardsByIds } from '../lib/ygoprodeck';
import type { CardDetails } from '../types';

export function useCardDetails(uniqueCardIds: number[]) {
  const [cardDetails, setCardDetails] = useState<Record<number, CardDetails>>({});
  const [isFetchingCards, setIsFetchingCards] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  useEffect(() => {
    if (uniqueCardIds.length === 0) {
      setCardDetails({});
      setIsFetchingCards(false);
      return;
    }

    let cancelled = false;
    setIsFetchingCards(true);
    setCardError(null);

    (async () => {
      try {
        const fetched = await fetchCardsByIds(uniqueCardIds);
        if (!cancelled) setCardDetails(fetched);
      } catch (error) {
        if (!cancelled) setCardError(error instanceof Error ? error.message : 'Unable to fetch card details.');
      } finally {
        if (!cancelled) setIsFetchingCards(false);
      }
    })();

    return () => { cancelled = true; };
  }, [uniqueCardIds]);

  return { cardDetails, isFetchingCards, cardError };
}
