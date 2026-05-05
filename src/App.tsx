import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';

import genesysPayload from './data/genesys-card-list.json';
import { normalizeCardName, formatCardTypeLabel } from './lib/strings.ts';
import { parseYdk, buildYdke } from './lib/ydke.ts';
import { normalizeFolders } from './lib/storage.ts';
import { fetchCardByName, fetchCardsByKonamiIds } from './lib/ygoprodeck.ts';
import type {
  CardDetails,
  DeckSection,
  Format,
  GenesysPayload,
  MetaData,
} from './types.ts';

import { ImportScreen } from './components/ImportScreen.tsx';
import { SummaryPanel } from './components/SummaryPanel.tsx';
import { CardSections } from './components/CardSections.tsx';
import { MetaInsights } from './components/MetaInsights.tsx';
import { MetaCardModal } from './components/MetaCardModal.tsx';
import { CardSearchModal } from './components/CardSearchModal.tsx';
import { CardDetailModal } from './components/CardDetailModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { MissingIdResolver } from './components/MissingIdResolver.tsx';
import type { MissingReplacementPick } from './components/MissingIdResolver.tsx';
import { SavedDeckModal } from './components/SavedDeckModal.tsx';

import { useDeckLibrary } from './hooks/useDeckLibrary';
import { useActiveDeck } from './hooks/useActiveDeck';
import { useUrlSync } from './hooks/useUrlSync';
import { useCardDetails } from './hooks/useCardDetails';
import { useDeckStats } from './hooks/useDeckStats';
import { DEFAULT_POINT_CAP, createFolder, SAVED_DECKS_STORAGE_KEY } from './constants';
import { generateDeckListPDF } from './lib/pdf';
import metaDataPayload from './data/meta-data.json';

