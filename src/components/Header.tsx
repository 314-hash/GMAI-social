import React from 'react';
import { 
  Wallet, 
  RefreshCw, 
  ExternalLink, 
  LogOut, 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  Menu
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { SIDRA_CHAIN_CONFIG, GMAI_TOKEN_CONFIG } from '../config/blockchain';
import { shortenAddress, formatGmaiBalance, getTierBadge } from '../utils/formatters';

interface HeaderProps {
  onOpenAuthModal: () => void;
  onToggleSidebar?: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuthModal,
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

  const [copied, setCopied] = React.useState(false);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    onShowToast('Wallet address copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const numericBal = parseFloat(balanceInfo.formatted || '0');
  const tier = getTierBadge(numericBal);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-gmai-dark/90 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <img
                src="/assets/gmai-logo.jpg"
                alt="GameMind AI Logo"
                className="w-10 h-10 rounded-full object-cover border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-gaming text-base font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-amber-400">
                  GAMEMIND AI
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  $GMAI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider">
                SIDRA CHAIN CHATROOM
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right: Network Badge, Balance, User status & Wallet button */}
        <div className="flex items-center gap-2 sm:gap-3">
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
                  onClick={() => switchNetwork()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 transition-all animate-pulse"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Switch to Sidra</span>
                </button>
              )}
            </div>
          )}

          {/* GMAI Balance Pill */}
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 shadow-inner">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" title={tier.label}>{tier.icon}</span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    GMAI Balance
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-bold text-cyan-300 font-mono">
                      {formatGmaiBalance(balanceInfo.formatted)}
                    </span>
                    <span className="text-[10px] text-slate-500">$GMAI</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => refreshBalance(true)}
                disabled={balanceInfo.isLoading}
                title="Refresh token balance directly from Sidra contract"
                className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${balanceInfo.isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          )}

          {/* Auth & Wallet Controls */}
          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          ) : !isAuthenticated ? (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-[0_0_15px_rgba(217,70,239,0.35)] animate-bounce"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Identity</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* User Profile Pill */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/30">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white uppercase shadow-sm">
                  {authSession?.username?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-purple-200">
                    @{authSession?.username}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <span>{shortenAddress(address)}</span>
                    <button
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
                onClick={disconnectWallet}
                title="Disconnect Wallet"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
