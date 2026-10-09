import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useWallet } from '../contexts/WalletContext';
import { shortenAddress } from '../utils/formatters';

interface MessageInputProps {
  onOpenAuthModal: () => void;
  onOpenWalletModal?: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const QUICK_EMOJIS = ['🎮', '🚀', '🔥', '💎', '🧠', '⚔️'];

export const MessageInput: React.FC<MessageInputProps> = ({
  onOpenAuthModal,
  onOpenWalletModal,
  onShowToast,
}) => {
  const { sendMessage, isGatedLocked, activeRoomMinBalance, activeRoom } = useChat();
  const { isConnected, isAuthenticated, balanceInfo, address, authSession } = useWallet();

  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle anti-spam cooldown tick
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSending || cooldown > 0) return;

    if (!isConnected) {
      if (onOpenWalletModal) {
        onOpenWalletModal();
      } else {
        onOpenAuthModal();
      }
      return;
    }

    if (isGatedLocked) {
      onShowToast(
        `Token-gated room! You need at least ${activeRoomMinBalance.toLocaleString()} GMAI to send messages.`,
        'error'
      );
      return;
    }

    try {
      setIsSending(true);
      await sendMessage(text);
      setText('');
      setCooldown(2); // 2 second anti-spam cooldown
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send message', 'error');
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  // Locked Banner State
  if (isGatedLocked) {
    return (
      <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-amber-500/20 backdrop-blur-md">
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300">
                Token-Gated Channel Access Restricted
              </p>
              <p className="text-[11px] text-slate-400">
                Requires <span className="text-amber-400 font-mono font-bold">{activeRoomMinBalance.toLocaleString()} GMAI</span>. Your balance: <span className="font-mono text-cyan-300">{balanceInfo.formatted} GMAI</span>.
              </p>
            </div>
          </div>
          <a
            href="https://pinetswap.app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
          >
            <span>Swap on PinetSwap</span>
          </a>
        </div>
      </div>
    );
  }

  // Disconnected Banner State
  if (!isConnected) {
    return (
      <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-900/90 border-t border-cyan-500/20 backdrop-blur-md shrink-0">
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-xs font-semibold text-white">
                Join Community Chat #{activeRoom?.slug || 'general'}
              </p>
              <p className="text-[11px] text-slate-400">
                Connect your PinetSwap, SafePal, MetaMask, or EVM wallet to participate in real-time chat.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWalletModal || onOpenAuthModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gmai-dark/95 border-t border-cyan-500/20 backdrop-blur-md shrink-0">
      <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
        {/* Connected Handle Status Strip */}
        <div className="flex items-center justify-between px-1 pb-1 text-[11px] border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="text-slate-400 text-[10px]">Chatting as</span>
            <span className="font-bold text-cyan-300 font-mono truncate text-xs">
              @{authSession?.username || (address ? `Player_${address.slice(2, 6)}` : 'GMAI_User')}
            </span>
            {address && (
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                ({shortenAddress(address, 4)})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 hover:underline shrink-0"
          >
            Change Handle
          </button>
        </div>

        {/* Quick Emoji Bar & Character Count */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 hidden sm:inline">Quick Emotes:</span>
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="hover:scale-125 transition-transform px-1 py-0.5 rounded text-xs"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
            {cooldown > 0 && (
              <span className="text-amber-400 animate-pulse">
                Cooldown: {cooldown}s
              </span>
            )}
            <span className={text.length > 450 ? 'text-amber-400' : ''}>
              {text.length}/500
            </span>
          </div>
        </div>

        {/* Text Input Row */}
        <div className="flex items-end gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/25 focus-within:border-cyan-400/60 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={e => setText(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${activeRoom?.slug || 'chat'}... (Enter to send, Shift+Enter for newline)`}
            className="w-full bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none max-h-32 min-h-[38px]"
          />

          <button
            type="submit"
            disabled={!text.trim() || isSending || cooldown > 0}
            className="p-2 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
