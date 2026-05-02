import type { DeckCardGroup, CardDetails } from '../types';

interface CardDetailModalProps {
  card: DeckCardGroup;
  details: CardDetails | null;
  onClose: () => void;
}

export function CardDetailModal({ card, details, onClose }: CardDetailModalProps) {
  const formatCardText = (text?: string) => {
    if (!text) return 'No description available.';
    return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const cardDesc = details?.desc ?? card.desc;
  
  const buildCardDbUrl = (name: string) => {
    const params = new URLSearchParams({
      ope: '1',
      sess: '1',
      rp: '10',
      keyword: name,
      stype: '1',
      request_locale: 'en',
    });
    return `https://www.db.yugioh-card.com/yugiohdb/card_search.action?${params.toString()}`;
  };

  const cardLink = details?.ygoprodeckUrl ?? card.linkUrl ?? buildCardDbUrl(card.name);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex max-h-[95vh] w-full max-w-4xl flex-col gap-6 overflow-hidden rounded-[32px] border border-white/10 bg-panel/95 p-6 shadow-2xl md:flex-row md:items-stretch"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4 md:w-1/3">
          <div className="relative aspect-[0.68] w-full max-w-[260px] overflow-hidden rounded-2xl border border-white/5 bg-slate-900 shadow-2xl">
            {card.fullImage ? (
              <img src={card.fullImage} alt={card.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm uppercase tracking-widest text-slate-500">
                Image pending
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-black text-white">{card.pointsPerCopy}</span>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-cyan-200">
                  Genesys Pts
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[260px]">
            <a
              href={cardLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-full bg-white/5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:bg-white/15 hover:text-white"
            >
              View in Database ↗
            </a>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-2">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold leading-tight text-white">{card.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
                    <span className="text-cyan-200">{card.displayType}</span>
                    {card.level && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-amber-400">★</span>
                        {card.level}
                      </span>
                    )}
                    {card.linkValue && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-cyan-400">LINK</span>
                        {card.linkValue}
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-3xl text-slate-400 transition hover:text-white" onClick={onClose}>
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/5 bg-black/40 p-5">
              <div className="prose prose-invert max-w-none text-slate-200">
                <p className="whitespace-pre-wrap text-sm leading-relaxed tracking-wide">
                  {formatCardText(cardDesc)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                In this deck:
              </span>
              <span className="text-2xl font-bold text-white">
                {card.count} copy{card.count === 1 ? '' : 'ies'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cyan-200/60">
                Subtotal
              </p>
              <p className="text-3xl font-black text-cyan-200">{card.totalPoints} pts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
