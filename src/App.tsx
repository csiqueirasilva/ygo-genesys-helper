import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import genesysPayload from './data/genesys-card-list.json';
import { normalizeCardName } from './lib/strings.ts';
import { parseYdke, encodeDeckHash, decodeDeckHash } from './lib/ydke.ts';
import { fetchCardByName, fetchCardsByIds } from './lib/ygoprodeck.ts';
import type { CardDetails, DeckCardGroup, DeckGroups, DeckSection, GenesysCard, GenesysPayload } from './types.ts';
import { ImportScreen } from './components/ImportScreen.tsx';
import { SummaryPanel } from './components/SummaryPanel.tsx';
import { CardSections } from './components/CardSections.tsx';
import { Toaster, toast } from 'sonner';

const DEFAULT_POINT_CAP = 100;
const genesysData = genesysPayload as GenesysPayload;
type View = 'import' | 'results';

const buildCardDbUrl = (name: string) => {
  const params = new URLSearchParams({
    ope: '1',
    sess: '1',
    rp: '10',
    mode: '',
    sort: '1',
    keyword: name,
    stype: '1',
    ctype: '',
    othercon: '2',
    starfr: '',
    starto: '',
    pscalefr: '',
    pscaleto: '',
    linkmarkerfr: '',
    linkmarkerto: '',
    link_m: '2',
    atkfr: '',
    atkto: '',
    deffr: '',
    defto: '',
    releaseDStart: '1',
    releaseMStart: '1',
    releaseYStart: '1999',
    releaseDEnd: '',
    releaseMEnd: '',
    releaseYEnd: '',
    request_locale: 'en',
  });
  return `https://www.db.yugioh-card.com/yugiohdb/card_search.action?${params.toString()}`;
};

