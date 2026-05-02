import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';

import genesysPayload from './data/genesys-card-list.json';
import { normalizeCardName } from './lib/strings.ts';
import { parseYdk, buildYdke } from './lib/ydke.ts';
import { normalizeFolders } from './lib/storage.ts';
import type {
  DeckSection,
  Format,
  GenesysPayload,
} from './types.ts';

import { ImportScreen } from './components/ImportScreen.tsx';
import { SummaryPanel } from './components/SummaryPanel.tsx';
import { CardSections } from './components/CardSections.tsx';
import { MetaInsights } from './components/MetaInsights.tsx';
import { MetaCardModal } from './components/MetaCardModal.tsx';
import { CardSearchModal } from './components/CardSearchModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { SavedDeckModal } from './components/SavedDeckModal.tsx';

import { useDeckLibrary } from './hooks/useDeckLibrary';
import { useActiveDeck } from './hooks/useActiveDeck';
import { useUrlSync } from './hooks/useUrlSync';
import { useCardDetails } from './hooks/useCardDetails';
import { useDeckStats } from './hooks/useDeckStats';
import { DEFAULT_POINT_CAP, createFolder, SAVED_DECKS_STORAGE_KEY } from './constants';
import { generateDeckListPDF } from './lib/pdf';

const genesysData = genesysPayload as GenesysPayload;

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

  // 5. UI State
  const [metaCardId, setMetaCardId] = useState<number | null>(null);
  const [searchZone, setSearchZone] = useState<DeckSection | null>(null);
  const [showSavedDeckModal, setShowSavedDeckModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cardSortMode, setCardSortMode] = useState<any>({ main: 'points', extra: 'points', side: 'points' });

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
      toast.success('Deck link copied to clipboard');
    } catch (error) {
      toast.error('Clipboard unavailable.');
    }
  };

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

  const prevIsResultsViewRefForScroll = useRef(isResultsView);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const becameResults = isResultsView && !prevIsResultsViewRefForScroll.current;
    prevIsResultsViewRefForScroll.current = isResultsView;
    if (becameResults) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isResultsView]);

  return (
    <div className="min-h-screen bg-canvas text-slate-50">
      <main className={`mx-auto flex w-full ${isResultsView ? 'max-w-6xl' : 'max-w-4xl'} flex-col gap-6 px-1 py-1 md:px-6`}>
        {!isResultsView ? (
          <ImportScreen
            genesysData={genesysData}
            deckError={deckError}
            onDeckInputChange={setDeckInput}
            onViewBreakdown={() => navigate('/results')}
            onImportYdkFile={handleImportYdkFile}
            onImportJsonDeck={() => {}} // TODO
            savedFolders={savedFolders}
            onLoadSavedDeck={handleLoadSavedDeck}
            onDeleteSavedDeck={handleDeleteSavedDeck}
            onCreateFolder={(name) => setSavedFoldersAndPersist(prev => [...prev, createFolder(name)])}
            onDeleteFolder={() => {}}
            onRenameDeck={handleRenameSavedDeck}
            onMoveDeck={() => {}}
            onExportSavedDecks={() => {}}
            onImportSavedDecks={() => {}}
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
              shareStatus="idle"
              unknownCards={0}
              blockedCount={0}
              blockedTotalCount={0}
              cardError={cardError}
              isFetchingCards={isFetchingCards}
              onPointCapChange={setPointCap}
              onCopyShareLink={handleCopyShareLink}
              onBrowsePointList={() => {}}
              onShowBlocked={() => {}}
              onBack={() => navigate('/')}
              onShowSavedDecks={() => setShowSavedDeckModal(true)}
              activeDeckName={activeDeck?.name ?? null}
              onRenameDeck={(name) => activeDeck && handleRenameSavedDeck(activeDeck.folderId!, activeDeck.deckId!, name)}
              onSaveDeck={() => handleSaveDeck('', undefined, totalPoints)}
              onExportTxt={() => {}}
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
                onCardSelect={() => {}}
                onMetaClick={setMetaCardId}
                onUpdateCardCount={handleUpdateCardCount}
                onRemoveCard={handleRemoveCard}
                onAddCard={(zone) => setSearchZone(zone)}
                sortMode={cardSortMode}
                onSortModeChange={(z, m: any) => setCardSortMode({ ...cardSortMode, [z]: m })}
                blockedCardIds={new Set()}
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

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {showSavedDeckModal && (
        <SavedDeckModal
          folders={savedFolders}
          onClose={() => setShowSavedDeckModal(false)}
          onLoadDeck={handleLoadSavedDeck}
          onSaveCurrentDeck={() => handleSaveDeck('', undefined, totalPoints)}
          showUnsavedNotice={false}
        />
      )}
    </div>
  );
}
