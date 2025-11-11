import type { GenesysPayload } from '../types';
import { formatTimestamp } from '../lib/strings.ts';

interface ImportScreenProps {
  genesysData: GenesysPayload;
  deckInput: string;
  deckError: string | null;
  hasDeck: boolean;
  onDeckInputChange: (value: string) => void;
  onViewBreakdown: () => void;
}

export function ImportScreen({
  genesysData,
  deckInput,
  deckError,
  hasDeck,
  onDeckInputChange,
  onViewBreakdown,
}: ImportScreenProps) {
  return (
    <div className="space-y-4">
      <header className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-6 shadow-panel flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">Yu-Gi-Oh! Genesys</p>
          <div>
            <h1 className="text-3xl font-semibold">Genesys helper</h1>
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
      </section>
    </div>
  );
}