function App() {
  const [deckInput, setDeckInput] = useState('');
  const [pointCap, setPointCap] = useState(DEFAULT_POINT_CAP);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [cardDetails, setCardDetails] = useState<Record<number, CardDetails>>({});
  const [cardError, setCardError] = useState<string | null>(null);
  const [isFetchingCards, setIsFetchingCards] = useState(false);
  const [focusedCard, setFocusedCard] = useState<DeckCardGroup | null>(null);
  const [showPointList, setShowPointList] = useState(false);
  const [pointSearch, setPointSearch] = useState('');
  const [pointMin, setPointMin] = useState(1);
  const [pointMax, setPointMax] = useState(100);
  const [pointListLimit, setPointListLimit] = useState(40);
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [pointCardInfo, setPointCardInfo] = useState<Record<string, CardDetails>>({});
  const pointInfoLoading = useRef(new Set<string>());
  const pointListRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>('import');
  const modalDepthRef = useRef(0);
  const prevModalDepthRef = useRef(0);

  // Load deck info from hash on first paint & respond to manual hash changes.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const loadFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const compressedDeck = params.get('deck');

      if (compressedDeck) {
        try {
          const decoded = decodeDeckHash(decodeURIComponent(compressedDeck));
          setDeckInput(decoded);
          setView('results');
        } catch (error) {
          console.warn('Unable to decode deck from hash:', error);
        }
      }
    };

    loadFromHash();
    window.addEventListener('hashchange', loadFromHash);
    return () => window.removeEventListener('hashchange', loadFromHash);
  }, []);

  const genesysPointMap = useMemo(() => {
    const entries = genesysData.cards.map((card) => [normalizeCardName(card.name), card.points] as const);
    return new Map(entries);
  }, []);

  const { deck, deckError } = useMemo(() => {
    const sanitized = deckInput.trim();
    if (!sanitized) {
      return { deck: null, deckError: null };
    }

    try {
      return { deck: parseYdke(sanitized), deckError: null };
    } catch (error) {
      return {
        deck: null,
        deckError: error instanceof Error ? error.message : 'Invalid YDKE link.',
      };
    }
  }, [deckInput]);

  const uniqueCardIds = useMemo(() => {
    if (!deck) {
      return [];
    }
    return Array.from(new Set([...deck.main, ...deck.extra, ...deck.side].filter((id) => id > 0)));
  }, [deck]);

  useEffect(() => {
    if (!deck || uniqueCardIds.length === 0) {
      setCardDetails({});
      setCardError(null);
      setIsFetchingCards(false);
      setFocusedCard(null);
      return;
    }

    let cancelled = false;
    setIsFetchingCards(true);
    setCardError(null);

    (async () => {
      try {
        const fetched = await fetchCardsByIds(uniqueCardIds);
        if (!cancelled) {
          setCardDetails(fetched);
        }
      } catch (error) {
        if (!cancelled) {
          setCardError(error instanceof Error ? error.message : 'Unable to fetch card details.');
        }
      } finally {
        if (!cancelled) {
          setIsFetchingCards(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deck, uniqueCardIds]);

  const shareToken = useMemo(() => {
    if (!deck) {
      return '';
    }
    try {
      return encodeDeckHash(deckInput.trim());
    } catch {
      return '';
    }
  }, [deck, deckInput]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!shareToken) {
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const nextHash = `deck=${shareToken}`;
    if (window.location.hash.replace(/^#/, '') !== nextHash) {
      window.history.replaceState({}, '', `${window.location.pathname}#${nextHash}`);
    }
  }, [shareToken]);

  const shareUrl =
    typeof window !== 'undefined' && shareToken
      ? `${window.location.origin}${window.location.pathname}#deck=${shareToken}`
      : '';

  const activeCardDetails = focusedCard
    ? cardDetails[focusedCard.id] ?? pointCardInfo[focusedCard.name] ?? null
    : null;
  const cardDesc = focusedCard ? activeCardDetails?.desc ?? focusedCard.desc : null;
  const hasYgoProLink = Boolean(
    focusedCard && (activeCardDetails?.ygoprodeckUrl || focusedCard.linkUrl),
  );
  const cardLink = focusedCard
    ? hasYgoProLink
      ? (activeCardDetails?.ygoprodeckUrl ?? focusedCard.linkUrl)!
      : buildCardDbUrl(focusedCard.name)
    : null;
  const cardLinkLabel = focusedCard
    ? hasYgoProLink
      ? 'View in YGOProDeck ↗'
      : `No information found. Search ${focusedCard.name} in Yu-Gi-Oh! DB ↗`
    : null;

  const handleCardFocus = (card: DeckCardGroup) => {
    setFocusedCard(card);
  };

  const clampPoints = (value: number) => Math.min(Math.max(Math.round(value) || 1, 1), 100);

  const [pendingPointMin, setPendingPointMin] = useState(pointMin);
  const [pendingPointMax, setPendingPointMax] = useState(pointMax);

  const commitPointFilters = () => {
    const nextMin = clampPoints(pendingPointMin);
    const nextMax = clampPoints(pendingPointMax);
    const adjustedMin = Math.min(nextMin, nextMax);
    const adjustedMax = Math.max(nextMin, nextMax);
    setPointMin(adjustedMin);
    setPointMax(adjustedMax);
    setPendingPointMin(adjustedMin);
    setPendingPointMax(adjustedMax);
  };

  const handlePointCardClick = async (card: GenesysCard) => {
    let info = pointCardInfo[card.name];
    if (!info && !pointInfoLoading.current.has(card.name)) {
      pointInfoLoading.current.add(card.name);
      const fetched = await fetchCardByName(card.name);
      if (fetched) {
        info = fetched;
        setPointCardInfo((prev) => ({ ...prev, [card.name]: fetched }));
      }
      pointInfoLoading.current.delete(card.name);
    }

    const deckCard: DeckCardGroup = {
      id: info?.id ?? 0,
      name: card.name,
      count: 1,
      zone: 'main',
      image: info?.image,
      type: info?.type ?? info?.race,
      desc: info?.desc,
      linkUrl: info?.ygoprodeckUrl,
      pointsPerCopy: card.points,
      totalPoints: card.points,
      missingInfo: !info,
      notInList: false,
    };
    setFocusedCard(deckCard);
  };

  const filteredPointCards = useMemo(() => {
    const query = pointSearch.trim().toLowerCase();
    return genesysData.cards
      .filter((card) => card.points > 0)
      .filter((card) => card.points >= pointMin && card.points <= pointMax)
      .filter((card) => {
        if (!query) {
          return true;
        }
        if (card.name.toLowerCase().includes(query)) {
          return true;
        }
        const details = pointCardInfo[card.name];
        return details?.desc?.toLowerCase().includes(query) ?? false;
      })
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.name.localeCompare(b.name);
      });
  }, [pointSearch, pointCardInfo, pointMin, pointMax]);

  const visiblePointCards = useMemo(
    () => filteredPointCards.slice(0, pointListLimit),
    [filteredPointCards, pointListLimit],
  );

  const ensurePointCardInfo = useCallback(async (name: string) => {
    if (pointCardInfo[name] || pointInfoLoading.current.has(name)) {
      return;
    }
    pointInfoLoading.current.add(name);
    const details = await fetchCardByName(name);
    if (details) {
      setPointCardInfo((prev) => ({ ...prev, [name]: details }));
    }
    pointInfoLoading.current.delete(name);
  }, [pointCardInfo]);

  useEffect(() => {
    if (!showPointList) {
      return;
    }
    const preview = visiblePointCards;
    preview.forEach((card) => {
      void ensurePointCardInfo(card.name);
    });
  }, [showPointList, visiblePointCards, ensurePointCardInfo]);

  useEffect(() => {
    setPointListLimit(40);
  }, [pointSearch, showPointList, pointMin, pointMax]);

  const modalDepth = Number(showPointList) + Number(showBlockedList) + (focusedCard ? 1 : 0);

  const closeTopModal = useCallback(() => {
    if (focusedCard) {
      setFocusedCard(null);
      return true;
    }
    if (showBlockedList) {
      setShowBlockedList(false);
      return true;
    }
    if (showPointList) {
      setShowPointList(false);
      return true;
    }
    return false;
  }, [focusedCard, showBlockedList, showPointList]);

  const requestCloseTopModal = useCallback(() => {
    if (modalDepthRef.current > 0) {
      window.history.back();
    } else {
      closeTopModal();
    }
  }, [closeTopModal]);

  useEffect(() => {
    if (!focusedCard && !showBlockedList && !showPointList) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestCloseTopModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedCard, showBlockedList, showPointList, requestCloseTopModal]);

  useEffect(() => {
    if (!showPointList) {
      return;
    }

    const container = pointListRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 80;
      if (!nearBottom) {
        return;
      }
      setPointListLimit((limit) => {
        if (limit >= filteredPointCards.length) {
          return limit;
        }
        return Math.min(limit + 40, filteredPointCards.length);
      });
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [showPointList, filteredPointCards.length]);

  useEffect(() => {
    if (!showPointList) {
      return;
    }
    const container = pointListRef.current;
    if (!container) {
      return;
    }
    if (container.scrollHeight <= container.clientHeight + 5 && pointListLimit < filteredPointCards.length) {
      setPointListLimit((limit) => Math.min(limit + 40, filteredPointCards.length));
    }
  }, [showPointList, pointListLimit, filteredPointCards.length]);

  useEffect(() => {
    if (modalDepth > prevModalDepthRef.current) {
      window.history.pushState({ modal: 'overlay' }, '', window.location.href);
    }
    modalDepthRef.current = modalDepth;
    prevModalDepthRef.current = modalDepth;
  }, [modalDepth]);

  useEffect(() => {
    const handlePop = () => {
      closeTopModal();
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [closeTopModal]);

  const formatCardText = (text?: string) => {
    if (!text) {
      return 'No description available.';
    }
    return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const deckGroups = useMemo<DeckGroups | null>(() => {
    if (!deck) {
      return null;
    }

    const toGroup = (ids: number[], zone: DeckSection): DeckCardGroup[] => {
      const counts = new Map<number, number>();
      ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));

      return Array.from(counts.entries())
        .map(([id, count]) => {
          const info = cardDetails[id];
          const name = info?.name ?? `Card #${id}`;
          const normalized = normalizeCardName(name);
          const points = genesysPointMap.get(normalized);

          return {
            id,
            count,
            zone,
            name,
            image: info?.image,
            type: info?.type ?? info?.race,
            desc: info?.desc,
            linkUrl: info?.ygoprodeckUrl,
            pointsPerCopy: points ?? 0,
            totalPoints: (points ?? 0) * count,
            missingInfo: !info,
            notInList: !genesysPointMap.has(normalized),
          };
        })
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.name.localeCompare(b.name);
        });
    };

    return {
      main: toGroup(deck.main, 'main'),
      extra: toGroup(deck.extra, 'extra'),
      side: toGroup(deck.side, 'side'),
    };
  }, [deck, cardDetails, genesysPointMap]);

  const totalPoints = useMemo(() => {
    if (!deckGroups) {
      return 0;
    }

    return [...deckGroups.main, ...deckGroups.extra, ...deckGroups.side].reduce(
      (sum, card) => sum + card.totalPoints,
      0,
    );
  }, [deckGroups]);

  const cardsOverCap = pointCap > 0 && totalPoints > pointCap;
  const cardBreakdown = useMemo(
    () => ({
      main: deck?.main.length ?? 0,
      extra: deck?.extra.length ?? 0,
      side: deck?.side.length ?? 0,
    }),
    [deck],
  );

  const unknownCards = useMemo(() => {
    if (!deckGroups) {
      return 0;
    }

    const sumZone = (zone: DeckSection) =>
      deckGroups[zone].reduce((sum, card) => sum + (card.notInList ? card.count : 0), 0);

    return sumZone('main') + sumZone('extra') + sumZone('side');
  }, [deckGroups]);

  const blockedCards = useMemo(() => {
    if (!deckGroups) {
      return [];
    }

    const unique = new Map<string, DeckCardGroup>();
    (['main', 'extra', 'side'] as DeckSection[]).forEach((zone) => {
      deckGroups[zone].forEach((card) => {
        const details = cardDetails[card.id];
        const type = details?.type?.toLowerCase() ?? '';
        const isBlocked = type.includes('link') || type.includes('pendulum');
        if (!isBlocked) {
          return;
        }
        const existing = unique.get(card.name);
        if (existing) {
          existing.count += card.count;
        } else {
          unique.set(card.name, {
            ...card,
            type: details?.type,
          });
        }
      });
    });

    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [deckGroups, cardDetails]);

  const handleCopyShareLink = async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      toast.success('Deck link copied to clipboard');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (error) {
      console.warn('Clipboard unavailable', error);
      setShareStatus('error');
      toast.error('Clipboard unavailable. Copy manually.');
    }
  };

  const hasDeck = Boolean(deck);
  const pointsRemaining = pointCap - totalPoints;
  const handlePointCapChange = (value: number) => setPointCap(value);
  const handleBrowsePointList = () => {
    setFocusedCard(null);
    setPointSearch('');
    setShowPointList(true);
  };
  const handleShowBlockedList = () => setShowBlockedList(true);
  const handleBackToImport = () => setView('import');
  const handleViewResults = () => setView('results');

  return (
    <div className="min-h-screen bg-canvas text-slate-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-1 py-1 md:px-8">
        {view === 'import' ? (
          <ImportScreen
            genesysData={genesysData}
            deckInput={deckInput}
            deckError={deckError}
            hasDeck={hasDeck}
            onDeckInputChange={setDeckInput}
            onViewBreakdown={handleViewResults}
          />
        ) : (
          <div className="flex h-full flex-col gap-4">
            <div className="sticky top-2 z-30 md:top-4">
              <SummaryPanel
                pointCap={pointCap}
                totalPoints={totalPoints}
                cardBreakdown={cardBreakdown}
                cardsOverCap={cardsOverCap}
                pointsRemaining={pointsRemaining}
                shareUrl={shareUrl}
                shareStatus={shareStatus}
                unknownCards={unknownCards}
                blockedCount={blockedCards.length}
                cardError={cardError}
                isFetchingCards={isFetchingCards}
                onPointCapChange={handlePointCapChange}
                onCopyShareLink={handleCopyShareLink}
                onBrowsePointList={handleBrowsePointList}
                onShowBlocked={handleShowBlockedList}
                onBack={handleBackToImport}
              />
            </div>
            <section className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-panel/90 p-4 shadow-panel">
              <div className="flex-1 overflow-y-auto pr-2">
                <CardSections deckGroups={deckGroups} onCardSelect={handleCardFocus} />
              </div>
            </section>
          </div>
        )}
      </main>

      <Toaster position="bottom-center" toastOptions={{ className: 'font-semibold' }} richColors closeButton />

      {showPointList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={requestCloseTopModal}>
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col space-y-4 overflow-hidden rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Genesys</p>
                <h2 className="text-2xl font-semibold">Point list</h2>
                <p className="text-sm text-slate-400">
                  {genesysData.cards.filter((card) => card.points > 0).length} cards with point values
                </p>
              </div>
              <button className="text-2xl text-slate-300 hover:text-white" onClick={requestCloseTopModal} aria-label="Close point list">
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1 text-sm text-slate-200 space-y-1">
                <span>Text search</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search card name or text"
                    value={pointSearch}
                    onChange={(event) => setPointSearch(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && commitPointFilters()}
                    className="flex-1 rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                  {pointSearch && (
                    <button
                      type="button"
                      onClick={() => setPointSearch('')}
                      aria-label="Clear search"
                      className="rounded-full border border-white/20 px-3"
                    >
                      ×
                    </button>
                  )}
                </div>
              </label>
              <div className="flex flex-1 gap-3">
                <label className="flex flex-col text-xs text-slate-300">
                  <span>Min pts</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pendingPointMin}
                    onChange={(event) => setPendingPointMin(Number(event.target.value))}
                    onBlur={commitPointFilters}
                    onKeyDown={(event) => event.key === 'Enter' && commitPointFilters()}
                    className="mt-1 rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-300">
                  <span>Max pts</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pendingPointMax}
                    onChange={(event) => setPendingPointMax(Number(event.target.value))}
                    onBlur={commitPointFilters}
                    onKeyDown={(event) => event.key === 'Enter' && commitPointFilters()}
                    className="mt-1 rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
            <div ref={pointListRef} className="flex-1 overflow-y-auto pr-2">
              {filteredPointCards.length === 0 ? (
                <p className="text-sm text-slate-400">No cards found.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {visiblePointCards.map((card, index) => (
                    <li key={`${card.name}-${index}`}>
                      <button
                        type="button"
                        onClick={() => handlePointCardClick(card)}
                        className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-white/5"
                      >
                        <div className="h-16 w-10 overflow-hidden rounded-md border border-white/10 bg-black/30">
                          {pointCardInfo[card.name]?.image ? (
                            <img src={pointCardInfo[card.name]?.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No art</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{card.name}</p>
                        </div>
                        <strong className="text-sm text-slate-200">{card.points} pts</strong>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showBlockedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={requestCloseTopModal}>
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col space-y-4 overflow-hidden rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Genesys</p>
                <h2 className="text-2xl font-semibold">Not allowed</h2>
                <p className="text-sm text-slate-400">Cards below are not allowed in Genesys and were not added to the point list.</p>
              </div>
              <button className="text-2xl text-slate-300 hover:text-white" onClick={requestCloseTopModal} aria-label="Close blocked list">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              {blockedCards.length === 0 ? (
                <p className="text-sm text-slate-400">No blocked cards.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {blockedCards.map((card, index) => (
                    <li key={`blocked-${card.name}-${index}`}>
                      <button
                        type="button"
                        onClick={() => handleCardFocus(card)}
                        className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-white/5"
                      >
                        <div className="h-16 w-10 overflow-hidden rounded-md border border-white/10 bg-black/30">
                          {card.image ? (
                            <img src={card.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No art</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{card.name}</p>
                          <p className="text-xs text-slate-400">{card.type ?? 'Unknown'}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {focusedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={requestCloseTopModal}>
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col space-y-4 overflow-y-auto rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel touch-pan-y"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between text-2xl text-slate-300">
              <span />
              <button onClick={requestCloseTopModal} aria-label="Close card details">
                ×
              </button>
            </div>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="mx-auto w-52 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {activeCardDetails?.image || focusedCard.image ? (
                  <img src={activeCardDetails?.image ?? focusedCard.image} alt={focusedCard.name} className="w-full object-cover" />
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm text-slate-400">No art</div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
                  {focusedCard.zone === 'main' ? 'Main Deck' : focusedCard.zone === 'extra' ? 'Extra Deck' : 'Side Deck'}
                </p>
                <h2 className="text-2xl font-semibold">{focusedCard.name}</h2>
                <p className="text-sm text-slate-400">
                  {activeCardDetails?.type ?? focusedCard.type ?? 'Unknown'} · {activeCardDetails?.race ?? focusedCard.type ?? '—'}
                </p>
                <p className="text-sm text-slate-200 leading-relaxed">{formatCardText(cardDesc ?? undefined)}</p>
                {cardLink && cardLinkLabel && (
                  <a className="text-sm font-semibold text-cyan-300 hover:underline" href={cardLink} target="_blank" rel="noreferrer">
                    {cardLinkLabel}
                  </a>
                )}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                    <p className="text-xs text-slate-400">Copies</p>
                    <p className="text-lg font-semibold text-white">×{focusedCard.count}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                    <p className="text-xs text-slate-400">Points/copy</p>
                    <p className="text-lg font-semibold text-white">{focusedCard.pointsPerCopy}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                    <p className="text-xs text-slate-400">Total pts</p>
                    <p className="text-lg font-semibold text-white">{focusedCard.totalPoints}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
