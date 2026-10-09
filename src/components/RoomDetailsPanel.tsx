import React from 'react';
import {
  X,
  Shield,
  Lock,
  Globe,
  Calendar,
  User,
  ExternalLink,
  BookOpen,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useWallet } from '../contexts/WalletContext';
import { GMAI_TOKEN_CONFIG, SIDRA_CHAIN_CONFIG } from '../config/blockchain';
import { shortenAddress, formatFullDate, formatGmaiBalance } from '../utils/formatters';

interface RoomDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const RoomDetailsPanel: React.FC<RoomDetailsPanelProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { activeRoom, onlineUsers } = useChat();
  const { address, balanceInfo } = useWallet();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !activeRoom) return null;

  const numericBal = parseFloat(balanceInfo.formatted || '0');
  const isEligible = numericBal >= activeRoom.minGmaiBalance;

  const copyRoomSlug = () => {
    navigator.clipboard.writeText(`#${activeRoom.slug}`);
    setCopied(true);
    onShowToast(`Copied room tag #${activeRoom.slug}!`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 shrink-0 border-l border-cyan-500/15 bg-gmai-surface/95 backdrop-blur-xl flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/15 flex items-center justify-between">
        <h3 className="font-gaming text-xs font-bold text-slate-200 tracking-wider">
          ROOM INTELLIGENCE
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Room Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
              {activeRoom.category}
            </span>
            <button
              onClick={copyRoomSlug}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 font-mono"
            >
              <span>#{activeRoom.slug}</span>
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
          </div>
          <h2 className="text-base font-bold text-white">
            {activeRoom.name}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {activeRoom.description || 'Welcome to this GameMind AI chatroom!'}
          </p>
        </div>

        {/* Token-Gating Policy Card */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              {activeRoom.isTokenGated ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Token-Gated Channel</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Public Channel</span>
                </>
              )}
            </span>
            {activeRoom.isTokenGated && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                isEligible
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {isEligible ? 'Access Granted' : 'Locked'}
              </span>
            )}
          </div>

          {activeRoom.isTokenGated && (
            <div className="text-[11px] space-y-1 pt-1 text-slate-400 border-t border-slate-800">
              <div className="flex justify-between">
                <span>Required Balance:</span>
                <span className="text-amber-400 font-mono font-bold">
                  {activeRoom.minGmaiBalance.toLocaleString()} GMAI
                </span>
              </div>
              <div className="flex justify-between">
                <span>Your Balance:</span>
                <span className="text-cyan-300 font-mono">
                  {formatGmaiBalance(balanceInfo.formatted)} GMAI
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Creator Identity */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            FOUNDER & CREATOR
          </span>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                @{activeRoom.creatorUsername}
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {shortenAddress(activeRoom.creatorAddress)}
              </p>
            </div>
          </div>
        </div>

        {/* Room Rules */}
        {activeRoom.rules && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>ROOM GUIDELINES</span>
            </span>
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {activeRoom.rules}
            </div>
          </div>
        )}

        {/* Active Members Count */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3 h-3 text-emerald-400" />
              <span>ONLINE MEMBERS</span>
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {Math.max(onlineUsers.length, 1)}
            </span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {onlineUsers.map(user => (
              <div
                key={user.address}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300">@{user.username}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {shortenAddress(user.address)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Link */}
        <div className="pt-2">
          <a
            href={`${SIDRA_CHAIN_CONFIG.explorerUrl}/address/${GMAI_TOKEN_CONFIG.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
          >
            <span>View Contract on Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
};
