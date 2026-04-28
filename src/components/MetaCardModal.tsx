import { useMemo } from 'react';
import type { MetaData, Format } from '../types.ts';
import metaDataPayload from '../data/meta-data.json';

const metaData = metaDataPayload as MetaData;

interface MetaCardModalProps {
  cardId: number;
  format: Format;
  onClose: () => void;
}

export function MetaCardModal({ cardId, format, onClose }: MetaCardModalProps) {
  const cardMeta = metaData.popularCards[cardId.toString()];

  const synergy = useMemo(() => {
    if (!cardMeta) return [];

    const allPopular = Object.entries(metaData.popularCards);
    let related: Array<[string, any]> = [];

    if (cardMeta.archetype) {
      // Find cards in the same archetype
      related = allPopular.filter(([id, data]) => 
        id !== cardId.toString() && data.archetype === cardMeta.archetype
      );
    } 
    
    if (related.length < 3) {
      // If it's a staple or we need more cards, add other top staples
      const staples = allPopular.filter(([id, data]) => 
        id !== cardId.toString() && data.staple && !related.some(r => r[0] === id)
      );
      related = [...related, ...staples];
    }

    // Sort by popularity (viewsweek)
    related.sort((a, b) => b[1].viewsweek - a[1].viewsweek);

    return related.slice(0, 3).map(([id, data]) => ({
      id: parseInt(id),
      name: data.name,
      viewsweek: data.viewsweek,
      staple: data.staple
    }));
  }, [cardId, cardMeta]);

  if (!cardMeta) return null;

  const upvoteRatio = cardMeta.upvotes + cardMeta.downvotes > 0
    ? Math.round((cardMeta.upvotes / (cardMeta.upvotes + cardMeta.downvotes)) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/10 bg-panel shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-32 bg-gradient-to-br from-cyan-600/20 to-blue-900/40 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.4em] text-cyan-400">Card Meta Analysis</p>
              <h2 className="text-2xl font-bold text-white leading-tight">{cardMeta.name}</h2>
            </div>
            <button 
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-2xl text-white transition hover:bg-white/10"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-500 mb-1">Weekly Views</p>
              <p className="text-2xl font-black text-cyan-400">↑{cardMeta.viewsweek}</p>
              <p className="text-[0.6rem] text-slate-400 mt-1">Active interest</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-500 mb-1">Global Approval</p>
              <p className="text-2xl font-black text-emerald-400">{upvoteRatio}%</p>
              <p className="text-[0.6rem] text-slate-400 mt-1">{cardMeta.upvotes} Upvotes</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">Why it is Meta?</h3>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-200">
              {cardMeta.staple ? (
                <p>Recognized as a <strong className="text-cyan-300 font-bold">Global Staple</strong>. This card provides high utility across multiple deck types and is consistently used in competitive play.</p>
              ) : cardMeta.viewsweek > 500 ? (
                <p>Currently <strong className="text-cyan-300 font-bold">Trending High</strong>. This card is receiving significant attention this week, often indicating a shift in the meta or a new combo discovery.</p>
              ) : (
                <p>Considered a <strong className="text-cyan-300 font-bold">Format Specific Pick</strong>. It shows consistent usage in specific archetypes or as a counter-pick in the current {format === 'genesys' ? 'Genesys' : 'TCG'} environment.</p>
              )}
            </div>
          </div>

          {synergy.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">Commonly used with:</h3>
              <div className="grid gap-2">
                {synergy.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{s.name}</span>
                      <span className="text-[0.6rem] text-slate-400 uppercase tracking-wider">
                        {s.staple ? 'Global Staple' : 'Archetype Synergy'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[0.7rem] font-bold text-cyan-400">↑{s.viewsweek}</span>
                      <p className="text-[0.5rem] text-slate-500 uppercase tracking-tighter">Views/wk</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-center text-[0.6rem] text-slate-500 italic">
            Live statistics synced from YGOPRODeck global database.
          </p>
        </div>
      </div>
    </div>
  );
}
