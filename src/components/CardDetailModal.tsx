import type { DeckCardGroup, CardDetails } from '../types';
import { formatCardTypeLabel } from '../lib/strings';

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

  const cardLink = details?.ygoprodeckUrl || buildCardDbUrl(card.name);
  const cardLinkLabel = `View in Yu-Gi-Oh! DB ↗`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-[28px] border border-white/10 bg-panel/95 p-5 shadow-panel touch-pan-y"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close card details"
          className="absolute right-4 top-4 text-2xl text-slate-300 transition hover:text-white"
        >
          ×
        </button>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="mx-auto w-52 overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:mx-0 md:h-auto md:self-center">
            {details?.image || card.image ? (
              <img
                src={details?.image ?? card.image}
                alt={card.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-400">No art</div>
            )}
          </div>
          <div className="flex-1 space-y-3 pt-8 md:pt-0">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              {card.zone === 'main' ? 'Main Deck' : card.zone === 'extra' ? 'Extra Deck' : 'Side Deck'}
            </p>
            <h2 className="text-2xl font-semibold text-white">{card.name}</h2>
            <p className="text-sm text-slate-400">
              {formatCardTypeLabel(
                details?.type ?? card.type,
                details?.race ?? card.race,
              )}
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">{formatCardText(details?.desc ?? card.desc)}</p>
            {cardLink && (
              <a className="text-sm font-semibold text-cyan-300 hover:underline" href={cardLink} target="_blank" rel="noreferrer">
                {cardLinkLabel}
              </a>
            )}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                <p className="text-xs text-slate-400">Copies</p>
                <p className="text-lg font-semibold text-white">×{card.count}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                <p className="text-xs text-slate-400">Points/copy</p>
                <p className="text-lg font-semibold text-white">{card.pointsPerCopy}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                <p className="text-xs text-slate-400">Total pts</p>
                <p className="text-lg font-semibold text-white">{card.totalPoints}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
