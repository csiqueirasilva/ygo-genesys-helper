import { useState, useEffect, useRef } from 'react';
import type { CardDetails } from '../types';
import { searchCards } from '../lib/ygoprodeck';

interface CardSearchModalProps {
  onClose: () => void;
  onAddCard: (card: CardDetails) => void;
}

export function CardSearchModal({ onClose, onAddCard }: CardSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const { cards } = await searchCards({ query, pageSize: 20 });
      setResults(cards);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        className="w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden rounded-[32px] border border-white/10 bg-panel shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Add Card to Deck</h2>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white">×</button>
          </div>
          
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search card name..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-white outline-none focus:border-cyan-500/50"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 rounded-xl bg-cyan-500 px-4 py-1.5 text-sm font-bold text-slate-900 hover:bg-cyan-400"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400">Searching cards...</div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.map(card => (
                <button
                  key={card.id}
                  onClick={() => {
                    onAddCard(card);
                    // We don't close, so user can add multiple
                  }}
                  className="group relative flex flex-col gap-2 rounded-xl border border-white/5 bg-white/5 p-2 text-left transition hover:border-cyan-500/30 hover:bg-white/10"
                >
                  <div className="aspect-[0.7] overflow-hidden rounded-lg bg-slate-800">
                    <img src={card.image} alt={card.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="truncate text-xs font-semibold text-slate-200">{card.name}</p>
                  <div className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-slate-900 opacity-0 group-hover:opacity-100 shadow-lg">
                    +
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500">
              {query ? 'No cards found.' : 'Type a name above to find cards.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
