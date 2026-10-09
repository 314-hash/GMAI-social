import React, { useState } from 'react';
import {
  MessageSquare,
  Compass,
  PlusCircle,
  Lock,
  Globe,
  Sparkles,
  Bot,
  Gamepad2,
  TrendingUp,
  FolderGit2,
  Users,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useWallet } from '../contexts/WalletContext';
import { ChatRoom, RoomCategory } from '../types/chat';
import { GMAI_TOKEN_CONFIG, SIDRA_CHAIN_CONFIG } from '../config/blockchain';
import { formatGmaiBalance } from '../utils/formatters';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateModal: () => void;
  onOpenDiscoverModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenCreateModal,
  onOpenDiscoverModal,
}) => {
  const { rooms, activeRoom, setActiveRoomId, unreadCounts, onlineUsers } = useChat();
  const { address, balanceInfo, isAuthenticated } = useWallet();

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'gated'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const numericBal = parseFloat(balanceInfo.formatted || '0');
  const canCreate = numericBal >= GMAI_TOKEN_CONFIG.minCreateRoomBalance;

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = room.name.toLowerCase().includes(q) || room.description.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Tab filter
    if (activeTab === 'my') {
      if (!address || room.creatorAddress.toLowerCase() !== address.toLowerCase()) {
        return false;
      }
    } else if (activeTab === 'gated') {
      if (!room.isTokenGated) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && room.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const getCategoryIcon = (category: RoomCategory) => {
    switch (category) {
      case 'gaming':
        return <Gamepad2 className="w-3.5 h-3.5 text-pink-400" />;
      case 'ai-agents':
        return <Bot className="w-3.5 h-3.5 text-cyan-400" />;
      case 'trading':
        return <TrendingUp className="w-3.5 h-3.5 text-amber-400" />;
      case 'metaverse':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 flex flex-col bg-gmai-surface border-r border-cyan-500/15 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Banner Card */}
        <div className="p-3 border-b border-cyan-500/15">
          <div className="relative rounded-xl overflow-hidden border border-cyan-500/30 group">
            <img
              src="/assets/gmai-banner.png"
              alt="GameMind AI Metaverse"
              className="w-full h-24 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-2.5">
              <span className="font-gaming text-xs font-bold text-cyan-300 tracking-wider">
                MINDVERSE COMMUNITy
              </span>
              <p className="text-[10px] text-slate-300">
                P2P Chatrooms on Sidra Chain
              </p>
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="p-3 space-y-2 border-b border-cyan-500/15">
          <button
            onClick={() => {
              setActiveRoomId('general');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeRoom?.id === 'general'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Community Chat</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Public
            </span>
          </button>

          <button
            onClick={() => {
              onOpenDiscoverModal();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Discover Rooms</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {rooms.length} rooms
            </span>
          </button>

          {/* Create Chatroom Button */}
          <div className="pt-1">
            <button
              onClick={() => {
                onOpenCreateModal();
                onClose();
              }}
              className={`w-full group relative overflow-hidden flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                canCreate
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-800/80 text-slate-300 border border-amber-500/30 hover:border-amber-500/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <PlusCircle className={`w-4 h-4 ${canCreate ? 'text-white' : 'text-amber-400'}`} />
                <span>Create Chatroom</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                canCreate
                  ? 'bg-black/30 text-cyan-200 border border-white/20'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                500K GMAI
              </span>
            </button>
            {!canCreate && isAuthenticated && (
              <p className="mt-1 text-[10px] text-amber-400/80 text-center flex items-center justify-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Hold 500k GMAI to unlock room creation</span>
              </p>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-3 pt-3">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-1 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('gated')}
              className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === 'gated'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Gated</span>
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`py-1 rounded-lg transition-all ${
                activeTab === 'my'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Rooms
            </button>
          </div>
        </div>

        {/* Room Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-500 tracking-wider flex items-center justify-between">
            <span>CHANNELS ({filteredRooms.length})</span>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-500 text-xs">
              No chatrooms found for this filter.
            </div>
          ) : (
            filteredRooms.map(room => {
              const isActive = activeRoom?.id === room.id;
              const unread = unreadCounts[room.id] || 0;
              const userEligible = numericBal >= room.minGmaiBalance;

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoomId(room.id);
                    onClose();
                  }}
                  className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">{getCategoryIcon(room.category)}</span>
                    <div className="flex flex-col text-left truncate">
                      <span className="truncate font-medium">{room.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate">
                        #{room.slug}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {room.isTokenGated && (
                      <span
                        title={`Requires ${room.minGmaiBalance.toLocaleString()} GMAI`}
                        className={`p-1 rounded-md text-[10px] flex items-center gap-0.5 ${
                          userEligible
                            ? 'text-cyan-400 bg-cyan-500/10'
                            : 'text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white animate-pulse">
                        {unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Online Members Quick Bar */}
        <div className="p-3 border-t border-cyan-500/15 bg-slate-950/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Community</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {Math.max(onlineUsers.length, 1)} Online
            </span>
          </div>

          {/* Sidra Chain Contract Footnote */}
          <a
            href={`${SIDRA_CHAIN_CONFIG.explorerUrl}/token/${GMAI_TOKEN_CONFIG.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 text-[10px] text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>$GMAI on Sidra Chain</span>
            </div>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </aside>
    </>
  );
};
