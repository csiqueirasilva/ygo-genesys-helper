import type { ChangeEvent } from 'react';
import type { GenesysPayload } from '../types';
import { formatTimestamp } from '../lib/strings.ts';

interface ImportScreenProps {
  genesysData: GenesysPayload;
  deckInput: string;
  deckError: string | null;
  hasDeck: boolean;
  onDeckInputChange: (value: string) => void;
  onViewBreakdown: () => void;
  onImportYdkFile: (file: File) => void;
}

export function ImportScreen({
  genesysData,
  deckInput,
  deckError,
  hasDeck,
  onDeckInputChange,
  onViewBreakdown,
  onImportYdkFile,
}: ImportScreenProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportYdkFile(file);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <header className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-6 shadow-panel flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Yu-Gi-Oh! Genesys</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">Genesys helper</h1>
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
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Paste your YDKE link, get instant point totals, see which cards consume the most points, and share your build
              with a single link.
            </p>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <p>
              Data powered by{' '}
              <a href="https://ygoprodeck.com/" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                YGOProDeck
              </a>
            </p>
            <p>
              <a href="https://www.yugioh-card.com/en/genesys/" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                Genesys list
              </a>{' '}
              last updated
            </p>
            <p className="text-lg font-semibold text-white">{formatTimestamp(genesysData.lastUpdated)}</p>
            <p>{genesysData.cards.length} tracked cards</p>
          </div>
        </div>
      </header>

      <section className="rounded-[28px] border border-white/10 bg-panel/90 p-5 shadow-panel space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">1. Paste your YDKE deck</h2>
          <span className="text-sm text-slate-400">Example: ydke://AAA..!BBB..!CCC!</span>
        </div>
        <textarea
          spellCheck={false}
          placeholder="ydke://..."
          className="w-full min-h-[140px] rounded-2xl border border-white/10 bg-black/40 p-4 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          value={deckInput}
          onChange={(event) => onDeckInputChange(event.target.value)}
        />
        {deckError && <p className="text-sm text-rose-300">{deckError}</p>}
        {!deckError && !hasDeck && (
          <p className="text-sm text-slate-400">Your point breakdown will appear as soon as we detect a valid YDKE link.</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            className="rounded-full bg-gradient-to-r from-accent to-accentSecondary px-6 py-3 text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!hasDeck || Boolean(deckError)}
            onClick={onViewBreakdown}
          >
            View point breakdown
          </button>
          <small className="text-xs text-slate-400">Requires a valid YDKE link.</small>
        </div>
        <div className="flex flex-col gap-1">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-dashed border-white/20 px-6 py-3 text-sm font-medium text-slate-200 hover:border-white/40">
            <span>Import deck from .ydk file</span>
            <input type="file" accept=".ydk,text/plain" className="sr-only" onChange={handleFileChange} />
          </label>
          <small className="text-xs text-slate-400">We’ll convert YDK files into YDKE automatically.</small>
        </div>
      </section>
    </div>
  );
}
