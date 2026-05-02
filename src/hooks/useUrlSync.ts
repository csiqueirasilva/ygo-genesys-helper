import { useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeDeckHash, encodeDeckHash } from '../lib/ydke';
import type { DeckInputSource } from './useActiveDeck';

export function useUrlSync(
  isResultsView: boolean,
  deck: any,
  deckInput: string,
  activeDeck: any,
  deckInputSourceRef: React.MutableRefObject<DeckInputSource>,
  setActiveDeck: (val: any) => void,
  setDeckInput: (val: string) => void
) {
  const [, setSearchParams] = useSearchParams();
  const location = window.location;
  const deckQueryParam = useMemo(() => {
    const search = location.hash.includes('?') ? location.hash.split('?')[1] : '';
    return new URLSearchParams(search).get('deck');
  }, [location.hash]);

  const shareToken = useMemo(() => {
    if (!deck) return '';
    try {
      return encodeDeckHash(deckInput.trim(), activeDeck?.name);
    } catch {
      return '';
    }
  }, [deck, deckInput, activeDeck?.name]);

  const expectedUrlDeckRef = useRef<string | null>(null);
  const prevShareTokenRef = useRef(shareToken);
  const prevIsResultsViewRef = useRef(isResultsView);

  useEffect(() => {
    const tokenChanged = shareToken !== prevShareTokenRef.current;
    const viewBecameResults = isResultsView && !prevIsResultsViewRef.current;
    
    prevShareTokenRef.current = shareToken;
    prevIsResultsViewRef.current = isResultsView;

    if (!isResultsView) {
      if (deckQueryParam) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('deck');
          return next;
        }, { replace: true });
      }
      return;
    }

    if (shareToken === deckQueryParam) {
      expectedUrlDeckRef.current = null;
      return;
    }

    if (shareToken === expectedUrlDeckRef.current) {
      return;
    }

    if (tokenChanged || viewBecameResults) {
      expectedUrlDeckRef.current = shareToken;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (shareToken) {
          next.set('deck', shareToken);
        } else {
          next.delete('deck');
        }
        return next;
      }, { replace: true });
    } else {
      if (deckQueryParam) {
        try {
          const decoded = decodeDeckHash(deckQueryParam);
          deckInputSourceRef.current = 'url';
          
          // Preserve existing folder and ID if we are already in results view
          setActiveDeck((prev: any) => {
            if (prev?.folderId && prev?.deckId) {
              return { ...prev, name: decoded.name || prev.name };
            }
            return decoded.name ? { name: decoded.name } : null;
          });
          
          setDeckInput(decoded.ydke);
        } catch (error) {
          console.warn('Unable to decode deck from query:', error);
        }
      }
    }
  }, [shareToken, deckQueryParam, isResultsView, setSearchParams]);

  const shareUrl = useMemo(() => {
    if (!shareToken) return '';
    return `${window.location.origin}${window.location.pathname}#/results?deck=${encodeURIComponent(shareToken)}`;
  }, [shareToken]);

  return { shareToken, shareUrl };
}
