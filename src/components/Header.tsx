import React, { useState } from 'react';
import { 
  Wallet, 
  RefreshCw, 
  ExternalLink, 
  LogOut, 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  Menu,
  ChevronDown,
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { SIDRA_CHAIN_CONFIG } from '../config/blockchain';
import { shortenAddress, formatGmaiBalance, getTierBadge } from '../utils/formatters';

interface HeaderProps {
  onOpenAuthModal: () => void;
  onOpenWalletModal: () => void;
  onToggleSidebar?: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuthModal,
  onOpenWalletModal,
  onToggleSidebar,
  onShowToast,
}) => {
  const {
    address,
    isConnected,
    isCorrectNetwork,
    authSession,
    isAuthenticated,
    balanceInfo,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalance,
  } = useWallet();

  const [copied, setCopied] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      onShowToast('Wallet address copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not access clipboard', 'error');
    }
  };

  const handleConnectClick = async () => {
    const hasEthereum = typeof window !== 'undefined' && !!(window as any).ethereum;
    if (hasEthereum) {
      try {
        await connectWallet();
        onShowToast('Wallet connected successfully!', 'success');
      } catch {
        onOpenWalletModal();
      }
    } else {
      onOpenWalletModal();
    }
  };

  const numericBal = parseFloat(balanceInfo.formatted || '0');
  const tier = getTierBadge(numericBal);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-gmai-dark/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3 gap-2">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-colors shrink-0"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer min-w-0">
            <div className="relative shrink-0">
              <img
                src="/assets/gmai-logo.jpg"
                alt="GameMind AI Logo"
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-gaming text-xs sm:text-base font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-amber-400 truncate">
                  GAMEMIND AI
                </span>
                <span className="hidden md:inline text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                  $GMAI
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-400 tracking-wider">
                SIDRA CHAIN CHATROOM
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right: Network Badge, Balance, User status & Wallet button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          {/* Network Switcher Badge */}
          {isConnected && (
            <div>
              {isCorrectNetwork ? (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{SIDRA_CHAIN_CONFIG.chainName}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => switchNetwork()}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 transition-all animate-pulse"
                >
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="hidden xs:inline">Switch Network</span>
                  <span className="xs:hidden">Switch</span>
                </button>
              )}
            </div>
          )}

          {/* GMAI Balance Pill */}
          {isConnected && (
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900/80 border border-cyan-500/30 shadow-inner">
              <span className="text-xs shrink-0" title={tier.label}>{tier.icon}</span>
              <div className="flex flex-col text-left">
                <span className="hidden md:block text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                  GMAI Balance
                </span>
                <div className="flex items-center gap-0.5">
                  <span className="text-[11px] sm:text-xs font-bold text-cyan-300 font-mono">
                    {formatGmaiBalance(balanceInfo.formatted)}
                  </span>
                  <span className="text-[9px] text-slate-500 hidden md:inline">$GMAI</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => refreshBalance(true)}
                disabled={balanceInfo.isLoading}
                title="Refresh token balance directly from Sidra contract"
                className="p-0.5 sm:p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors disabled:opacity-50 ml-0.5"
              >
                <RefreshCw className={`w-3 h-3 ${balanceInfo.isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          )}

          {/* Auth & Wallet Controls */}
          {!isConnected ? (
            <button
              type="button"
              onClick={handleConnectClick}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline">Connect Wallet</span>
              <span className="xs:hidden">Connect</span>
            </button>
          ) : !isAuthenticated ? (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-[0_0_15px_rgba(217,70,239,0.35)] animate-pulse whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Verify</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* User Profile Pill */}
              <div
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/30 cursor-pointer hover:border-purple-400/60 hover:bg-slate-800/80 transition-all"
                title="Click to customize username or verify identity"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white uppercase shadow-sm shrink-0">
                  {authSession?.username?.charAt(0) || 'U'}
                </div>
                
                <div className="flex flex-col text-left">
                  <span className="text-[11px] sm:text-xs font-semibold text-purple-200 truncate max-w-[60px] xs:max-w-[80px] sm:max-w-none">
                    @{authSession?.username}
                  </span>
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <span>{shortenAddress(address)}</span>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="hover:text-cyan-400 transition-colors"
                      title="Copy Address"
                    >
                      {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Disconnect Button */}
              <button
                type="button"
                onClick={disconnectWallet}
                title="Disconnect Wallet"
                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
