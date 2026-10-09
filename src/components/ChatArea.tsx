import React, { useRef, useEffect, useState } from 'react';
import {
  Lock,
  Globe,
  Info,
  Pin,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  Gamepad2,
  Users,
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useWallet } from '../contexts/WalletContext';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { GMAI_TOKEN_CONFIG } from '../config/blockchain';
import { formatGmaiBalance } from '../utils/formatters';

interface ChatAreaProps {
  onToggleDetails: () => void;
  isDetailsOpen: boolean;
  onOpenAuthModal: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onToggleDetails,
  isDetailsOpen,
  onOpenAuthModal,
  onShowToast,
}) => {
  const {
    activeRoom,
    messages,
    reactMessage,
    removeMessage,
    pinMessage,
    blockUser,
    isGatedLocked,
    activeRoomMinBalance,
    onlineUsers,
  } = useChat();

  const { address, balanceInfo } = useWallet();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const isRoomCreator = !!(
    address &&
    activeRoom &&
    activeRoom.creatorAddress.toLowerCase() === address.toLowerCase()
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, showScrollBottom]);

  // Handle scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const pinnedMessages = messages.filter(m => m.isPinned && !m.isDeleted);

  return (
    <main className="flex-1 flex flex-col h-full min-w-0 bg-gmai-dark relative">
      {/* Top Room Banner / Header */}
      <div className="px-4 py-3 border-b border-cyan-500/15 bg-gmai-surface/70 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate">
                {activeRoom?.name || 'General Community'}
              </h1>
              <span className="text-[11px] font-mono text-cyan-400 shrink-0">
                #{activeRoom?.slug || 'general'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 truncate max-w-lg">
              {activeRoom?.description || 'Official GameMind AI chatroom'}
            </p>
          </div>
        </div>

        {/* Room Header Status & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {activeRoom?.isTokenGated ? (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                isGatedLocked
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
              title={`Requires ${activeRoom.minGmaiBalance.toLocaleString()} GMAI`}
            >
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">
                {formatGmaiBalance(activeRoom.minGmaiBalance)} GMAI
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>Public</span>
            </div>
          )}

          <button
            onClick={onToggleDetails}
            className={`p-2 rounded-xl border transition-all ${
              isDetailsOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
            title="Toggle Room Information"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2 truncate">
            <Pin className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="font-semibold shrink-0">Pinned Announcement:</span>
            <span className="truncate text-slate-200">
              {pinnedMessages[pinnedMessages.length - 1].text}
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono shrink-0 ml-2">
            by @{pinnedMessages[pinnedMessages.length - 1].senderUsername}
          </span>
        </div>
      )}

      {/* Message Feed Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-2 relative"
      >
        {/* Welcome Hero inside Room */}
        <div className="p-4 sm:p-6 mb-4 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <img
              src="/assets/gmai-warrior.jpg"
              alt="Cyber Warrior"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.3)] shrink-0"
            />
            <div className="space-y-1 text-center sm:text-left">
              <span className="font-gaming text-xs text-cyan-400 tracking-wider">
                WELCOME TO #{activeRoom?.slug || 'chat'}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {activeRoom?.name}
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                {activeRoom?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Messages List */}
        {messages.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-slate-500">
            <Gamepad2 className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No transmissions yet in #{activeRoom?.slug}.</p>
            <p className="text-[11px] text-slate-600">
              Transmit the first real-time message to initialize the node!
            </p>
          </div>
        ) : (
          messages.map(message => (
            <MessageItem
              key={message.id}
              message={message}
              isRoomCreator={isRoomCreator}
              onReact={reactMessage}
              onDelete={removeMessage}
              onPin={pinMessage}
              onBlockUser={blockUser}
              onShowToast={onShowToast}
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll To Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg hover:bg-cyan-400 transition-all animate-bounce"
        >
          <ChevronDown className="w-4 h-4" />
          <span>New Messages</span>
        </button>
      )}

      {/* Bottom Message Input */}
      <MessageInput
        onOpenAuthModal={onOpenAuthModal}
        onShowToast={onShowToast}
      />
    </main>
  );
};
