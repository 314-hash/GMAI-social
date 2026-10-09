import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Pin, 
  Trash2, 
  Smile, 
  MoreVertical,
  VolumeX,
} from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { useWallet } from '../contexts/WalletContext';
import { shortenAddress, formatTimestamp } from '../utils/formatters';

interface MessageItemProps {
  message: ChatMessage;
  isRoomCreator: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string, currentStatus: boolean) => void;
  onBlockUser: (address: string) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const AVAILABLE_REACTIONS = ['👍', '🚀', '🎮', '🔥', '💎', '❤️'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isRoomCreator,
  onReact,
  onDelete,
  onPin,
  onBlockUser,
  onShowToast,
}) => {
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!message || !message.text) return null;

  const senderAddr = message.senderAddress || '';
  const isMyMessage = Boolean(
    address && senderAddr && senderAddr.toLowerCase() === address.toLowerCase()
  );

  const copyAddress = async () => {
    if (!senderAddr) return;
    try {
      await navigator.clipboard.writeText(senderAddr);
      setCopied(true);
      onShowToast('Sender address copied!', 'info');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not access clipboard', 'error');
    }
  };

  if (message.isDeleted) {
    return (
      <div className="py-2 px-4 rounded-xl bg-slate-900/30 border border-slate-800/40 text-slate-500 text-xs italic">
        Message removed by moderator.
      </div>
    );
  }

  // Reactions calculations safely guarding against Gun's internal `_` node
  const reactionsMap = (typeof message.reactions === 'object' && message.reactions !== null)
    ? message.reactions
    : {};

  const reactionEntries = Object.entries(reactionsMap).filter(
    ([key, users]) => key !== '_' && Array.isArray(users) && users.length > 0
  );

  return (
    <div
      className={`group relative flex gap-3 px-3 sm:px-4 py-2.5 rounded-2xl transition-all duration-200 ${
        message.isPinned
          ? 'bg-amber-500/5 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
          : isMyMessage
          ? 'bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10'
          : 'hover:bg-slate-800/40 border border-transparent'
      }`}
    >
      {/* Sender Avatar */}
      <div className="shrink-0 pt-0.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
          isMyMessage
            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950'
            : 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
        }`}>
          {message.senderUsername?.charAt(0) || 'U'}
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        {/* Header: Username, Address, Timestamp, Pin status */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold ${isMyMessage ? 'text-cyan-300' : 'text-purple-300'}`}>
              @{message.senderUsername || 'Anonymous'}
            </span>

            {/* Address Pill */}
            {senderAddr && (
              <button
                type="button"
                onClick={copyAddress}
                className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
                title="Click to copy full address"
              >
                <span>{shortenAddress(senderAddr)}</span>
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
            )}

            <span className="text-[10px] text-slate-500">
              {formatTimestamp(message.timestamp)}
            </span>

            {message.isPinned && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                <Pin className="w-2.5 h-2.5" />
                <span>Pinned</span>
              </span>
            )}
          </div>

          {/* Quick Action Bar (Visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {/* Reaction Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                title="Add Reaction"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {/* Reaction Picker Popover */}
              {showPicker && (
                <div
                  className="absolute right-0 top-6 z-20 flex gap-1 p-1 rounded-xl bg-slate-900 border border-cyan-500/30 shadow-xl"
                  onMouseLeave={() => setShowPicker(false)}
                >
                  {AVAILABLE_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onReact(message.id, emoji);
                        setShowPicker(false);
                      }}
                      className="p-1 hover:scale-125 transition-transform text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Moderation Menu */}
            {(isRoomCreator || (!isMyMessage && address)) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 top-6 z-20 w-36 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-xl text-xs"
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    {isRoomCreator && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onPin(message.id, Boolean(message.isPinned));
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-300 hover:text-amber-400 hover:bg-slate-800/80"
                        >
                          <Pin className="w-3.5 h-3.5 text-amber-400" />
                          <span>{message.isPinned ? 'Unpin' : 'Pin Message'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(message.id);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}

                    {!isMyMessage && senderAddr && (
                      <button
                        type="button"
                        onClick={() => {
                          onBlockUser(senderAddr);
                          setShowMenu(false);
                          onShowToast(`Blocked user @${message.senderUsername}`, 'info');
                        }}
                        className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                        <span>Mute / Block</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message Content Text */}
        <div className="text-xs sm:text-sm text-slate-200 leading-relaxed break-words whitespace-pre-wrap selection:bg-cyan-500 selection:text-black">
          {message.text}
        </div>

        {/* Reactions Counter Bar */}
        {reactionEntries.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {reactionEntries.map(([emoji, userAddresses]) => {
              const userList = Array.isArray(userAddresses) ? userAddresses : [];
              const hasReacted = Boolean(
                address &&
                userList.some(a => typeof a === 'string' && a.toLowerCase() === address.toLowerCase())
              );

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all ${
                    hasReacted
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-mono">{userList.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
