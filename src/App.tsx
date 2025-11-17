import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import genesysPayload from './data/genesys-card-list.json';
import { normalizeCardName, formatCardTypeLabel } from './lib/strings.ts';
import { parseYdke, encodeDeckHash, decodeDeckHash, parseYdk, buildYdke, type ParsedDeck } from './lib/ydke.ts';
import { fetchCardByName, fetchCardsByIds, fetchCardsByKonamiIds } from './lib/ygoprodeck.ts';
import type {
  AssistantDeckContext,
  CardDetails,
  DeckCardGroup,
  DeckGroups,
  DeckSection,
  GenesysCard,
  GenesysPayload,
  SavedDeckEntry,
  SavedDeckFolder,
} from './types.ts';
import { ImportScreen } from './components/ImportScreen.tsx';
import { SummaryPanel } from './components/SummaryPanel.tsx';
import { CardSections } from './components/CardSections.tsx';
import { ChatKitPanel } from './components/ChatKitPanel.tsx';
import { MissingIdResolver } from './components/MissingIdResolver.tsx';
import type { MissingReplacementPick } from './components/MissingIdResolver.tsx';
import { SavedDeckModal } from './components/SavedDeckModal.tsx';
import { Toaster, toast } from 'sonner';

const DEFAULT_POINT_CAP = 100;
const genesysData = genesysPayload as GenesysPayload;
const SAVED_DECKS_STORAGE_KEY = 'ygo-genesys-saved-decks-v1';
const DEFAULT_FOLDER_ID = 'folder-default';
const DEFAULT_FOLDER_NAME = 'Unsorted';

