import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardDetails, GenesysPayload, SavedDeckEntry, SavedDeckFolder } from '../types';
import { formatTimestamp } from '../lib/strings.ts';
import { parseYdke, buildYdke, type ParsedDeck } from '../lib/ydke.ts';
import { toast } from 'sonner';
import { fetchCardsByIds } from '../lib/ygoprodeck.ts';

interface SortableDeckRowProps {
  deck: SavedDeckEntry;
  folderId: string;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelRename: () => void;
  onLoad: () => void;
  onRenameStart: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCopyList: () => void;
}

const SortableDeckRow = ({
  deck,
  folderId,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onCancelRename,
  onLoad,
  onRenameStart,
  onDelete,
  onCopy,
  onCopyList,
}: SortableDeckRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deck.id,
    data: { type: 'deck', folderId },
    disabled: isRenaming,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const deckSummary = useMemo(() => {
    if (deck.summary) {
      const normalizedPoints =
        deck.summary.points === undefined || deck.summary.points === null
          ? undefined
          : Number.isFinite(Number(deck.summary.points))
          ? Number(deck.summary.points)
          : undefined;
      return {
        main: Number(deck.summary.main) || 0,
        extra: Number(deck.summary.extra) || 0,
        side: Number(deck.summary.side) || 0,
        points: normalizedPoints,
      };
    }
    try {
      const parsed = parseYdke(deck.deck);
      return {
        main: parsed.main.length,
        extra: parsed.extra.length,
        side: parsed.side.length,
      };
    } catch {
      return null;
    }
  }, [deck]);
  const countsLabel = deckSummary ? `${deckSummary.main} / ${deckSummary.extra} / ${deckSummary.side}` : '— / — / —';
  const pointsValue =
    deckSummary && deckSummary.points !== undefined && deckSummary.points !== null ? deckSummary.points : undefined;
  const pointsColor =
    pointsValue === undefined ? 'text-slate-500' : pointsValue > 100 ? 'text-rose-300' : 'text-emerald-300';
  const pointsLabel = pointsValue === undefined ? '— pts' : `${pointsValue} pts`;

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handleClickAway = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isRenaming) {
      setIsMenuOpen(false);
    }
  }, [isRenaming]);

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleMenuAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleRowKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex flex-col gap-3 rounded-2xl border border-white/5 bg-black/35 p-3 text-sm text-slate-200 transition md:flex-row md:items-center md:justify-between ${
        isDragging ? 'opacity-70 ring-2 ring-cyan-400/50' : ''
      }`}
      onKeyDown={handleRowKeyDown}
    >
      <div className="flex-1">
        {isRenaming ? (
          <form onSubmit={onRenameSubmit} className="space-y-2">
            <input
              type="text"
              value={renameValue}
              onChange={(event) => onRenameChange(event.target.value)}
              autoFocus
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900"
              >
                Save name
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-white/40"
                onClick={onCancelRename}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="text-left text-base font-semibold text-white hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
              onClick={onLoad}
            >
              {deck.name}
            </button>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="font-mono text-sm text-white/90">{countsLabel}</span>
              <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">cards</span>
              <span className={`text-sm font-semibold ${pointsColor}`}>{pointsLabel}</span>
            </div>
          </>
        )}
      </div>
      {!isRenaming && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 hover:border-white"
            onClick={onCopyList}
            title="Copy card list"
          >
            TXT
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:border-white"
            onClick={onCopy}
            title="Copy deck as YDKE"
          >
            YDKE
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="rounded-full border border-white/20 p-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={handleToggleMenu}
            >
              <span aria-hidden="true">⋯</span>
              <span className="sr-only">Open deck options</span>
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-white/15 bg-black/95 p-1 text-left text-sm shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/5"
                  onClick={() => handleMenuAction(onLoad)}
                  onKeyDown={handleMenuKeyDown}
                >
                  Load
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/5"
                  onClick={() => handleMenuAction(onRenameStart)}
                  onKeyDown={handleMenuKeyDown}
                >
                  Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
                  onClick={() => handleMenuAction(onDelete)}
                  onKeyDown={handleMenuKeyDown}
                >
                  Delete
                </button>
                <div className="mt-1 rounded-xl border-t border-white/10 px-3 py-2 text-[0.65rem] uppercase tracking-wide text-slate-400">
                  Saved {formatTimestamp(deck.savedAt)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

interface FolderContainerProps {
  folder: SavedDeckFolder;
  children: React.ReactNode;
  isDraggingDeck: boolean;
  className?: string;
}

const FolderContainer = ({ folder, children, isDraggingDeck, className }: FolderContainerProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: 'folder-drop', folderId: folder.id },
  });
  return (
    <div
      ref={setNodeRef}
      className={`relative space-y-2 rounded-2xl border p-3 transition ${
        isOver
          ? 'border-cyan-300/80 bg-cyan-300/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
          : isDraggingDeck
          ? 'border-cyan-200/40 bg-black/30'
          : 'border-white/5 bg-black/25'
      } ${className ?? ''}`}
    >
      {isOver && (
        <div className="pointer-events-none absolute inset-x-6 -top-3 flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-cyan-100">
          <span className="h-px flex-1 rounded-full bg-cyan-300/70" />
          Drop here
          <span className="h-px flex-1 rounded-full bg-cyan-300/70" />
        </div>
      )}
      {children}
    </div>
  );
};

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

interface ImportScreenProps {
  genesysData: GenesysPayload;
  deckError: string | null;
  onDeckInputChange: (value: string) => void;
  onViewBreakdown: () => void;
  onImportYdkFile: (file: File) => void;
  onImportJsonDeck: (file: File) => void;
  savedFolders: SavedDeckFolder[];
  onLoadSavedDeck: (folderId: string, deckId: string) => void;
  onDeleteSavedDeck: (folderId: string, deckId: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameDeck: (folderId: string, deckId: string, name: string) => void;
  onMoveDeck: (sourceFolderId: string, deckId: string, targetFolderId: string, targetIndex: number) => void;
  onExportSavedDecks: () => void;
  onImportSavedDecks: (file: File) => void;
}

export function ImportScreen({
  genesysData,
  deckError,
  onDeckInputChange,
  onViewBreakdown,
  onImportYdkFile,
  onImportJsonDeck,
  savedFolders,
  onLoadSavedDeck,
  onDeleteSavedDeck,
  onCreateFolder,
  onDeleteFolder,
  onRenameDeck,
  onMoveDeck,
  onExportSavedDecks,
  onImportSavedDecks,
}: ImportScreenProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [pendingFolderName, setPendingFolderName] = useState('');
  const [renamingDeck, setRenamingDeck] = useState<{ folderId: string; deckId: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [folderMenu, setFolderMenu] = useState<{ folderId: string } | null>(null);
  const folderMenuRef = useRef<HTMLDivElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [isDraggingDeck, setIsDraggingDeck] = useState(false);
  const [dragPreviewLocation, setDragPreviewLocation] = useState<{ folderId: string; index: number } | null>(null);

  const FOLDER_OPEN_STORAGE_KEY = 'ygo-genesys-folder-open';

  const readExpandedState = () => {
    if (typeof window === 'undefined') {
      return {} as Record<string, boolean>;
    }
    try {
      const stored = window.localStorage.getItem(FOLDER_OPEN_STORAGE_KEY);
      if (!stored) {
        return {};
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const legacy: Record<string, boolean> = {};
        parsed.forEach((id) => {
          if (typeof id === 'string') {
            legacy[id] = true;
          }
        });
        console.log('[folders] loaded legacy state', legacy);
        return legacy;
      }
      if (parsed && typeof parsed === 'object') {
        console.log('[folders] loaded object state', parsed);
        return parsed as Record<string, boolean>;
      }
      return {};
    } catch (error) {
      console.warn('[folders] failed to read state', error);
      return {};
    }
  };

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean> | null>(null);
  const persistExpanded = useCallback((next: Record<string, boolean>) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FOLDER_OPEN_STORAGE_KEY, JSON.stringify(next));
      console.log('[folders] persisted state', next);
    }
  }, []);

  useEffect(() => {
    const initial = readExpandedState();
    console.log('[folders] hydration complete', initial);
    setExpandedFolders(initial);
  }, []);

  const processFile = useCallback(
    (file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'json' || file.type === 'application/json') {
        onImportJsonDeck(file);
        return;
      }
      onImportYdkFile(file);
    },
    [onImportJsonDeck, onImportYdkFile],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      event.target.value = '';
    }
  };

  const handleSavedLibraryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportSavedDecks(file);
      event.target.value = '';
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types?.includes('Files')) {
      dragCounter.current += 1;
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    dragCounter.current = 0;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSelectDeckFile = () => {
    fileInputRef.current?.click();
  };

  const handleScrollToLibrary = () => {
    const target = document.getElementById('saved-decks-library');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenFolderModal = () => {
    setPendingFolderName('');
    setShowNewFolderModal(true);
  };

  const handleCloseFolderModal = useCallback(() => {
    setShowNewFolderModal(false);
    setPendingFolderName('');
  }, []);

  const handleSubmitNewFolder = () => {
    const trimmed = pendingFolderName.trim();
    if (!trimmed) {
      return;
    }
    onCreateFolder(trimmed);
    handleCloseFolderModal();
  };

  const handleStartRename = (folderId: string, deckId: string, currentName: string) => {
    setRenamingDeck({ folderId, deckId });
    setRenameValue(currentName);
  };

  const handleCancelRename = () => {
    setRenamingDeck(null);
    setRenameValue('');
  };

  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingDeck) {
      return;
    }
    onRenameDeck(renamingDeck.folderId, renamingDeck.deckId, renameValue);
    handleCancelRename();
  };

  const handleCopyDeckYdke = async (deck: SavedDeckEntry) => {
    const source = deck.deck.trim();
    let canonical = source;
    try {
      const parsed = parseYdke(source);
      canonical = buildYdke(parsed.main, parsed.extra, parsed.side);
    } catch {
      // fallback to raw string if not a valid YDKE
    }
    try {
      await navigator.clipboard.writeText(canonical);
      toast.success(`Copied ${deck.name} as YDKE URL.`);
    } catch {
      const confirmed = window.prompt('Copy this YDKE string manually:', canonical);
      if (confirmed !== null) {
        toast.success(`Copied ${deck.name} as YDKE URL.`);
      }
    }
  };

  const copyTextToClipboard = useCallback(async (text: string, successMessage: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Nothing to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(trimmed);
      toast.success(successMessage);
    } catch {
      const manual = window.prompt('Copy this list manually:', trimmed);
      if (manual !== null) {
        toast.success(successMessage);
      }
    }
  }, []);

  const buildDeckCardLists = useCallback(
    async (targetDecks: SavedDeckEntry[]): Promise<Array<{ deck: SavedDeckEntry; lines: string[] }> | null> => {
      if (targetDecks.length === 0) {
        toast.error('No decks available for export.');
        return null;
      }
      const parsedDecks: Array<{ deck: SavedDeckEntry; parsed: ParsedDeck }> = [];
      for (const deck of targetDecks) {
        try {
          parsedDecks.push({ deck, parsed: parseYdke(deck.deck) });
        } catch (error) {
          console.error('Unable to parse deck', deck.name, error);
          toast.error(`Unable to read ${deck.name}.`);
          return null;
        }
      }
      const idSet = new Set<number>();
      parsedDecks.forEach(({ parsed }) => {
        [...parsed.main, ...parsed.extra, ...parsed.side].forEach((id) => {
          if (id > 0) {
            idSet.add(id);
          }
        });
      });
      if (idSet.size === 0) {
        toast.error('No cards available for export.');
        return null;
      }
      let details: Record<number, CardDetails> = {};
      try {
        details = await fetchCardsByIds([...idSet]);
      } catch (error) {
        console.error('Card lookup failed', error);
        toast.error('Unable to load card details.');
        return null;
      }
      return parsedDecks.map(({ deck, parsed }) => {
        const counts = new Map<string, number>();
        [...parsed.main, ...parsed.extra, ...parsed.side].forEach((id) => {
          if (id <= 0) {
            return;
          }
          const card = details[id];
          const name = card?.name ?? `Card #${id}`;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        });
        const lines = [...counts.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, count]) => `${count} ${name}`);
        return { deck, lines };
      });
    },
    [],
  );

  const handleCopyDeckCardList = useCallback(
    async (deck: SavedDeckEntry) => {
      const result = await buildDeckCardLists([deck]);
      if (!result || result.length === 0) {
        return;
      }
      const lines = result[0].lines;
      if (lines.length === 0) {
        toast.error('No cards available for export.');
        return;
      }
      await copyTextToClipboard(lines.join('\n'), `Copied card list for ${deck.name}.`);
    },
    [buildDeckCardLists, copyTextToClipboard],
  );

  const handleCopyFolderCardList = useCallback(
    async (folder: SavedDeckFolder) => {
      if (folder.decks.length === 0) {
        toast.error('This folder has no decks.');
        return;
      }
      const result = await buildDeckCardLists(folder.decks);
      if (!result) {
        return;
      }
      const sections = result
        .map(({ deck, lines }) => {
          if (lines.length === 0) {
            return null;
          }
          return [`# ${deck.name}`, ...lines];
        })
        .filter(Boolean) as string[][];
      if (sections.length === 0) {
        toast.error('No cards available for export.');
        return;
      }
      const text = sections.map((lines) => lines.join('\n')).join('\n\n');
      await copyTextToClipboard(text, `Copied folder list for ${folder.name}.`);
    },
    [buildDeckCardLists, copyTextToClipboard],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const text = event.clipboardData?.getData('text') ?? '';
      const trimmed = text.trim();
      if (!trimmed.toLowerCase().includes('ydke://')) {
        return;
      }
      try {
        parseYdke(trimmed);
        onDeckInputChange(trimmed);
        onViewBreakdown();
      } catch {
        // Ignore invalid YDKE data so the user can paste regular text elsewhere.
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onDeckInputChange, onViewBreakdown]);

  const toggleFolderExpansion = useCallback(
    (folderId: string) => {
      setExpandedFolders((prev) => {
        const base = prev ?? readExpandedState();
        const next = { ...base };
        if (folderId in next) {
          next[folderId] = !next[folderId];
        } else {
          next[folderId] = false;
        }
        persistExpanded(next);
        console.log('[folders] toggle', folderId, next);
        return next;
      });
    },
    [persistExpanded],
  );

  const ensureFolderExpanded = useCallback(
    (folderId: string) => {
      setExpandedFolders((prev) => {
        const base = prev ?? readExpandedState();
        if (base[folderId]) {
          return prev ?? base;
        }
        const next = { ...base, [folderId]: true };
        persistExpanded(next);
        console.log('[folders] ensure open', folderId, next);
        return next;
      });
    },
    [persistExpanded],
  );

  useEffect(() => {
    setExpandedFolders((prev) => {
      if (prev === null) {
        console.log('[folders] sync skipped until hydration');
        return prev;
      }
      const next = { ...prev };
      let changed = false;
      savedFolders.forEach((folder) => {
        if (!(folder.id in next)) {
          next[folder.id] = true;
          changed = true;
        }
      });
      if (!changed) {
        return prev;
      }
      persistExpanded(next);
      console.log('[folders] sync with saved folders', next);
      return next;
    });
  }, [savedFolders, persistExpanded]);

  useEffect(() => {
    if (!folderMenu) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!folderMenuRef.current) {
        setFolderMenu(null);
        return;
      }
      if (!folderMenuRef.current.contains(event.target as Node)) {
        setFolderMenu(null);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFolderMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [folderMenu]);

  useEffect(() => {
    if (!showNewFolderModal) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseFolderModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNewFolderModal, handleCloseFolderModal]);

  const findDeckLocation = useCallback(
    (deckId: string): { folderId: string; index: number } | null => {
      for (const folder of savedFolders) {
        const index = folder.decks.findIndex((deck) => deck.id === deckId);
        if (index !== -1) {
          return { folderId: folder.id, index };
        }
      }
      return null;
    },
    [savedFolders],
  );

  const handleDragStartDnd = useCallback(
    (event: DragStartEvent) => {
      if (event.active.data.current?.type !== 'deck') {
        return;
      }
      setIsDraggingDeck(true);
      const location = findDeckLocation(event.active.id.toString());
      setDragPreviewLocation(location);
    },
    [findDeckLocation],
  );

  const handleDragEndDnd = useCallback(() => {
    setIsDraggingDeck(false);
    setDragPreviewLocation(null);
  }, []);

  const handleDragCancelDnd = useCallback(() => {
    setIsDraggingDeck(false);
    setDragPreviewLocation(null);
  }, []);

  const handleDragOverDnd = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !active.data.current?.folderId) {
        return;
      }
      const targetFolderId = over.data.current?.folderId as string | undefined;
      if (!targetFolderId) {
        return;
      }
      ensureFolderExpanded(targetFolderId);
      const targetFolder = savedFolders.find((folder) => folder.id === targetFolderId);
      if (!targetFolder) {
        return;
      }
      let targetIndex: number;
      if (over.data.current?.type === 'deck') {
        const overIndex = targetFolder.decks.findIndex((deck) => deck.id === over.id);
        targetIndex = overIndex === -1 ? targetFolder.decks.length : overIndex;
      } else {
        targetIndex = targetFolder.decks.length;
      }
      const currentLocation =
        dragPreviewLocation ?? findDeckLocation(active.id.toString()) ?? {
          folderId: active.data.current.folderId as string,
          index: targetIndex,
        };
      if (currentLocation.folderId === targetFolderId && currentLocation.index === targetIndex) {
        return;
      }
      onMoveDeck(currentLocation.folderId, active.id.toString(), targetFolderId, targetIndex);
      setDragPreviewLocation({ folderId: targetFolderId, index: targetIndex });
    },
    [dragPreviewLocation, ensureFolderExpanded, findDeckLocation, onMoveDeck, savedFolders],
  );

  return (
    <div
      className="relative mx-auto w-full max-w-3xl space-y-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="rounded-[32px] border border-cyan-400/60 bg-black/70 px-8 py-10 text-center text-cyan-100 shadow-lg">
            <p className="text-xl font-semibold uppercase tracking-[0.3em]">Drop deck file</p>
            <p className="mt-2 text-sm text-cyan-200">Drag a .ydk or .json file anywhere on the screen to import.</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <header className="flex h-full flex-col gap-3 rounded-[24px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-4 shadow-panel sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-cyan-200/80">Yu-Gi-Oh! Genesys</p>
              <h1 className="text-2xl font-semibold">Genesys helper</h1>
              <p className="text-sm text-slate-300">
                Paste a YDKE link, instantly check points, and share your build with a single link.
              </p>
            </div>
            <a
              href="/ygo-genesys-helper/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-slate-200 transition hover:border-white/60 hover:text-white"
              aria-label="Open Genesys helper home"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M10 14 21 3" />
                <path d="M21 10V3h-7" />
                <path d="M21 21H3V3" />
              </svg>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Last updated</p>
              <p className="text-sm font-semibold text-white">{formatTimestamp(genesysData.lastUpdated)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Tracked cards</p>
              <p className="text-sm font-semibold text-white">{genesysData.cards.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Powered by</p>
              <p className="text-sm font-semibold text-white">
                <a href="https://ygoprodeck.com/" target="_blank" rel="noreferrer" className="text-cyan-200 hover:underline">
                  YGOProDeck
                </a>
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-[24px] border border-white/10 bg-panel/90 p-4 shadow-panel sm:p-5">
          <div className="space-y-3 text-sm text-slate-200">
            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-cyan-200/80">Quick import</p>
            <h2 className="text-xl font-semibold text-white">Paste anywhere to load a deck</h2>
            <p className="text-sm text-slate-300">
              Press <span className="font-semibold text-white">Ctrl + V</span> (or Cmd + V) with a valid <code className="text-xs text-slate-200">ydke://</code> link. We'll auto-save it as{' '}
              <span className="font-semibold text-white">Untitled deck</span> and jump straight to the point breakdown. Drag-and-drop of .ydk/.json decks anywhere works too.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectDeckFile}
                className="flex flex-1 min-w-[180px] items-center justify-between rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-left text-sm font-medium text-white hover:border-white/35"
              >
                <span>Upload .ydk / .json</span>
                <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                onClick={handleScrollToLibrary}
                className="flex flex-1 min-w-[180px] items-center justify-between rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-left text-sm font-medium text-white hover:border-white/35"
              >
                <span>Go to saved library</span>
                <span aria-hidden="true">↓</span>
              </button>
            </div>
            {deckError && <p className="text-sm text-rose-300">{deckError}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ydk,.json,text/plain,application/json"
            className="sr-only"
            onChange={handleFileChange}
          />
        </section>
      </div>

      <section
        id="saved-decks-library"
        className="rounded-[24px] border border-white/10 bg-panel/90 p-4 shadow-panel space-y-4 sm:p-5"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStartDnd}
          onDragOver={handleDragOverDnd}
          onDragEnd={handleDragEndDnd}
          onDragCancel={handleDragCancelDnd}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-cyan-200/80">Library</p>
              <h2 className="text-xl font-semibold">Saved decks</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-2 font-semibold text-white hover:border-white/40"
                onClick={onExportSavedDecks}
              >
                Export
              </button>
              <label className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-white/25 px-4 py-2 font-semibold text-white/80 hover:border-white/40">
                Import
                <input type="file" accept="application/json,.json" className="sr-only" onChange={handleSavedLibraryChange} />
              </label>
              <button
                type="button"
                className="rounded-full border border-white/20 p-2 text-white hover:border-white/40"
                onClick={handleOpenFolderModal}
                aria-label="Create folder"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          {savedFolders.every((folder) => folder.decks.length === 0) ? (
            <p className="text-sm text-slate-400 rounded-2xl border border-white/10 bg-black/30 p-4">
              No saved decks yet. Any saved deck will appear here automatically.
            </p>
          ) : (
            savedFolders.map((folder, index) => {
              const isExpanded =
                expandedFolders === null ? true : folder.id in expandedFolders ? expandedFolders[folder.id] : true;
              return (
                <FolderContainer
                  key={folder.id}
                  folder={folder}
                  isDraggingDeck={isDraggingDeck}
                  className={index > 0 ? 'mt-3' : ''}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFolderExpansion(folder.id)}
                      className="flex items-center gap-2 text-left text-sm font-semibold text-white"
                      aria-expanded={isExpanded}
                    >
                      <ChevronIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      <span>
                        {folder.name} · {folder.decks.length} deck{folder.decks.length === 1 ? '' : 's'}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 relative">
                      <button
                        type="button"
                        className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 hover:border-white"
                        onClick={() => handleCopyFolderCardList(folder)}
                      >
                        TXT
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-white/20 p-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:border-white"
                        onClick={() =>
                          setFolderMenu((prev) => {
                            if (prev?.folderId === folder.id) {
                              folderMenuRef.current = null;
                              return null;
                            }
                            return { folderId: folder.id };
                          })
                        }
                        aria-haspopup="menu"
                        aria-expanded={folderMenu?.folderId === folder.id}
                      >
                        ⋯
                      </button>
                      {folderMenu?.folderId === folder.id && (
                        <div
                          ref={(node) => {
                            folderMenuRef.current = node;
                          }}
                          className="absolute right-0 top-full z-30 mt-2 rounded-2xl border border-white/10 bg-black/95 p-1 text-sm shadow-xl"
                        >
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-40"
                            onClick={() => {
                              onDeleteFolder(folder.id);
                              folderMenuRef.current = null;
                              setFolderMenu(null);
                            }}
                            disabled={folder.decks.length > 0 || savedFolders.length <= 1}
                          >
                            Delete folder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded &&
                    (folder.decks.length === 0 ? (
                      <p className="text-xs text-slate-500">Empty folder.</p>
                    ) : (
                      <SortableContext items={folder.decks.map((deck) => deck.id)} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-2">
                          {folder.decks.map((deck) => {
                            const isRenaming = renamingDeck?.folderId === folder.id && renamingDeck?.deckId === deck.id;
                            return (
                              <SortableDeckRow
                                key={deck.id}
                                deck={deck}
                                folderId={folder.id}
                                isRenaming={isRenaming}
                                renameValue={renameValue}
                                onRenameChange={(value) => setRenameValue(value)}
                                onRenameSubmit={handleRenameSubmit}
                                onCancelRename={handleCancelRename}
                              onLoad={() => onLoadSavedDeck(folder.id, deck.id)}
                              onRenameStart={() => handleStartRename(folder.id, deck.id, deck.name)}
                              onDelete={() => onDeleteSavedDeck(folder.id, deck.id)}
                              onCopy={() => handleCopyDeckYdke(deck)}
                              onCopyList={() => handleCopyDeckCardList(deck)}
                            />
                          );
                        })}
                      </ul>
                      </SortableContext>
                    ))}
                </FolderContainer>
              );
            })
          )}
        </DndContext>
      </section>

      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={handleCloseFolderModal}>
          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New folder</h3>
              <button
                type="button"
                className="text-2xl text-slate-300 hover:text-white"
                onClick={handleCloseFolderModal}
                aria-label="Close new folder modal"
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-400">Add a folder to organize decks before saving.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmitNewFolder();
              }}
            >
              <input
                type="text"
                value={pendingFolderName}
                onChange={(event) => setPendingFolderName(event.target.value)}
                placeholder="Folder name"
                autoFocus
                className="mt-4 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/40"
                  onClick={handleCloseFolderModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
                  disabled={!pendingFolderName.trim()}
                >
                  Create folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
