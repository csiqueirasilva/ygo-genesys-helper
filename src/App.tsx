import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import genesysPayload from './data/genesys-card-list.json';
import { formatTimestamp, normalizeCardName } from './lib/strings.ts';
import { parseYdke, encodeDeckHash, decodeDeckHash, getDeckSize } from './lib/ydke.ts';
import { fetchCardByName, fetchCardsByIds } from './lib/ygoprodeck.ts';
import type { CardDetails, DeckCardGroup, DeckGroups, DeckSection, GenesysCard, GenesysPayload } from './types.ts';
import './App.css';

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
  const cardDesc = focusedCard ? (activeCardDetails?.desc ?? focusedCard.desc) : null;
  const cardLink = focusedCard
    ? activeCardDetails?.ygoprodeckUrl ?? focusedCard.linkUrl ?? buildCardDbUrl(focusedCard.name)
    : null;

  useEffect(() => {
    if (!focusedCard && !showBlockedList && !showPointList) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (focusedCard) {
        setFocusedCard(null);
        return;
      }
      if (showBlockedList) {
        setShowBlockedList(false);
        return;
      }
      if (showPointList) {
        setShowPointList(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedCard, showBlockedList, showPointList]);

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
  const totalCards = getDeckSize(deck ?? undefined);

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
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (error) {
      console.warn('Clipboard unavailable', error);
      setShareStatus('error');
    }
  };

  const formatZoneTitle = (zone: DeckSection) => {
    const label = zone === 'main' ? 'Main Deck' : zone === 'extra' ? 'Extra Deck' : 'Side Deck';
    const cardCount =
      deckGroups?.[zone].reduce((sum, card) => sum + card.count, 0) ?? 0;
    return `${label} · ${cardCount} cards`;
  };

  const renderImportScreen = () => (
    <div className="screen import-screen">
      <header className="hero compact">
        <div>
          <p className="eyebrow">Yu-Gi-Oh! Genesys</p>
          <h1>Genesys helper</h1>
          <p className="subtitle">
            Paste your YDKE link, get instant point totals, see which cards consume the most points,
            and share your build with a single link.
          </p>
          <div className="hero-links">
            <a href="https://www.yugioh-card.com/en/genesys/" target="_blank" rel="noreferrer">
              Official Genesys list
            </a>
          </div>
        </div>
        <div className="list-meta">
          <p>Genesys list last updated</p>
          <strong>{formatTimestamp(genesysData.lastUpdated)}</strong>
          <span>{genesysData.cards.length} tracked cards</span>
        </div>
      </header>

      <section className="panel input-panel compact">
        <div className="panel-header">
          <h2>1. Paste your YDKE deck</h2>
          <span>Example: ydke://AAA..!BBB..!CCC!</span>
        </div>
        <textarea
          spellCheck={false}
          placeholder="ydke://..."
          value={deckInput}
          onChange={(event) => setDeckInput(event.target.value)}
        />
        {deckError && <p className="feedback error">{deckError}</p>}
        {!deckError && !deck && (
          <p className="feedback muted">Your point breakdown will appear as soon as we detect a valid YDKE link.</p>
        )}

        <div className="import-actions">
          <button className="primary" disabled={!deck || Boolean(deckError)} onClick={() => setView('results')}>
            View point breakdown
          </button>
          <small>Requires a valid YDKE link.</small>
        </div>
      </section>
    </div>
  );

  const renderResultsScreen = () => (
    <div className="screen results-screen">
      <section className="panel summary-panel compact">
        <div className="results-header">
          <button className="ghost" onClick={() => setView('import')}>
            ← Back to import deck
          </button>
          <div className="inline-controls">
            <div className="inline-controls-row">
              <label className="control skinny">
                <span>Point cap</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={pointCap}
                  onChange={(event) => setPointCap(Number(event.target.value) || 0)}
                />
              </label>
              <label className="control share">
                <span>Shareable link</span>
                <div className="share-control slim">
                  <input type="text" value={shareUrl} readOnly placeholder="Available after a valid deck" />
                  <button disabled={!shareUrl} onClick={handleCopyShareLink}>
                    {shareStatus === 'copied' ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
                {shareStatus === 'error' && (
                  <small className="feedback error">Clipboard is unavailable. Copy the link manually.</small>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="summary-grid compact">
          <div className="summary-card">
            <span>Total points</span>
            <strong className={cardsOverCap ? 'warn' : ''}>{totalPoints}</strong>
          </div>
          <div className="summary-card">
            <span>Total cards</span>
            <strong>{totalCards}</strong>
          </div>
        </div>
        <div className="point-list-cta">
          <button
            className="ghost"
            type="button"
            onClick={() => {
              setFocusedCard(null);
              setPointSearch('');
              setShowPointList(true);
            }}
          >
            Browse full Genesys point list
          </button>
        </div>
        {pointCap > 0 && (
          <p className={`feedback ${cardsOverCap ? 'error' : 'success'}`}>
            {cardsOverCap
              ? `You are ${totalPoints - pointCap} points over your cap.`
              : `You have ${pointCap - totalPoints} points remaining.`}
          </p>
        )}
        {unknownCards > 0 && (
          <p className="feedback warning">
            {unknownCards} card{unknownCards > 1 ? 's are' : ' is'} not on the current Genesys list, so they cost 0
            points by default.
          </p>
        )}
        {blockedCards.length > 0 && (
          <p className="feedback error clickable" onClick={() => setShowBlockedList(true)}>
            {blockedCards.length} card{blockedCards.length > 1 ? 's are' : ' is'} not allowed in Genesys (Link/Pendulum). View
            details.
          </p>
        )}
        {cardError && <p className="feedback error">{cardError}</p>}
        {isFetchingCards && <p className="feedback muted">Loading card details…</p>}
      </section>

      <section className="panel cards-panel scrollable">
        <div className="card-scroll">
          {deckGroups ? (
            (['main', 'extra', 'side'] as DeckSection[]).map((zone) => (
              <div key={zone} className="card-section">
                <div className="section-header">
                  <h3>{formatZoneTitle(zone)}</h3>
                  <span>
                    {deckGroups[zone].reduce((sum, card) => sum + card.totalPoints, 0)} pts ·{' '}
                    {deckGroups[zone].reduce((sum, card) => sum + (card.notInList ? card.count : 0), 0)} off-list
                  </span>
                </div>
                {deckGroups[zone].length === 0 ? (
                  <p className="feedback muted">No cards in this section.</p>
                ) : (
                  <ul className="card-grid">
                    {deckGroups[zone].map((card) => (
                      <li key={`${zone}-${card.id}`} className="card">
                        <button type="button" className="card-image" onClick={() => handleCardFocus(card)}>
                          {card.image ? (
                            <img src={card.image} alt={card.name} loading="lazy" />
                          ) : (
                            <div className="card-placeholder">No art</div>
                          )}
                        </button>
                        <div className="card-body">
                          <div className="card-title">
                            <button type="button" className="card-name" onClick={() => handleCardFocus(card)}>
                              <strong>{card.name}</strong>
                            </button>
                            <span>×{card.count}</span>
                          </div>
                          <div className="card-meta">
                            <span>{card.type ?? '—'}</span>
                            {card.notInList ? (
                              <span className="tag neutral">0 pts (not listed)</span>
                            ) : (
                              <span className="tag">{card.pointsPerCopy} pts each</span>
                            )}
                          </div>
                          <div className="card-points">
                            <span>Total</span>
                            <strong>{card.totalPoints} pts</strong>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          ) : (
            <div className="empty-list">
              <p>Paste a deck to unlock card-by-card insights, images, and point totals.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <div className="app">
      {view === 'import' ? renderImportScreen() : renderResultsScreen()}
      {showPointList && (
        <div className="modal-overlay" onClick={() => setShowPointList(false)}>
          <div
            className="modal-card list-modal"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button className="modal-close" onClick={() => setShowPointList(false)} aria-label="Close point list">
              ×
            </button>
            <div className="list-modal-header">
              <div>
                <p className="eyebrow">Genesys</p>
                <h2>Point list</h2>
                <p className="modal-meta">{genesysData.cards.filter((card) => card.points > 0).length} cards with point values</p>
              </div>
                <div className="point-list-controls">
                  <div className="point-list-search">
                    <label>
                      <span>Text search</span>
                      <input
                        type="text"
                        placeholder="Search card name or text"
                        value={pointSearch}
                        onChange={(event) => setPointSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            commitPointFilters();
                          }
                        }}
                      />
                    </label>
                    {pointSearch && (
                      <button type="button" onClick={() => setPointSearch('')} aria-label="Clear search">
                        ×
                      </button>
                  )}
                </div>
                <div className="point-range-controls">
                  <label>
                    <span>Min pts</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={pendingPointMin}
                      onChange={(event) => {
                        setPendingPointMin(Number(event.target.value));
                      }}
                      onBlur={commitPointFilters}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitPointFilters();
                        }
                      }}
                    />
                  </label>
                  <label>
                    <span>Max pts</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={pendingPointMax}
                      onChange={(event) => {
                        setPendingPointMax(Number(event.target.value));
                      }}
                      onBlur={commitPointFilters}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitPointFilters();
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="point-list" ref={pointListRef}>
              {filteredPointCards.length === 0 ? (
                <p className="feedback muted">No cards found.</p>
              ) : (
                <ul>
                  {visiblePointCards.map((card, index) => (
                    <li key={`${card.name}-${index}`}>
                      <button type="button" onClick={() => handlePointCardClick(card)}>
                        <div className="point-card-thumb">
                          {pointCardInfo[card.name]?.image ? (
                            <img src={pointCardInfo[card.name]?.image} alt="" />
                          ) : (
                            <div className="card-placeholder small">No art</div>
                          )}
                        </div>
                        <div className="point-card-meta">
                          <span>{card.name}</span>
                          <strong>{card.points} pts</strong>
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
      {showBlockedList && (
        <div className="modal-overlay" onClick={() => setShowBlockedList(false)}>
          <div
            className="modal-card list-modal"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button className="modal-close" onClick={() => setShowBlockedList(false)} aria-label="Close blocked list">
              ×
            </button>
            <div className="list-modal-header">
              <div>
                <p className="eyebrow">Genesys</p>
                <h2>Not allowed</h2>
                <p className="modal-meta">Cards below are not allowed in Genesys and were not added to the point list.</p>
              </div>
            </div>
            <div className="point-list">
              {blockedCards.length === 0 ? (
                <p className="feedback muted">No blocked cards.</p>
              ) : (
                <ul>
                  {blockedCards.map((card, index) => (
                    <li key={`blocked-${card.name}-${index}`}>
                      <button type="button" onClick={() => handleCardFocus(card)}>
                        <div className="point-card-thumb">
                          {card.image ? (
                            <img src={card.image} alt="" />
                          ) : (
                            <div className="card-placeholder small">No art</div>
                          )}
                        </div>
                        <div className="point-card-meta">
                          <span>{card.name}</span>
                          <strong>{card.type ?? 'Unknown'}</strong>
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
        <div className="modal-overlay" onClick={() => setFocusedCard(null)}>
          <div
            className="modal-card"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button className="modal-close" onClick={() => setFocusedCard(null)} aria-label="Close card details">
              ×
            </button>
            <div className="modal-content">
              <div className="modal-image">
                {activeCardDetails?.image || focusedCard.image ? (
                  <img src={activeCardDetails?.image ?? focusedCard.image} alt={focusedCard.name} />
                ) : (
                  <div className="card-placeholder">No art</div>
                )}
              </div>
              <div className="modal-info">
                <p className="eyebrow">{focusedCard.zone === 'main' ? 'Main Deck' : focusedCard.zone === 'extra' ? 'Extra Deck' : 'Side Deck'}</p>
                <h2>{focusedCard.name}</h2>
                <p className="modal-meta">
                  {activeCardDetails?.type ?? focusedCard.type ?? 'Unknown'} ·{' '}
                  {activeCardDetails?.race ?? focusedCard.type ?? '—'}
                </p>
                <p className="modal-desc">{formatCardText(cardDesc ?? undefined)}</p>
                {cardLink && (
                  <a
                    className="modal-db-link"
                    href={cardLink ?? buildCardDbUrl(focusedCard.name)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View in YGOProDeck ↗
                  </a>
                )}
                <div className="modal-stats">
                  <div>
                    <span>Copies</span>
                    <strong>×{focusedCard.count}</strong>
                  </div>
                  <div>
                    <span>Points per copy</span>
                    <strong>{focusedCard.pointsPerCopy}</strong>
                  </div>
                  <div>
                    <span>Total points</span>
                    <strong>{focusedCard.totalPoints}</strong>
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