const generateFolderId = () => `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createFolder = (name: string, id?: string, decks: SavedDeckEntry[] = []): SavedDeckFolder => ({
  id: id ?? generateFolderId(),
  name,
  decks,
});
const ensureFolders = (folders: SavedDeckFolder[]) =>
  folders.length > 0 ? folders : [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID)];

const normalizeDeckEntry = (raw: any): SavedDeckEntry | null => {
  const deck = typeof raw?.deck === 'string' ? raw.deck.trim() : '';
  if (!deck) {
    return null;
  }
  const id =
    typeof raw?.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const name =
    typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Untitled deck';
  const savedAt =
    typeof raw?.savedAt === 'string' && raw.savedAt.trim()
      ? raw.savedAt
      : new Date().toISOString();
  const summary =
    raw?.summary && typeof raw.summary === 'object'
      ? {
          main: Number(raw.summary.main) || 0,
          extra: Number(raw.summary.extra) || 0,
          side: Number(raw.summary.side) || 0,
          points:
            raw.summary.points === null || raw.summary.points === undefined
              ? undefined
              : Number.isFinite(Number(raw.summary.points))
                ? Number(raw.summary.points)
                : undefined,
        }
      : undefined;
  return { id, name, deck, savedAt, summary };
};

const normalizeFolders = (raw: any, ensureDefault = true): SavedDeckFolder[] => {
  let folders: SavedDeckFolder[] = [];
  if (Array.isArray(raw?.folders)) {
    folders = raw.folders
      .map((folder: any): SavedDeckFolder | null => {
        const decks = Array.isArray(folder?.decks)
          ? folder.decks.map((entry: any) => normalizeDeckEntry(entry)).filter(Boolean)
          : [];
        const name =
          typeof folder?.name === 'string' && folder.name.trim()
            ? folder.name.trim()
            : DEFAULT_FOLDER_NAME;
        const id =
          typeof folder?.id === 'string' && folder.id.trim()
            ? folder.id.trim()
            : generateFolderId();
        return createFolder(name, id, decks as SavedDeckEntry[]);
      })
      .filter(Boolean) as SavedDeckFolder[];
  } else if (Array.isArray(raw?.decks)) {
    const decks = raw.decks
      .map((entry: any) => normalizeDeckEntry(entry))
      .filter(Boolean) as SavedDeckEntry[];
    folders = [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID, decks)];
  } else if (Array.isArray(raw)) {
    const decks = raw
      .map((entry: any) => normalizeDeckEntry(entry))
      .filter(Boolean) as SavedDeckEntry[];
    folders = [createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID, decks)];
  }

  return ensureDefault ? ensureFolders(folders) : folders;
};

const persistFolders = (folders: SavedDeckFolder[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  const payload = { version: 2, folders };
  window.localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(payload));
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash.toString(36);
};

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

const simplifyCardName = (name: string) =>
  name
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export default function App() {
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
  const modalDepthRef = useRef(0);
  const prevModalDepthRef = useRef(0);
  const deckInputSourceRef = useRef<'manual' | 'file' | 'json' | 'saved' | 'url' | 'system'>('system');
  const [shouldAutoSaveDeck, setShouldAutoSaveDeck] = useState(false);
  const lastSavedDeckRef = useRef('');
  const [showChatAssistant, setShowChatAssistant] = useState(false);
  const [showUndetectedCardsWarning, setShowUndetectedCardsWarning] = useState(false);
  const [missingCardContext, setMissingCardContext] = useState<{ zone: DeckSection; cardName: string } | null>(null);
  const [cardSortMode, setCardSortMode] = useState<Record<DeckSection, 'points' | 'default'>>({
    main: 'points',
    extra: 'points',
    side: 'points',
  });
  const [savedFolders, setSavedFolders] = useState<SavedDeckFolder[]>(() => ensureFolders([]));
  const [showSavedDeckModal, setShowSavedDeckModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const isResultsView = location.pathname === '/results';
  const deckQueryParam = useMemo(() => {
    if (!location.search) {
      return null;
    }
    return new URLSearchParams(location.search).get('deck');
  }, [location.search]);


  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const hash = window.location.hash;
    if (hash && !hash.startsWith('#/')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const legacyDeck = params.get('deck');
      if (legacyDeck) {
        window.location.hash = `#/results?deck=${legacyDeck}`;
      }
    }
  }, []);

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/results') {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  const genesysPointMap = useMemo(() => {
    const entries = genesysData.cards.map((card) => [normalizeCardName(card.name), card.points] as const);
    return new Map(entries);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(SAVED_DECKS_STORAGE_KEY);
      if (!stored) {
        setSavedFolders(ensureFolders([]));
        return;
      }
      const parsed = JSON.parse(stored);
      setSavedFolders(normalizeFolders(parsed));
    } catch (error) {
      console.warn('Failed to load saved decks from storage', error);
      setSavedFolders(ensureFolders([]));
    }
  }, []);

  const { deck, deckError } = useMemo(() => {
    const sanitized = deckInput.trim();
    if (!sanitized) {
      return { deck: null, deckError: null };
    }

    try {
      const parsed = parseYdke(sanitized);
      // console.debug('Raw YDKE input:', sanitized);
      // console.debug('Parsed deck data:', {
      //   main: parsed.main,
      //   extra: parsed.extra,
      //   side: parsed.side,
      // });
      return { deck: parsed, deckError: null };
    } catch (error) {
      return {
        deck: null,
        deckError: error instanceof Error ? error.message : 'Invalid YDKE link.',
      };
    }
  }, [deckInput]);

  useEffect(() => {
    if (!deck) {
      return;
    }
    // console.debug('Decoded YDKE deck:', {
    //   main: deck.main,
    //   extra: deck.extra,
    //   side: deck.side,
    // });
  }, [deck]);

  const altArtCount = useMemo(() => {
    if (!deck) {
      return 0;
    }
    const zeroCount = [...deck.main, ...deck.extra, ...deck.side].filter((id) => id === 0).length;
    return zeroCount;
  }, [deck]);

  const uniqueCardIds = useMemo(() => {
    if (!deck) {
      return [];
    }
    return Array.from(new Set([...deck.main, ...deck.extra, ...deck.side].filter((id) => id > 0)));
  }, [deck]);

  const missingSlots = useMemo<Record<DeckSection, number[]>>(() => {
    const empty: Record<DeckSection, number[]> = { main: [], extra: [], side: [] };
    if (!deck) {
      return empty;
    }

    const findSlots = (section: number[]) => {
      const slots: number[] = [];
      section.forEach((id, index) => {
        if (id <= 0) {
          slots.push(index);
        }
      });
      return slots;
    };

    return {
      main: findSlots(deck.main),
      extra: findSlots(deck.extra),
      side: findSlots(deck.side),
    };
  }, [deck]);

  const cardBreakdown = useMemo(
    () => ({
      main: deck?.main.length ?? 0,
      extra: deck?.extra.length ?? 0,
      side: deck?.side.length ?? 0,
    }),
    [deck],
  );

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
    if (!isResultsView) {
      if (deckQueryParam) {
        const next = new URLSearchParams(location.search);
        next.delete('deck');
        setSearchParams(next, { replace: true });
      }
      return;
    }

    if (!shareToken) {
      if (deckQueryParam) {
        const next = new URLSearchParams(location.search);
        next.delete('deck');
        setSearchParams(next, { replace: true });
      }
      return;
    }

    if (deckQueryParam === shareToken) {
      return;
    }

    const next = new URLSearchParams(location.search);
    next.set('deck', shareToken);
    setSearchParams(next, { replace: true });
  }, [shareToken, deckQueryParam, location.search, setSearchParams, isResultsView]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !shareToken) {
      return '';
    }
    return `${window.location.origin}${window.location.pathname}#/results?deck=${encodeURIComponent(
      shareToken,
    )}`;
  }, [shareToken]);

  useEffect(() => {
    if (!deckQueryParam) {
      return;
    }
    try {
      const decoded = decodeDeckHash(deckQueryParam);
      deckInputSourceRef.current = 'url';
      setDeckInput(decoded);
      if (!isResultsView) {
        navigate('/results', { replace: true });
      }
    } catch (error) {
      console.warn('Unable to decode deck from query:', error);
    }
  }, [deckQueryParam, isResultsView, navigate]);


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

  const deckGroups = useMemo<DeckGroups | null>(() => {
    if (!deck) {
      return null;
    }

    const monsterPriority = (typeLabel: string, zone: DeckSection) => {
      const basePriority = (() => {
        if (typeLabel.includes('normal') && !typeLabel.includes('pendulum')) {
          return 0;
        }
        if (typeLabel.includes('effect') && !typeLabel.includes('pendulum') && !typeLabel.includes('ritual')) {
          return 1;
        }
        if (typeLabel.includes('pendulum')) {
          return 2;
        }
        if (typeLabel.includes('ritual')) {
          return 3;
        }
        return 4;
      })();
      if (zone === 'extra') {
        if (typeLabel.includes('fusion')) {
          return 5;
        }
        if (typeLabel.includes('synchro')) {
          return 6;
        }
        if (typeLabel.includes('xyz')) {
          return 7;
        }
        if (typeLabel.includes('link')) {
          return 8;
        }
        return 9;
      }
      return basePriority;
    };

    const spellPriority = (raceLabel: string) => {
      if (raceLabel.includes('normal')) {
        return 0;
      }
      if (raceLabel.includes('quick')) {
        return 1;
      }
      if (raceLabel.includes('ritual')) {
        return 2;
      }
      if (raceLabel.includes('field')) {
        return 3;
      }
      if (raceLabel.includes('continuous')) {
        return 4;
      }
      if (raceLabel.includes('equip')) {
        return 5;
      }
      return 6;
    };

    const trapPriority = (raceLabel: string) => {
      if (raceLabel.includes('counter')) {
        return 0;
      }
      if (raceLabel.includes('continuous')) {
        return 1;
      }
      return 2;
    };

    const getSortMeta = (card: DeckCardGroup, zone: DeckSection) => {
      const rawType = (card.type ?? '').toLowerCase();
      const rawRace = (card.race ?? '').toLowerCase();
      const name = card.name.toLowerCase();
      const order = card.orderIndex ?? Number.MAX_SAFE_INTEGER;

      if (rawType.includes('monster')) {
        return {
          priority: 0,
          sub: monsterPriority(`${rawType} ${rawRace}`, zone),
          level: card.level ?? 0,
          sortByLevel: !['link', 'xyz'].some((label) => rawType.includes(label)),
          name,
          order,
        };
      }

      if (rawType.includes('spell')) {
        return {
          priority: 1,
          sub: spellPriority(rawRace),
          level: 0,
          sortByLevel: false,
          name,
          order,
        };
      }

      if (rawType.includes('trap')) {
        return {
          priority: 2,
          sub: trapPriority(rawRace),
          level: 0,
          sortByLevel: false,
          name,
          order,
        };
      }

      return { priority: 4, sub: 0, level: card.level ?? 0, sortByLevel: false, name, order };
    };

    const compareCards = (zone: DeckSection) => (a: DeckCardGroup, b: DeckCardGroup) => {
      if (cardSortMode[zone] === 'points') {
        const pointDiff = (b.pointsPerCopy ?? 0) - (a.pointsPerCopy ?? 0);
        if (pointDiff !== 0) {
          return pointDiff;
        }
        const totalDiff = (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
        if (totalDiff !== 0) {
          return totalDiff;
        }
      }
      const metaA = getSortMeta(a, zone);
      const metaB = getSortMeta(b, zone);

      if (metaA.priority !== metaB.priority) {
        return metaA.priority - metaB.priority;
      }

      if (metaA.sub !== metaB.sub) {
        return metaA.sub - metaB.sub;
      }

      if (metaA.sortByLevel && metaB.sortByLevel && metaA.level !== metaB.level) {
        return (metaB.level ?? 0) - (metaA.level ?? 0);
      }

      const nameCompare = metaA.name.localeCompare(metaB.name);
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return metaA.order - metaB.order;
    };

    const toGroup = (ids: number[], zone: DeckSection): DeckCardGroup[] => {
      const counts = new Map<number, { count: number; firstIndex: number }>();
      ids.forEach((id, index) => {
        const entry = counts.get(id);
        if (entry) {
          entry.count += 1;
        } else {
          counts.set(id, { count: 1, firstIndex: index });
        }
      });

      const rawGroups = Array.from(counts.entries()).map(([id, meta]) => {
        const info = cardDetails[id];
        const fallbackName = id === 0 ? 'Missing ID' : `Card #${id}`;
        const originalName = info?.name ?? fallbackName;
        const displayName = id === 0 && !info?.name ? fallbackName : simplifyCardName(originalName);
        const normalized = normalizeCardName(displayName);
        const points = genesysPointMap.get(normalized);

        const rawType = info?.type;
        const rawRace = info?.race;
        return {
          id,
          count: meta.count,
          zone,
          name: displayName,
          image: info?.image,
          fullImage: info?.imageCropped ?? info?.image,
          type: rawType ?? info?.race,
          race: rawRace,
          displayType: formatCardTypeLabel(rawType ?? info?.race, rawRace),
          desc: info?.desc,
          level: info?.level,
          linkValue: info?.linkValue,
          orderIndex: meta.firstIndex,
          linkUrl: info?.ygoprodeckUrl,
          pointsPerCopy: points ?? 0,
          totalPoints: (points ?? 0) * meta.count,
          missingInfo: !info,
          notInList: !genesysPointMap.has(normalized),
        };
      });

      const merged = new Map<string, DeckCardGroup>();
      rawGroups.forEach((card) => {
        const key = `${normalizeCardName(card.name)}::${card.zone}`;
        const existing = merged.get(key);
        if (existing) {
          existing.count += card.count;
          existing.totalPoints += card.totalPoints;
          existing.orderIndex = Math.min(
            existing.orderIndex ?? Number.MAX_SAFE_INTEGER,
            card.orderIndex ?? Number.MAX_SAFE_INTEGER,
          );
          if (!existing.image && card.image) {
            existing.image = card.image;
          }
          if (!existing.fullImage && card.fullImage) {
            existing.fullImage = card.fullImage;
          }
          if (!existing.type && card.type) {
            existing.type = card.type;
          }
          if (!existing.race && card.race) {
            existing.race = card.race;
          }
          if (!existing.displayType && card.displayType) {
            existing.displayType = card.displayType;
          }
          if (!existing.desc && card.desc) {
            existing.desc = card.desc;
          }
          if (!existing.level && card.level) {
            existing.level = card.level;
          }
          if (!existing.linkValue && card.linkValue) {
            existing.linkValue = card.linkValue;
          }
        } else {
          merged.set(key, { ...card });
        }
      });

      return Array.from(merged.values()).sort(compareCards(zone));
    };

    return {
      main: toGroup(deck.main, 'main'),
      extra: toGroup(deck.extra, 'extra'),
      side: toGroup(deck.side, 'side'),
    };
  }, [deck, cardDetails, genesysPointMap, cardSortMode.main, cardSortMode.extra, cardSortMode.side]);

  const totalPoints = useMemo(() => {
    if (!deckGroups) {
      return 0;
    }

    return [...deckGroups.main, ...deckGroups.extra, ...deckGroups.side].reduce(
      (sum, card) => sum + card.totalPoints,
      0,
    );
  }, [deckGroups]);

  const handleCardFocus = (card: DeckCardGroup) => {
    if (card.id <= 0) {
      return;
    }
    setFocusedCard(card);
  };

  const handleMissingCardSelect = (card: DeckCardGroup) => {
    const slots = missingSlots[card.zone];
    if (slots.length === 0) {
      toast.info('All missing cards in this section have been resolved.');
      return;
    }
    setFocusedCard(null);
    setMissingCardContext({ zone: card.zone, cardName: card.name });
  };

  const handleDeckInputChange = useCallback((value: string) => {
    deckInputSourceRef.current = 'manual';
    setDeckInput(value);
  }, []);

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
      fullImage: info?.imageCropped ?? info?.image,
      type: info?.type ?? info?.race,
      race: info?.race,
      displayType: formatCardTypeLabel(info?.type, info?.race),
      level: info?.level,
      linkValue: info?.linkValue,
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
    if (isResultsView && altArtCount > 0) {
      setShowUndetectedCardsWarning(true);
    }
  }, [isResultsView, altArtCount]);


  const handleImportYdkFile = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        const deck = parseYdk(content);
        if (deck.main.length === 0 && deck.extra.length === 0 && deck.side.length === 0) {
          throw new Error('No cards found in YDK file.');
        }
        const ydke = buildYdke(deck.main, deck.extra, deck.side);
        deckInputSourceRef.current = 'file';
        setDeckInput(ydke);
        toast.success('YDK deck imported.');
      } catch (error) {
        console.error('YDK import failed', error);
        toast.error(
          error instanceof Error ? error.message : 'Unable to import YDK file. Please check the file contents.',
        );
      }
    },
    [],
  );

  const setSavedFoldersAndPersist = useCallback(
    (producer: (prev: SavedDeckFolder[]) => SavedDeckFolder[]) => {
      setSavedFolders((prev) => {
        const prevEnsured = ensureFolders(prev);
        const next = ensureFolders(producer(prevEnsured.map((folder) => ({ ...folder, decks: [...folder.decks] }))));
        persistFolders(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const decksMissingSummary: Array<{
      folderId: string;
      deckId: string;
      deckString: string;
    }> = [];
    savedFolders.forEach((folder) => {
      folder.decks.forEach((deckEntry) => {
        if (deckEntry.summary?.points === undefined) {
          decksMissingSummary.push({
            folderId: folder.id,
            deckId: deckEntry.id,
            deckString: deckEntry.deck,
          });
        }
      });
    });
    if (decksMissingSummary.length === 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      const parsedDecks = decksMissingSummary
        .map(({ folderId, deckId, deckString }) => {
          try {
            return { folderId, deckId, parsed: parseYdke(deckString) };
          } catch {
            return null;
          }
        })
        .filter((entry): entry is { folderId: string; deckId: string; parsed: ParsedDeck } => Boolean(entry));
      if (parsedDecks.length === 0) {
        return;
      }

      const allIds = parsedDecks
        .flatMap(({ parsed }) => [...parsed.main, ...parsed.extra, ...parsed.side])
        .filter((id) => id > 0);

      let details: Record<number, CardDetails> = {};
      try {
        details = await fetchCardsByIds(allIds);
      } catch (error) {
        console.warn('Unable to backfill saved deck summaries', error);
        return;
      }
      if (cancelled) {
        return;
      }

      const updates = parsedDecks.map(({ folderId, deckId, parsed }) => {
        const totalPoints = [...parsed.main, ...parsed.extra, ...parsed.side].reduce((sum, id) => {
          const card = details[id];
          if (!card) {
            return sum;
          }
          const normalized = normalizeCardName(card.name);
          return sum + (genesysPointMap.get(normalized) ?? 0);
        }, 0);
        return {
          folderId,
          deckId,
          summary: {
            main: parsed.main.length,
            extra: parsed.extra.length,
            side: parsed.side.length,
            points: totalPoints,
          },
        };
      });

      setSavedFoldersAndPersist((prev) =>
        prev.map((folder) => {
          const folderUpdates = updates.filter((update) => update.folderId === folder.id);
          if (folderUpdates.length === 0) {
            return folder;
          }
          const lookup = new Map(folderUpdates.map((entry) => [entry.deckId, entry.summary]));
          const decks = folder.decks.map((deckEntry) => {
            const summary = lookup.get(deckEntry.id);
            if (!summary) {
              return deckEntry;
            }
            return { ...deckEntry, summary };
          });
          return { ...folder, decks };
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [savedFolders, genesysPointMap, setSavedFoldersAndPersist]);

  const handleImportJsonDeck = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        let jsonText = content.trim();
        if (!jsonText) {
          throw new Error('JSON deck file is empty.');
        }
        try {
          JSON.parse(jsonText);
        } catch {
          const lastBrace = jsonText.lastIndexOf('}');
          if (lastBrace >= 0) {
            jsonText = jsonText.slice(0, lastBrace + 1);
          }
        }
        const payload = JSON.parse(jsonText) as {
          m?: { ids?: number[]; r?: number[] };
          e?: { ids?: number[]; r?: number[] };
          s?: { ids?: number[]; r?: number[] };
        };

        const expandSection = (section?: { ids?: number[]; r?: number[] }) => {
          if (!section?.ids || !Array.isArray(section.ids)) {
            return [];
          }
          const counts = section.r ?? [];
          const cards: number[] = [];
          section.ids.forEach((idValue, index) => {
            const id = Number(idValue);
            if (!Number.isFinite(id) || id <= 0) {
              return;
            }
            const copies = Number(counts[index] ?? 1);
            const repeat = Math.max(0, Math.floor(copies));
            for (let copy = 0; copy < repeat; copy += 1) {
              cards.push(id);
            }
          });
          return cards;
        };

        const mainKonami = expandSection(payload.m);
        const extraKonami = expandSection(payload.e);
        const sideKonami = expandSection(payload.s);

        if (mainKonami.length === 0 && extraKonami.length === 0 && sideKonami.length === 0) {
          throw new Error('No cards found in JSON deck.');
        }

        const uniqueKonamiIds = Array.from(
          new Set([...mainKonami, ...extraKonami, ...sideKonami].filter((id) => id > 0)),
        );
        const konamiMap = uniqueKonamiIds.length
          ? await fetchCardsByKonamiIds(uniqueKonamiIds)
          : {};

        let missingKonamiCount = 0;
        const convertSection = (ids: number[]) =>
          ids.map((konamiId) => {
            const match = konamiMap[konamiId];
            if (!match) {
              missingKonamiCount += 1;
              return 0;
            }
            return match.id;
          });

        const main = convertSection(mainKonami);
        const extra = convertSection(extraKonami);
        const side = convertSection(sideKonami);

        const ydke = buildYdke(main, extra, side);
        deckInputSourceRef.current = 'json';
        setDeckInput(ydke);
        if (missingKonamiCount > 0) {
          toast.warning(
            `${missingKonamiCount} card${missingKonamiCount === 1 ? '' : 's'} were not found in the YGOProDeck database and were added as Missing ID.`,
          );
        } else {
          toast.success('JSON deck imported.');
        }
      } catch (error) {
        console.error('JSON import failed', error);
        toast.error(
          error instanceof Error ? error.message : 'Unable to import JSON deck. Please check the file contents.',
        );
      }
    },
    [],
  );

  const handleSaveDeck = useCallback(
    (name: string, folderId?: string) => {
      const deckString = deckInput.trim();
      if (!deckString) {
        toast.error('Load or paste a deck before saving.');
        return;
      }
      const trimmedName = name.trim() || 'Untitled deck';
      const entry: SavedDeckEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmedName,
        deck: deckString,
        savedAt: new Date().toISOString(),
        summary: {
          main: cardBreakdown.main,
          extra: cardBreakdown.extra,
          side: cardBreakdown.side,
          points: totalPoints,
        },
      };
      setSavedFoldersAndPersist((prev) => {
        const next = [...prev];
        let targetIndex = folderId ? next.findIndex((folder) => folder.id === folderId) : -1;
        if (targetIndex < 0) {
          if (next.length === 0) {
            next.push(createFolder(DEFAULT_FOLDER_NAME, DEFAULT_FOLDER_ID));
          }
          targetIndex = 0;
        }
        const folder = { ...next[targetIndex], decks: [entry, ...next[targetIndex].decks].slice(0, 200) };
        next[targetIndex] = folder;
        toast.success('Deck saved locally.');
        return next;
      });
      lastSavedDeckRef.current = deckString;
    },
    [deckInput, setSavedFoldersAndPersist, cardBreakdown, totalPoints],
  );

  const handleLoadSavedDeck = useCallback(
    (folderId: string, deckId: string) => {
      const folder = savedFolders.find((entry) => entry.id === folderId);
      const deck = folder?.decks.find((entry) => entry.id === deckId);
      if (!deck) {
        toast.error('Saved deck not found.');
        return;
      }
      deckInputSourceRef.current = 'saved';
      setDeckInput(deck.deck);
      navigate('/results', { replace: false });
      toast.success(`Loaded ${deck.name}`);
    },
    [savedFolders, navigate],
  );

  const handleRenameSavedDeck = useCallback(
    (folderId: string, deckId: string, nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed) {
        toast.error('Enter a deck name.');
        return;
      }
      let renamed = false;
      setSavedFoldersAndPersist((prev) =>
        prev.map((folder) => {
          if (folder.id !== folderId) {
            return folder;
          }
          const decks = folder.decks.map((deck) => {
            if (deck.id !== deckId) {
              return deck;
            }
            renamed = true;
            return { ...deck, name: trimmed };
          });
          return { ...folder, decks };
        }),
      );
      if (renamed) {
        toast.success('Deck renamed.');
      } else {
        toast.error('Unable to rename deck.');
      }
    },
    [setSavedFoldersAndPersist],
  );

  const handleDeleteSavedDeck = useCallback(
    (folderId: string, deckId: string) => {
      let deleted = false;
      setSavedFoldersAndPersist((prev) => {
        const next = prev.map((folder) => {
          if (folder.id !== folderId) {
            return folder;
          }
          const decks = folder.decks.filter((deck) => deck.id !== deckId);
          if (decks.length !== folder.decks.length) {
            deleted = true;
          }
          return { ...folder, decks };
        });
        return next;
      });
      if (deleted) {
        toast.success('Deck deleted.');
      } else {
        toast.error('Unable to delete deck.');
      }
    },
    [setSavedFoldersAndPersist],
  );

  const handleSaveCurrentDeck = useCallback(() => {
    handleSaveDeck('', undefined);
    setShouldAutoSaveDeck(false);
  }, [handleSaveDeck]);

  const handleMoveSavedDeck = useCallback(
    (sourceFolderId: string, deckId: string, targetFolderId: string, targetIndex: number) => {
      setSavedFoldersAndPersist((prev) => {
        const next = prev.map((folder) => ({ ...folder, decks: [...folder.decks] }));
        const sourceFolder = next.find((folder) => folder.id === sourceFolderId);
        const targetFolder = next.find((folder) => folder.id === targetFolderId);
        if (!sourceFolder || !targetFolder) {
          return prev;
        }
        const sourceIndex = sourceFolder.decks.findIndex((deck) => deck.id === deckId);
        if (sourceIndex === -1) {
          return prev;
        }
        if (sourceFolderId === targetFolderId) {
          const boundedIndex = Math.max(0, Math.min(targetIndex, sourceFolder.decks.length - 1));
          sourceFolder.decks = arrayMove(sourceFolder.decks, sourceIndex, boundedIndex);
          return next;
        }
        const [deckToMove] = sourceFolder.decks.splice(sourceIndex, 1);
        if (!deckToMove) {
          return prev;
        }
        const insertIndex = Math.max(0, Math.min(targetIndex, targetFolder.decks.length));
        targetFolder.decks.splice(insertIndex, 0, deckToMove);
        return next;
      });
    },
    [setSavedFoldersAndPersist],
  );

  const handleCreateFolder = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error('Enter a folder name.');
        return;
      }
      let created = false;
      setSavedFoldersAndPersist((prev) => {
        if (prev.some((folder) => folder.name.toLowerCase() === trimmed.toLowerCase())) {
          toast.error('Folder with that name already exists.');
          return prev;
        }
        created = true;
        return [...prev, createFolder(trimmed)];
      });
      if (created) {
        toast.success('Folder created.');
      }
    },
    [setSavedFoldersAndPersist],
  );

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      let removed = false;
      setSavedFoldersAndPersist((prev) => {
        if (prev.length <= 1) {
          toast.error('Cannot delete the last folder.');
          return prev;
        }
        const folder = prev.find((entry) => entry.id === folderId);
        if (!folder) {
          toast.error('Folder not found.');
          return prev;
        }
        if (folder.decks.length > 0) {
          toast.error('Remove decks from this folder first.');
          return prev;
        }
        removed = true;
        return prev.filter((entry) => entry.id !== folderId);
      });
      if (removed) {
        toast.success('Folder deleted.');
      }
    },
    [setSavedFoldersAndPersist],
  );

  useEffect(() => {
    if (!deck) {
      return;
    }
    const trimmed = deckInput.trim();
    if (!trimmed) {
      setShouldAutoSaveDeck(false);
      return;
    }
    if (trimmed === lastSavedDeckRef.current) {
      setShouldAutoSaveDeck(false);
      return;
    }
    const source = deckInputSourceRef.current;
    if (source !== 'manual' && source !== 'file' && source !== 'json') {
      setShouldAutoSaveDeck(source === 'url');
      return;
    }
    handleSaveDeck('', undefined);
    deckInputSourceRef.current = 'system';
    setShouldAutoSaveDeck(false);
    if (!isResultsView) {
      navigate('/results', { replace: false });
    }
  }, [deck, deckInput, handleSaveDeck, isResultsView, navigate]);

  useEffect(() => {
    if (!deck || !deckInput.trim()) {
      setShouldAutoSaveDeck(false);
      return;
    }
    if (deckInputSourceRef.current === 'url') {
      setShouldAutoSaveDeck(true);
    } else if (shouldAutoSaveDeck) {
      setShouldAutoSaveDeck(false);
    }
  }, [deck, deckInput, shouldAutoSaveDeck]);

  const handleExportSavedDecks = useCallback(() => {
    const deckCount = savedFolders.reduce((sum, folder) => sum + folder.decks.length, 0);
    if (deckCount === 0) {
      toast.info('No saved decks to export.');
      return;
    }
    const payload = {
      version: 2,
      folders: savedFolders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ygo-genesys-decks-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [savedFolders]);

  const handleImportSavedDecks = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const importedFolders = normalizeFolders(parsed, false);
        const totalDecks = importedFolders.reduce((sum, folder) => sum + folder.decks.length, 0);
        if (totalDecks === 0) {
          throw new Error('No valid decks found in file.');
        }
        setSavedFoldersAndPersist((prev) => {
          const existingIds = new Set(prev.map((folder) => folder.id));
          const merged = [...prev];
          importedFolders.forEach((folder) => {
            let newId = folder.id;
            while (existingIds.has(newId)) {
              newId = generateFolderId();
            }
            existingIds.add(newId);
            merged.push({ ...folder, id: newId });
          });
          return merged;
        });
        toast.success(`Imported ${totalDecks} deck${totalDecks === 1 ? '' : 's'}.`);
      } catch (error) {
        console.error('Import saved decks failed', error);
        toast.error(error instanceof Error ? error.message : 'Failed to import saved decks.');
      }
    },
    [setSavedFoldersAndPersist],
  );

  const modalDepth =
    Number(showPointList) +
    Number(showBlockedList) +
    (focusedCard ? 1 : 0) +
    (missingCardContext ? 1 : 0) +
    Number(showSavedDeckModal);

  const closeTopModal = useCallback(() => {
    if (showSavedDeckModal) {
      setShowSavedDeckModal(false);
      return true;
    }
    if (missingCardContext) {
      setMissingCardContext(null);
      return true;
    }
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
  }, [focusedCard, missingCardContext, showSavedDeckModal, showBlockedList, showPointList]);

  const requestCloseTopModal = useCallback(() => {
    if (modalDepthRef.current > 0) {
      window.history.back();
    } else {
      closeTopModal();
    }
  }, [closeTopModal]);

  useEffect(() => {
    if (!missingCardContext) {
      return;
    }
    if (missingSlots[missingCardContext.zone].length === 0) {
      closeTopModal();
    }
  }, [missingCardContext, missingSlots, closeTopModal]);

  const handleMissingIdResolve = (selection: MissingReplacementPick[]) => {
    if (!deck || !missingCardContext) {
      return;
    }
    const slots = missingSlots[missingCardContext.zone];
    if (slots.length === 0) {
      requestCloseTopModal();
      return;
    }

    const replacements: number[] = [];
    selection.forEach((entry) => {
      for (let i = 0; i < entry.count; i += 1) {
        replacements.push(entry.card.id);
      }
    });

    if (replacements.length === 0) {
      return;
    }

    const limit = Math.min(replacements.length, slots.length);
    const updated = {
      main: deck.main.slice(),
      extra: deck.extra.slice(),
      side: deck.side.slice(),
    };

    for (let index = 0; index < limit; index += 1) {
      const targetIndex = slots[index];
      updated[missingCardContext.zone][targetIndex] = replacements[index];
    }

    const nextYdke = buildYdke(updated.main, updated.extra, updated.side);
    deckInputSourceRef.current = 'system';
    setDeckInput(nextYdke);
    closeTopModal();
    toast.success(limit === 1 ? 'Replaced 1 missing card.' : `Replaced ${limit} missing cards.`);
  };

  useEffect(() => {
    if (!focusedCard && !showBlockedList && !showPointList && !missingCardContext && !showSavedDeckModal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestCloseTopModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedCard, missingCardContext, showBlockedList, showPointList, showSavedDeckModal, requestCloseTopModal]);

  useEffect(() => {
    if (!showChatAssistant) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowChatAssistant(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showChatAssistant]);

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

  const cardsOverCap = pointCap > 0 && totalPoints > pointCap;
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
            type: details?.type ?? card.type,
            race: details?.race ?? card.race,
            displayType: formatCardTypeLabel(details?.type ?? card.type, details?.race ?? card.race),
          });
        }
      });
    });

    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [deckGroups, cardDetails]);

  const blockedCardIdSet = useMemo(() => {
    const ids = new Set<number>();
    blockedCards.forEach((card) => {
      if (card.id > 0) {
        ids.add(card.id);
      }
    });
    return ids;
  }, [blockedCards]);

  const blockedCardTotalCount = useMemo(() => blockedCards.reduce((sum, card) => sum + card.count, 0), [blockedCards]);

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

  const pointsRemaining = pointCap - totalPoints;
  const handlePointCapChange = (value: number) => setPointCap(value);
  const handleBrowsePointList = () => {
    setFocusedCard(null);
    setPointSearch('');
    setShowPointList(true);
  };
  const handleShowBlockedList = () => setShowBlockedList(true);
  const handleBackToImport = () => {
    setShowChatAssistant(false);
    setShowUndetectedCardsWarning(false);
    navigate('/', { replace: false });
  };
  const handleViewResults = () => {
    navigate('/results', { replace: false });
    if (altArtCount > 0) {
      setShowUndetectedCardsWarning(true);
    }
  };

  useEffect(() => {
    if (!isResultsView) {
      setShowChatAssistant(false);
      if (showSavedDeckModal) {
        setShowSavedDeckModal(false);
      }
    }
  }, [isResultsView, showSavedDeckModal]);

  const assistantContext = useMemo<AssistantDeckContext>(() => {
    const sanitize = (value?: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();

    const deckCards = deckGroups
      ? [...deckGroups.main, ...deckGroups.extra, ...deckGroups.side]
      : [];

    const deckCardsString = deckCards.length
      ? deckCards
        .map((card) => {
          const details = [
            `id=${card.id}`,
            `name=${card.name}`,
            `zone=${card.zone}`,
            `count=${card.count}`,
            `type=${card.type ?? 'Unknown'}`,
            `description=${sanitize(card.desc) || 'None'}`,
            `points_per_copy=${card.pointsPerCopy}`,
            `total_points=${card.totalPoints}`,
          ];
          return details.join(' | ');
        })
        .join('\n')
      : 'No cards provided.';

    const cardPointListString = genesysData.cards
      .map((card) => `${card.name}: ${card.points}`)
      .join('\n');

    const notes: string[] = [];
    if (cardError) {
      notes.push(cardError);
    }
    if (altArtCount > 0) {
      notes.push(
        `${altArtCount} card${altArtCount === 1 ? '' : 's'} still have missing IDs from the provided YDKE link.`
      );
    }

    return {
      points_cap: pointCap,
      total_points: totalPoints,
      points_remaining: pointsRemaining,
      deck_goal: '',
      deck_cards: deckCardsString,
      card_point_list: cardPointListString,
      notes: notes.join(' ') || '',
    };
  }, [deckGroups, pointCap, pointsRemaining, totalPoints, cardError, altArtCount]);

  const assistantContextString = useMemo(() => JSON.stringify(assistantContext), [assistantContext]);

  const assistantContextKey = useMemo(
    () => `assistant-${assistantContextString.length}-${hashString(assistantContextString)}`,
    [assistantContextString],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (isResultsView) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isResultsView, deckInput, savedFolders]);

  const mainWidthClass = isResultsView ? 'max-w-6xl' : 'max-w-4xl';

  return (
    <div className="min-h-screen bg-canvas text-slate-50">
      <main className={`mx-auto flex w-full ${mainWidthClass} flex-col gap-6 px-1 py-1 md:px-6`}>
        {!isResultsView ? (
          <ImportScreen
            genesysData={genesysData}
            deckError={deckError}
            onDeckInputChange={handleDeckInputChange}
            onViewBreakdown={handleViewResults}
            onImportYdkFile={handleImportYdkFile}
            onImportJsonDeck={handleImportJsonDeck}
            savedFolders={savedFolders}
            onLoadSavedDeck={handleLoadSavedDeck}
            onDeleteSavedDeck={handleDeleteSavedDeck}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameDeck={handleRenameSavedDeck}
            onMoveDeck={handleMoveSavedDeck}
            onExportSavedDecks={handleExportSavedDecks}
            onImportSavedDecks={handleImportSavedDecks}
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
                blockedTotalCount={blockedCardTotalCount}
                cardError={cardError}
                isFetchingCards={isFetchingCards}
                onPointCapChange={handlePointCapChange}
                onCopyShareLink={handleCopyShareLink}
                onBrowsePointList={handleBrowsePointList}
                onShowBlocked={handleShowBlockedList}
                onBack={handleBackToImport}
                onShowSavedDecks={() => setShowSavedDeckModal(true)}
              />
            </div>
            <section className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-panel/90 p-4 shadow-panel">
              <div className="flex-1 overflow-y-auto pr-2">
                <CardSections
                  deckGroups={deckGroups}
                  onCardSelect={handleCardFocus}
                  onMissingCardSelect={handleMissingCardSelect}
                  sortMode={cardSortMode}
                  onSortModeChange={(zone, mode) =>
                    setCardSortMode((prev) => (prev[zone] === mode ? prev : { ...prev, [zone]: mode }))
                  }
                  blockedCardIds={blockedCardIdSet}
                />
              </div>
            </section>
          </div>
        )}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 pb-6 text-sm text-slate-400">
        <a
          href="https://github.com/csiqueirasilva/ygo-genesys-helper"
          target="_blank"
          rel="noreferrer"
          className="mt-2 text-cyan-200 hover:text-cyan-100 hover:underline"
        >
          YGO Genesys Helper on GitHub (csiqueirasilva/ygo-genesys-helper)
        </a>
      </footer>

      {isResultsView && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3">
          <div
            className={`flex h-[min(85vh,680px)] w-[min(92vw,480px)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 transition-all duration-200 ${showChatAssistant ? 'pointer-events-auto opacity-100 translate-y-0 scale-100' : 'pointer-events-none opacity-0 translate-y-4 scale-95'
              }`}
            aria-hidden={!showChatAssistant}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200/80">Assistant</div>
              <button
                type="button"
                onClick={() => setShowChatAssistant(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-lg text-slate-300 transition hover:border-white/40 hover:text-white"
                aria-label="Close assistant"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-950/80">
              <ChatKitPanel key={assistantContextKey} assistantContext={assistantContext} />
            </div>
          </div>
          {!showChatAssistant && (
            <button
              type="button"
              onClick={() => setShowChatAssistant(true)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-lg hover:shadow-xl"
            >
              Assistant
            </button>
          )}
        </div>
      )}

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

      {showUndetectedCardsWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowUndetectedCardsWarning(false)}>
          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-panel/95 p-6 text-slate-50 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Import issues</p>
                <h2 className="text-2xl font-semibold">Undetected cards</h2>
              </div>
              <button
                className="text-2xl text-slate-300 hover:text-white"
                onClick={() => setShowUndetectedCardsWarning(false)}
                aria-label="Close undetected cards warning"
              >
                ×
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              {altArtCount} card{altArtCount === 1 ? '' : 's'} could not be imported with an official passcode in this YDKE link.
              They appear as <strong className="font-semibold text-white">Missing ID</strong> entries so you can pick the correct cards manually.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex w-full justify-center rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-900"
              onClick={() => setShowUndetectedCardsWarning(false)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {missingCardContext && missingSlots[missingCardContext.zone].length > 0 && (
        <MissingIdResolver
          zone={missingCardContext.zone}
          cardName={missingCardContext.cardName}
          missingCount={missingSlots[missingCardContext.zone].length}
          onClose={requestCloseTopModal}
          onResolve={handleMissingIdResolve}
        />
      )}

      {showSavedDeckModal && (
        <SavedDeckModal
          folders={savedFolders}
          showUnsavedNotice={shouldAutoSaveDeck}
          onSaveCurrentDeck={handleSaveCurrentDeck}
          onLoadDeck={(folderId, deckId) => {
            handleLoadSavedDeck(folderId, deckId);
            setShowSavedDeckModal(false);
          }}
          onClose={() => setShowSavedDeckModal(false)}
        />
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
                          <p className="text-xs text-slate-400">
                            {card.displayType ?? formatCardTypeLabel(card.type, card.race)}
                          </p>
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
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel touch-pan-y"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={requestCloseTopModal}
              aria-label="Close card details"
              className="absolute right-4 top-4 text-2xl text-slate-300 transition hover:text-white"
            >
              ×
            </button>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="mx-auto w-52 overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:mx-0 md:h-auto md:self-center">
                {activeCardDetails?.image || focusedCard.image ? (
                  <img
                    src={activeCardDetails?.image ?? focusedCard.image}
                    alt={focusedCard.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm text-slate-400">No art</div>
                )}
              </div>
              <div className="flex-1 space-y-3 pt-8 md:pt-0">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
                  {focusedCard.zone === 'main' ? 'Main Deck' : focusedCard.zone === 'extra' ? 'Extra Deck' : 'Side Deck'}
                </p>
                <h2 className="text-2xl font-semibold">{focusedCard.name}</h2>
                <p className="text-sm text-slate-400">
                  {formatCardTypeLabel(
                    activeCardDetails?.type ?? focusedCard.type,
                    activeCardDetails?.race ?? focusedCard.race,
                  )}
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
