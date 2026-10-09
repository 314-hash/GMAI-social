import React, { useState } from 'react';
import {
  X,
  Search,
  Lock,
  Globe,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useWallet } from '../contexts/WalletContext';
import { RoomCategory } from '../types/chat';
import { shortenAddress, formatGmaiBalance } from '../utils/formatters';

interface DiscoverRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
  onOpenCreateModal: () => void;
}

export const DiscoverRoomsModal: React.FC<DiscoverRoomsModalProps> = ({
  isOpen,
  onClose,
  onSelectRoom,
  onOpenCreateModal,
}) => {
  const { rooms } = useChat();
  const { balanceInfo } = useWallet();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'public' | 'gated'>('all');

  if (!isOpen) return null;

  const numericBal = parseFloat(balanceInfo.formatted || '0');

  const filteredRooms = rooms.filter(room => {
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        room.name.toLowerCase().includes(q) ||
        room.description.toLowerCase().includes(q) ||
        room.slug.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category
    if (selectedCat !== 'all' && room.category !== selectedCat) {
      return false;
    }

    // Access
    if (accessFilter === 'public' && room.isTokenGated) return false;
    if (accessFilter === 'gated' && !room.isTokenGated) return false;

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-2xl bg-gmai-surface border border-cyan-500/30 shadow-[0_0_60px_rgba(0,0,0,0.85)] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/15 flex items-center justify-between">
          <div>
            <h2 className="font-gaming text-base sm:text-lg font-bold text-white tracking-wider flex items-center gap-2">
              <span>EXPLORE MINDVERSE ROOMS</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {rooms.length} Channels
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Discover and join gaming, AI development, and token-gated holder channels
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-cyan-500/15 bg-slate-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, description, or #tag..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Access Toggle */}
            <div className="flex rounded-xl bg-slate-950/80 border border-slate-800 p-1 text-xs">
              <button
                onClick={() => setAccessFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  accessFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAccessFilter('public')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  accessFilter === 'public' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'
                }`}
              >
                Public
              </button>
              <button
                onClick={() => setAccessFilter('gated')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  accessFilter === 'gated' ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Gated</span>
              </button>
            </div>
          </div>

          {/* Categories Horizontal Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['all', 'gaming', 'ai-agents', 'metaverse', 'guilds', 'trading', 'development', 'general'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-all ${
                  selectedCat === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {cat.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-slate-400">No rooms match your search query.</p>
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500"
              >
                Create a New Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredRooms.map(room => {
                const isEligible = numericBal >= room.minGmaiBalance;

                return (
                  <div
                    key={room.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group hover:shadow-[0_0_20px_rgba(0,240,255,0.08)]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          {room.category}
                        </span>
                        {room.isTokenGated ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{room.minGmaiBalance.toLocaleString()} GMAI</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Public</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                        {room.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {room.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        by @{room.creatorUsername}
                      </span>

                      <button
                        onClick={() => {
                          onSelectRoom(room.id);
                          onClose();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          !room.isTokenGated || isEligible
                            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{room.isTokenGated && !isEligible ? 'View Gated' : 'Join Room'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