const genesysData = genesysPayload as GenesysPayload;
const metaData = metaDataPayload as MetaData;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isResultsView = location.pathname === '/results';

  // 1. Deck Library Management
  const { savedFolders, setSavedFolders, setSavedFoldersAndPersist } = useDeckLibrary();

  // Load from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_DECKS_STORAGE_KEY);
      if (stored) {
        setSavedFolders(normalizeFolders(JSON.parse(stored)));
      }
    } catch {}
  }, [setSavedFolders]);

  // 2. Active Deck State
  const [pointCap, setPointCap] = useState(DEFAULT_POINT_CAP);
  const [format, setFormat] = useState<Format>('genesys');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  
  const {
    deckInput,
    setDeckInput,
    activeDeck,
    setActiveDeck,
    deckInputSourceRef,
    lastSavedDeckRef,
    deck,
    deckError,
    handleSaveDeck,
    handleUpdateCardCount,
    handleRemoveCard,
    handleAddCard
  } = useActiveDeck(setSavedFoldersAndPersist, savedFolders);

  // 3. Card Data & Stats
  const genesysPointMap = useMemo(() => {
    return new Map(genesysData.cards.map(c => [normalizeCardName(c.name), c.points]));
  }, []);

  const uniqueCardIds = useMemo(() => {
    if (!deck) return [];
    return Array.from(new Set([...deck.main, ...deck.extra, ...deck.side].filter(id => id > 0)));
  }, [deck]);

  const { cardDetails, isFetchingCards, cardError } = useCardDetails(uniqueCardIds);
  const { deckGroups, totalPoints } = useDeckStats(deck, cardDetails, genesysPointMap);

  const cardBreakdown = useMemo(() => ({
    main: deck?.main.length || 0,
    extra: deck?.extra.length || 0,
    side: deck?.side.length || 0
  }), [deck]);

  // 4. URL Sync
  const { shareUrl } = useUrlSync(
    isResultsView,
    deck,
    deckInput,
    activeDeck,
    deckInputSourceRef,
    setActiveDeck,
    setDeckInput
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!isResultsView) return;
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const pasted = event.clipboardData?.getData('text')?.trim();
      if (pasted && (pasted.startsWith('ydke://') || pasted.startsWith('ydk://'))) {
        event.preventDefault();
        deckInputSourceRef.current = 'url';
        setDeckInput(pasted);
        toast.success('YDKE pasted and deck updated.');
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isResultsView, setDeckInput]);

  // 5. UI State
  const [metaCardId, setMetaCardId] = useState<number | null>(null);
  const [focusedCard, setFocusedCard] = useState<any>(null);
  const [searchZone, setSearchZone] = useState<DeckSection | null>(null);
  const [showSavedDeckModal, setShowSavedDeckModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPointList, setShowPointList] = useState(false);
  const [pointSearch, setPointSearch] = useState('');
  const [pendingPointMin, setPendingPointMin] = useState(1);
  const [pendingPointMax, setPendingPointMax] = useState(100);
  const [pointMin, setPointMin] = useState(1);
  const [pointMax, setPointMax] = useState(100);
  const [pointListLimit, setPointListLimit] = useState(40);
  const [pointCardInfo, setPointCardInfo] = useState<Record<string, CardDetails | null>>({});
  const pointInfoLoading = useRef(new Set<string>());
  const pointListRef = useRef<HTMLDivElement | null>(null);
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [missingCardContext, setMissingCardContext] = useState<{ zone: DeckSection; cardName: string } | null>(null);
  const [showUndetectedCardsWarning, setShowUndetectedCardsWarning] = useState(false);
  const filteredPointCards = useMemo(() => {
    const query = normalizeCardName(pointSearch);
    return genesysData.cards.filter((card) => {
      if (card.points < pointMin || card.points > pointMax) return false;
      if (!query) return true;
      return normalizeCardName(card.name).includes(query);
    });
  }, [pointSearch, pointMin, pointMax]);

  const visiblePointCards = useMemo(
    () => filteredPointCards.slice(0, pointListLimit),
    [filteredPointCards, pointListLimit],
  );

  const commitPointFilters = () => {
    setPointMin(Math.min(pendingPointMin, pendingPointMax));
    setPointMax(Math.max(pendingPointMin, pendingPointMax));
    setPointListLimit(40);
  };

  const [cardSortMode, setCardSortMode] = useState<any>({ main: 'points', extra: 'points', side: 'points' });

  // 6. Modal Depth Management
  const modalDepth =
    (focusedCard ? 1 : 0) +
    (metaCardId ? 1 : 0) +
    (searchZone ? 1 : 0) +
    (showProfileModal ? 1 : 0) +
    (showPointList ? 1 : 0) +
    (showBlockedList ? 1 : 0) +
    (missingCardContext ? 1 : 0) +
    (showUndetectedCardsWarning ? 1 : 0) +
    (showSavedDeckModal ? 1 : 0);

  const prevModalDepthRef = useRef(0);
  const closeTopModal = useCallback(() => {
    if (showSavedDeckModal) {
      setShowSavedDeckModal(false);
      return true;
    }
    if (showUndetectedCardsWarning) {
      setShowUndetectedCardsWarning(false);
      return true;
    }
    if (showProfileModal) {
      setShowProfileModal(false);
      return true;
    }
    if (searchZone) {
      setSearchZone(null);
      return true;
    }
    if (metaCardId) {
      setMetaCardId(null);
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
    if (missingCardContext) {
      setMissingCardContext(null);
      return true;
    }
    if (focusedCard) {
      setFocusedCard(null);
      return true;
    }
    return false;
  }, [showSavedDeckModal, showProfileModal, searchZone, metaCardId, focusedCard, showBlockedList, showPointList, missingCardContext, showUndetectedCardsWarning]);

  const requestCloseTopModal = useCallback(() => {
    if (modalDepth > 0) window.history.back();
    else closeTopModal();
  }, [modalDepth, closeTopModal]);

  useEffect(() => {
    if (modalDepth > prevModalDepthRef.current) {
      window.history.pushState({ modal: 'overlay' }, '', window.location.href);
    }
    prevModalDepthRef.current = modalDepth;
  }, [modalDepth]);

  useEffect(() => {
    const handlePop = () => closeTopModal();
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [closeTopModal]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTopModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTopModal]);

  // Handlers
  const handleLoadSavedDeck = (fId: string, dId: string) => {
    const folder = savedFolders.find(f => f.id === fId);
    const d = folder?.decks.find(entry => entry.id === dId);
    if (d) {
      deckInputSourceRef.current = 'saved';
      setActiveDeck({ folderId: fId, deckId: dId, name: d.name });
      setDeckInput(d.deck);
      navigate('/results');
      toast.success(`Loaded ${d.name}`);
    }
  };

  const handleRenameSavedDeck = (folderId: string, deckId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    setSavedFoldersAndPersist((prev) =>
      prev.map((folder) => {
        if (folder.id !== folderId) return folder;
        const decks = folder.decks.map((d) => (d.id === deckId ? { ...d, name: trimmed } : d));
        return { ...folder, decks };
      })
    );
    if (activeDeck?.deckId === deckId) {
      setActiveDeck({ ...activeDeck, name: trimmed });
    }
  };

  const handleDeleteSavedDeck = (folderId: string, deckId: string) => {
    setSavedFoldersAndPersist((prev) =>
      prev.map((folder) => {
        if (folder.id !== folderId) return folder;
        return { ...folder, decks: folder.decks.filter((d) => d.id !== deckId) };
      })
    );
    if (activeDeck?.deckId === deckId) setActiveDeck(null);
  };

  const handleExportTxt = useCallback(async () => {
    if (!deckGroups) {
      toast.info('No deck loaded to export.');
      return;
    }
    const lines: string[] = [];
    if (activeDeck?.name) {
      lines.push(`Deck: ${activeDeck.name}`);
      lines.push('----------------------------------------');
    }
    const sections: Array<{ key: DeckSection; label: string }> = [
      { key: 'main', label: 'Main Deck' },
      { key: 'extra', label: 'Extra Deck' },
      { key: 'side', label: 'Side Deck' }
    ];
    sections.forEach(({ key, label }) => {
      const cards = deckGroups[key];
      if (cards.length === 0) return;
      lines.push('');
      lines.push(`// ${label} (${cards.reduce((sum, c) => sum + c.count, 0)} cards)`);
      cards.forEach((card) => {
        lines.push(`${card.count}x ${card.name} ${card.pointsPerCopy ? `[${card.pointsPerCopy} pts]` : ''}`);
      });
    });
    lines.push('');
    lines.push(`Total Points: ${totalPoints}`);
    if (pointCap > 0) lines.push(`Point Cap: ${pointCap}`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Deck list text copied to clipboard.');
    } catch (error) {
      console.warn('Clipboard unavailable', error);
      toast.error('Clipboard unavailable.');
    }
  }, [deckGroups, activeDeck, totalPoints, pointCap]);

  const handleImportYdkFile = async (file: File) => {
    try {
      const content = await file.text();
      const d = parseYdk(content);
      const ydke = buildYdke(d.main, d.extra, d.side);
      deckInputSourceRef.current = 'file';
      setActiveDeck(null);
      setDeckInput(ydke);
      toast.success('YDK deck imported.');
    } catch (e) {
      toast.error('Failed to import YDK file.');
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      toast.success('Deck link copied to clipboard');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (error) {
      console.warn('Clipboard unavailable', error);
      setShareStatus('error');
      toast.error('Clipboard unavailable.');
    }
  };

  const handleBrowsePointList = () => {
    setFocusedCard(null);
    setShowPointList(true);
  };

  const handleShowBlockedList = () => setShowBlockedList(true);

  const handleViewResults = () => {
    navigate('/results');
    if (altArtCount > 0) setShowUndetectedCardsWarning(true);
  };

  const handlePointCardClick = async (card: any) => {
    if (pointCardInfo[card.name]) {
      setFocusedCard({
        ...pointCardInfo[card.name],
        count: 0,
        zone: 'main',
        pointsPerCopy: card.points,
        totalPoints: 0,
        missingInfo: false,
        notInList: false,
      });
      return;
    }

    try {
      const details = await fetchCardByName(card.name);
      setPointCardInfo((prev) => ({ ...prev, [card.name]: details }));
      setFocusedCard({
        ...details,
        count: 0,
        zone: 'main',
        pointsPerCopy: card.points,
        totalPoints: 0,
        missingInfo: false,
        notInList: false,
      });
    } catch (error) {
      toast.error('Unable to fetch card details.');
    }
  };

  useEffect(() => {
    if (!showPointList) return;

    visiblePointCards.forEach(async (card) => {
      if (pointCardInfo[card.name] || pointInfoLoading.current.has(card.name)) return;
      pointInfoLoading.current.add(card.name);
      try {
        const details = await fetchCardByName(card.name);
        setPointCardInfo((prev) => ({ ...prev, [card.name]: details }));
      } catch {
      } finally {
        pointInfoLoading.current.delete(card.name);
      }
    });
  }, [showPointList, visiblePointCards, pointCardInfo]);

  useEffect(() => {
    if (!showPointList) return;
    const container = pointListRef.current;
    if (!container) return;
    const handleScroll = () => {
      const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 80;
      if (nearBottom) {
        setPointListLimit((limit) => Math.min(limit + 40, filteredPointCards.length));
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [showPointList, filteredPointCards.length]);

  const handleImportJsonDeck = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        let jsonText = content.trim();
        if (!jsonText) throw new Error('JSON deck file is empty.');
        
        try { JSON.parse(jsonText); } catch {
          const lastBrace = jsonText.lastIndexOf('}');
          if (lastBrace >= 0) jsonText = jsonText.slice(0, lastBrace + 1);
        }
        
        const payload = JSON.parse(jsonText);
        const expand = (section: any) => {
          if (!section?.ids || !Array.isArray(section.ids)) return [];
          const cards: number[] = [];
          section.ids.forEach((id: number, idx: number) => {
            const count = Number(section.r?.[idx] ?? 1);
            for (let i = 0; i < count; i++) cards.push(id);
          });
          return cards;
        };

        const mainKonami = expand(payload.m);
        const extraKonami = expand(payload.e);
        const sideKonami = expand(payload.s);

        const fetched = await fetchCardsByKonamiIds([...mainKonami, ...extraKonami, ...sideKonami]);
        const convert = (ids: number[]) => ids.map(id => fetched[id]?.id).filter(id => id > 0);

        setDeckInput(buildYdke(convert(mainKonami), convert(extraKonami), convert(sideKonami)));
        deckInputSourceRef.current = 'json';
        toast.success('JSON deck imported.');
      } catch (e) {
        toast.error('Failed to import JSON deck.');
      }
    },
    []
  );

  const handleImportSavedDecks = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const imported = normalizeFolders(parsed, false);
        setSavedFoldersAndPersist((prev) => [...prev, ...imported]);
        toast.success(`Imported ${imported.length} folders.`);
      } catch (e) {
        toast.error('Failed to import saved decks.');
      }
    },
    [setSavedFoldersAndPersist]
  );

  const handleMissingIdResolve = (selection: MissingReplacementPick[]) => {
    if (!deck || !missingCardContext) return;
    const slots = missingSlots[missingCardContext.zone];
    const replacements: number[] = [];
    selection.forEach(pick => {
      for (let i = 0; i < pick.count; i++) replacements.push(pick.card.id);
    });
    
    const updated = {
      main: [...deck.main],
      extra: [...deck.extra],
      side: [...deck.side]
    };
    
    const limit = Math.min(replacements.length, slots.length);
    for (let i = 0; i < limit; i++) {
      updated[missingCardContext.zone][slots[i]] = replacements[i];
    }
    
    setDeckInput(buildYdke(updated.main, updated.extra, updated.side));
    setMissingCardContext(null);
  };

  const handleMissingCardSelect = (card: any) => {
    setMissingCardContext({ zone: card.zone, cardName: card.name });
  };

  const missingSlots = useMemo(() => {
    if (!deck) return { main: [], extra: [], side: [] };
    const find = (ids: number[]) => ids.reduce<number[]>((acc, id, idx) => (id <= 0 ? [...acc, idx] : acc), []);
    return { main: find(deck.main), extra: find(deck.extra), side: find(deck.side) };
  }, [deck]);

  const altArtCount = useMemo(() => {
    if (!deck) return 0;
    return [...deck.main, ...deck.extra, ...deck.side].filter(id => id <= 0).length;
  }, [deck]);

  // Auto-save effect
  useEffect(() => {
    if (!deck || !deckInput.trim() || deckInput.trim() === lastSavedDeckRef.current) return;
    const source = deckInputSourceRef.current;
    if (source === 'url' || source === 'saved' || source === 'system') {
      lastSavedDeckRef.current = deckInput.trim();
      return;
    }
    handleSaveDeck('', undefined, totalPoints);
    deckInputSourceRef.current = 'system';
  }, [deck, deckInput, handleSaveDeck, totalPoints]);

  // Self-correct points in saved library when totalPoints updates asynchronously
  useEffect(() => {
    if (!activeDeck || !deckInput.trim() || deckInput.trim() !== lastSavedDeckRef.current) return;
    
    setSavedFoldersAndPersist((prev) => {
      let changed = false;
      const next = prev.map(folder => {
        if (folder.id !== activeDeck.folderId) return folder;
        const decks = folder.decks.map(d => {
          if (d.id !== activeDeck.deckId) return d;
          if (d.summary?.points !== totalPoints) {
            changed = true;
            return { ...d, summary: { ...d.summary, points: totalPoints } };
          }
          return d;
        });
        return { ...folder, decks };
      });
      return changed ? next : prev;
    });
  }, [totalPoints, activeDeck, deckInput, setSavedFoldersAndPersist, lastSavedDeckRef]);

  const prevIsResultsViewRefForScroll = useRef(isResultsView);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const becameResults = isResultsView && !prevIsResultsViewRefForScroll.current;
    prevIsResultsViewRefForScroll.current = isResultsView;
    if (becameResults) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isResultsView]);

  const blockedCards = useMemo(() => {
    if (!deckGroups) return [];
    const unique = new Map<string, any>();
    (['main', 'extra', 'side'] as DeckSection[]).forEach((zone) => {
      deckGroups[zone].forEach((card) => {
        const details = cardDetails[card.id];
        const type = details?.type?.toLowerCase() ?? '';
        let isBlocked = false;
        if (format === 'genesys') {
          isBlocked = type.includes('link') || type.includes('pendulum');
        } else {
          const banStatus = (metaData as any).advanced.banlist[card.id.toString()];
          const limit = banStatus === 'Limited' ? 1 : banStatus === 'Semi-Limited' ? 2 : 3;
          isBlocked = banStatus === 'Forbidden' || card.count > limit;
        }
        if (!isBlocked) return;
        const existing = unique.get(card.name);
        if (existing) existing.count += card.count;
        else unique.set(card.name, { ...card, displayType: formatCardTypeLabel(details?.type, details?.race) });
      });
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [deckGroups, cardDetails, format]);

  const blockedCardIdSet = useMemo(() => new Set(blockedCards.map(c => c.id).filter(id => id > 0)), [blockedCards]);
  const blockedTotalCount = useMemo(() => blockedCards.reduce((sum, card) => sum + card.count, 0), [blockedCards]);

  const unknownCards = useMemo(() => {
    if (!deckGroups) return 0;
    const sum = (zone: DeckSection) => deckGroups[zone].reduce((s, c) => s + (c.notInList ? c.count : 0), 0);
    return sum('main') + sum('extra') + sum('side');
  }, [deckGroups]);

  return (
    <div className="min-h-screen bg-canvas text-slate-50">
      <main className={`mx-auto flex w-full ${isResultsView ? 'max-w-6xl' : 'max-w-4xl'} flex-col gap-6 px-1 py-1 md:px-6`}>
        {!isResultsView ? (
          <ImportScreen
            genesysData={genesysData}
            deckError={deckError}
            onDeckInputChange={setDeckInput}
            onViewBreakdown={handleViewResults}
            onImportYdkFile={handleImportYdkFile}
            onImportJsonDeck={handleImportJsonDeck}
            savedFolders={savedFolders}
            onLoadSavedDeck={handleLoadSavedDeck}
            onDeleteSavedDeck={handleDeleteSavedDeck}
            onCreateFolder={(name) => setSavedFoldersAndPersist(prev => [...prev, createFolder(name)])}
            onDeleteFolder={() => {}}
            onRenameDeck={handleRenameSavedDeck}
            onMoveDeck={() => {}}
            onExportSavedDecks={() => {}}
            onImportSavedDecks={handleImportSavedDecks}
            onShowProfile={() => setShowProfileModal(true)}
          />
        ) : (
          <div className="flex h-full flex-col gap-4">
            <SummaryPanel
              format={format}
              onFormatChange={setFormat}
              pointCap={pointCap}
              totalPoints={totalPoints}
              cardBreakdown={cardBreakdown}
              cardsOverCap={format === 'genesys' && totalPoints > pointCap}
              pointsRemaining={pointCap - totalPoints}
              shareUrl={shareUrl}
              shareStatus={shareStatus}
              unknownCards={unknownCards}
              blockedCount={blockedCards.length}
              blockedTotalCount={blockedTotalCount}
              cardError={cardError}
              isFetchingCards={isFetchingCards}
              onPointCapChange={setPointCap}
              onCopyShareLink={handleCopyShareLink}
              onBrowsePointList={handleBrowsePointList}
              onShowBlocked={handleShowBlockedList}
              onBack={() => navigate('/')}
              onShowSavedDecks={() => setShowSavedDeckModal(true)}
              activeDeckName={activeDeck?.name ?? null}
              onRenameDeck={(name) => activeDeck && handleRenameSavedDeck(activeDeck.folderId!, activeDeck.deckId!, name)}
              onSaveDeck={() => handleSaveDeck('', undefined, totalPoints)}
              onExportTxt={handleExportTxt}
              onExportPdf={() => {
                const profileRaw = localStorage.getItem('ygo-user-profile');
                const profile = profileRaw ? JSON.parse(profileRaw) : { fullName: '', konamiId: '' };
                if (deckGroups) generateDeckListPDF(deckGroups, profile, activeDeck?.name || 'Untitled Deck');
              }}
              onShowProfile={() => setShowProfileModal(true)}
            />
            <MetaInsights deckGroups={deckGroups} format={format} />
            <section className="flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-panel/90 p-4 shadow-panel">
              <CardSections
                deckGroups={deckGroups}
                format={format}
                onCardSelect={setFocusedCard}
                onMetaClick={setMetaCardId}
                onUpdateCardCount={handleUpdateCardCount}
                onRemoveCard={handleRemoveCard}
                onAddCard={(zone) => setSearchZone(zone)}
                onMissingCardSelect={handleMissingCardSelect}
                sortMode={cardSortMode}
                onSortModeChange={(z, m: any) => setCardSortMode({ ...cardSortMode, [z]: m })}
                blockedCardIds={blockedCardIdSet}
              />
            </section>
          </div>
        )}
      </main>

      <Toaster position="bottom-center" richColors />

      {searchZone && (
        <CardSearchModal
          onClose={() => setSearchZone(null)}
          onAddCard={(card) => {
            handleAddCard(searchZone, card.id);
            toast.success(`Added ${card.name}`);
          }}
        />
      )}

      {metaCardId && (
        <MetaCardModal
          cardId={metaCardId}
          format={format}
          onClose={() => setMetaCardId(null)}
        />
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              </label>
              <div className="flex gap-2">
                <label className="w-20 text-sm text-slate-200 space-y-1">
                  <span>Min pts</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pendingPointMin}
                    onChange={(event) => setPendingPointMin(Number(event.target.value))}
                    onKeyDown={(event) => event.key === 'Enter' && commitPointFilters()}
                    onBlur={commitPointFilters}
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm font-bold"
                  />
                </label>
                <label className="w-20 text-sm text-slate-200 space-y-1">
                  <span>Max pts</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pendingPointMax}
                    onChange={(event) => setPendingPointMax(Number(event.target.value))}
                    onKeyDown={(event) => event.key === 'Enter' && commitPointFilters()}
                    onBlur={commitPointFilters}
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm font-bold"
                  />
                </label>
              </div>
            </div>

            <div
              ref={pointListRef}
              className="grid flex-1 content-start gap-3 overflow-y-auto pr-2 md:grid-cols-2"
            >
              {visiblePointCards.length > 0 ? (
                visiblePointCards.map((card) => {
                  const details = pointCardInfo[card.name];
                  return (
                    <button
                      key={card.name}
                      onClick={() => handlePointCardClick(card)}
                      className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-2 text-left transition hover:border-white/20 hover:bg-white/10"
                    >
                      <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-slate-800">
                        {details?.image ? (
                          <img
                            src={details.image}
                            alt=""
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[0.5rem] uppercase text-slate-500">
                            ...
                          </div>
                        )}
                      </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">
                            {card.name}
                          </p>
                          <p className="text-[0.65rem] uppercase tracking-wider text-slate-400">
                            {details ? formatCardTypeLabel(details.type, details.race) : 'Loading...'}
                          </p>
                        </div>
                      <div className="rounded-xl bg-cyan-500/20 px-3 py-1 text-center">
                        <span className="block text-xs font-bold text-cyan-200">{card.points}</span>
                        <span className="block text-[0.5rem] uppercase tracking-tighter text-cyan-300/70">
                          Pts
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500">
                  No cards found matching your search.
                </div>
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
                <h2 className="text-2xl font-semibold text-amber-200">Blocked list</h2>
                <p className="text-sm text-slate-400">
                  {blockedTotalCount} cards total in this deck are Link or Pendulum monsters.
                </p>
              </div>
              <button className="text-2xl text-slate-300 hover:text-white" onClick={requestCloseTopModal} aria-label="Close blocked list">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-2">
                {blockedCards.map((card, idx) => (
                  <div
                    key={`${card.name}-${idx}`}
                    className="flex items-center gap-3 rounded-2xl border border-rose-500/10 bg-rose-500/5 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-sm font-bold text-rose-300">
                      {card.count}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium text-slate-100">{card.name}</p>
                      <p className="text-[0.65rem] uppercase tracking-wider text-rose-300/70">
                        {card.displayType}
                      </p>
                    </div>
                    <div className="rounded-lg bg-rose-500/20 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-rose-200">
                      Blocked
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-rose-500/10 p-4 text-center">
              <p className="text-xs font-medium text-rose-200">
                Rule: Link and Pendulum monsters are not allowed in Genesys Format.
              </p>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      
      {missingCardContext && (
        <MissingIdResolver
          zone={missingCardContext.zone}
          cardName={missingCardContext.cardName}
          missingCount={missingSlots[missingCardContext.zone].length}
          onClose={() => setMissingCardContext(null)}
          onResolve={handleMissingIdResolve}
        />
      )}

      {showSavedDeckModal && (
        <SavedDeckModal
          folders={savedFolders}
          onClose={() => setShowSavedDeckModal(false)}
          onLoadDeck={handleLoadSavedDeck}
          onSaveCurrentDeck={() => handleSaveDeck('', undefined, totalPoints)}
          showUnsavedNotice={false}
        />
      )}

      {focusedCard && (
        <CardDetailModal
          card={focusedCard}
          details={cardDetails[focusedCard.id] || null}
          onClose={() => setFocusedCard(null)}
        />
      )}
    </div>
  );
}
