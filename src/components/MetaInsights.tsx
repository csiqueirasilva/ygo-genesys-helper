import { useMemo } from 'react';
import type { DeckGroups, MetaData, Format } from '../types.ts';
import metaDataPayload from '../data/meta-data.json';

const metaData = metaDataPayload as MetaData;

interface MetaInsightsProps {
  deckGroups: DeckGroups | null;
  format: Format;
}

export function MetaInsights({ deckGroups, format }: MetaInsightsProps) {
  const analysis = useMemo(() => {
    if (!deckGroups) return null;

    const allDeckCards = [...deckGroups.main, ...deckGroups.extra, ...deckGroups.side];
    
    let stapleCount = 0;
    let highMetaCount = 0;
    const matchedArchetypes = new Set<string>();
    
    const deckPopularity: Array<{ name: string; viewsweek: number; staple: boolean }> = [];

    allDeckCards.forEach(card => {
      const meta = metaData.popularCards[card.id.toString()];
      if (meta) {
        if (meta.staple) stapleCount++;
        if (meta.viewsweek > 1000) highMetaCount++;
        
        // Advanced format specific meta filters could go here
        const isRelevantPopularity = format === 'genesys' || (meta.formats && meta.formats.includes('TCG'));
        
        if (isRelevantPopularity) {
          if (meta.archetype) matchedArchetypes.add(meta.archetype);
          deckPopularity.push({ name: card.name, viewsweek: meta.viewsweek, staple: meta.staple });
        }
      }
    });

    // Sort by popularity
    deckPopularity.sort((a, b) => b.viewsweek - a.viewsweek);

    const recentDecks = format === 'genesys' ? metaData.genesys.recentDecks : metaData.advanced.recentDecks;

    // Find similarity with recent meta decks
    const metaMatches = recentDecks.map(metaDeck => {
      const isArchetypeMatch = matchedArchetypes.has(metaDeck.name.split(' ')[0]);
      return { ...metaDeck, isArchetypeMatch };
    });

    return {
      staplePercent: Math.round((stapleCount / allDeckCards.length) * 100),
      metaPercent: Math.round((highMetaCount / allDeckCards.length) * 100),
      topPopularCards: deckPopularity.slice(0, 5),
      metaMatches: metaMatches.slice(0, 6),
      totalCards: allDeckCards.length
    };
  }, [deckGroups, format]);

  if (!analysis) return null;

  const formatLabel = format === 'genesys' ? 'Genesys' : 'Advanced';
  const formatUrl = format === 'genesys' 
    ? "https://ygoprodeck.com/category/format/tournament%20meta%20decks%20(genesys)"
    : "https://ygoprodeck.com/category/format/tournament%20meta%20decks";

  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-panel/90 p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">{formatLabel} Insights</p>
          <h3 className="text-xl font-semibold text-white">Market & Meta Alignment</h3>
        </div>
        <div className="text-right">
          <p className="text-[0.6rem] uppercase tracking-wider text-slate-400">Last Meta Update</p>
          <p className="text-xs font-medium text-slate-300">{new Date(metaData.lastUpdated).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
          <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Deck Composition</p>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-300">Meta Staples</span>
                <span className="font-bold text-emerald-400">{analysis.staplePercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${analysis.staplePercent}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-300">High Demand Cards (Views)</span>
                <span className="font-bold text-cyan-400">{analysis.metaPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-cyan-500 transition-all" style={{ width: `${analysis.metaPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
          <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Top Trending in your Deck</p>
          <div className="flex flex-wrap gap-2">
            {analysis.topPopularCards.map(card => (
              <span key={card.name} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[0.65rem] font-medium text-slate-200">
                {card.name}
                <span className="text-[0.55rem] text-cyan-400">↑{card.viewsweek}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Similar Recent Meta Builds ({formatLabel})</p>
          <a
            href={formatUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[0.6rem] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            Browse All Decks ↗
          </a>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.metaMatches.length > 0 ? analysis.metaMatches.map((deck, idx) => (
            <a
              key={idx}
              href={deck.url}
              target="_blank"
              rel="noreferrer"
              className={`group block rounded-xl border p-3 transition ${
                deck.isArchetypeMatch 
                  ? 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10' 
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="truncate text-sm font-semibold text-slate-100 group-hover:text-white">{deck.name}</h4>
                {deck.isArchetypeMatch && (
                  <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[0.55rem] font-bold text-cyan-300">MATCH</span>
                )}
              </div>
              <p className="mt-1 text-[0.65rem] leading-tight text-slate-400">{deck.meta}</p>
            </a>
          )) : (
            <p className="col-span-full py-4 text-center text-xs text-slate-500">No recent tournament data found for this format.</p>
          )}
        </div>
      </div>
      
      <p className="text-center text-[0.6rem] text-slate-500 italic">
        Data provided by YGOPRODeck. Popularity based on weekly database views.
      </p>
    </section>
  );
}

