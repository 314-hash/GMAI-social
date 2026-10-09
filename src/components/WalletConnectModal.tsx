import React, { useState } from 'react';
import {
  X,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Shield,
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { getInjectedProvider } from '../services/blockchain';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { connectWallet, isConnected } = useWallet();
  const [copied, setCopied] = useState(false);

  // Auto-close modal when connected to prevent getting stuck
  React.useEffect(() => {
    if (isOpen && isConnected) {
      onClose();
    }
  }, [isOpen, isConnected, onClose]);

  if (!isOpen) return null;

  const injected = getInjectedProvider();
  const hasInjected = !!injected;
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Canonical Vercel live URL
  const publicVercelUrl = 'https://gamemindai-social.vercel.app';
  const currentUrl = (typeof window !== 'undefined' && window.location.href && !window.location.href.includes('localhost') && !window.location.href.includes('127.0.0.1'))
    ? window.location.href
    : (import.meta.env.VITE_APP_URL || publicVercelUrl);
  const cleanUrl = currentUrl.replace(/^https?:\/\//, '');

  // Check if SafePal is specifically available
  const isSafePalAvailable = typeof window !== 'undefined' && !!(
    (window as any).safepalProvider ||
    (window as any).safePal ||
    (window as any).ethereum?.isSafePal ||
    (window as any).ethereum?.providers?.some((p: any) => p.isSafePal)
  );

  // Check if PinetSwap is specifically available
  const isPinetSwapAvailable = typeof window !== 'undefined' && !!(
    (window as any).pinetswapProvider ||
    (window as any).pinetswap ||
    (window as any).pinet ||
    (window as any).ethereum?.isPinetSwap ||
    (window as any).ethereum?.isPinetswap ||
    (window as any).ethereum?.providers?.some((p: any) => p.isPinetSwap || p.isPinetswap || p.isPinet) ||
    window.location.hostname.includes('pinetswap') ||
    (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('pinetswap'))
  );

  // Determine detected wallet label
  let detectedWalletName = 'Browser Wallet';
  if (typeof window !== 'undefined') {
    const anyWin = window as any;
    if (
      anyWin.pinetswapProvider ||
      anyWin.pinetswap ||
      anyWin.pinet ||
      anyWin.ethereum?.isPinetSwap ||
      anyWin.ethereum?.isPinetswap ||
      window.location.hostname.includes('pinetswap') ||
      (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('pinetswap'))
    ) {
      detectedWalletName = 'PinetSwap Wallet';
    } else if (anyWin.safepalProvider || anyWin.ethereum?.isSafePal || anyWin.ethereum?.providers?.some((p: any) => p.isSafePal)) {
      detectedWalletName = 'SafePal Wallet';
    } else if (anyWin.ethereum?.isMetaMask && !anyWin.ethereum?.isOkxWallet) {
      detectedWalletName = 'MetaMask';
    } else if (anyWin.ethereum?.isOkxWallet) {
      detectedWalletName = 'OKX Wallet';
    } else if (anyWin.ethereum?.isTrust) {
      detectedWalletName = 'Trust Wallet';
    } else if (anyWin.ethereum?.isCoinbaseWallet) {
      detectedWalletName = 'Coinbase Wallet';
    } else if (anyWin.ethereum?.isRabby) {
      detectedWalletName = 'Rabby Wallet';
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      onShowToast('DApp URL copied! Paste it in your mobile wallet browser.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not access clipboard', 'error');
    }
  };

  const handleConnectInjected = async (targetWallet?: string) => {
    try {
      await connectWallet(targetWallet);
      onClose();
      onShowToast(`Connected successfully!`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Connection failed', 'error');
    }
  };

  const mobileWallets = [
    {
      id: 'pinetswap',
      name: 'PinetSwap',
      badge: isPinetSwapAvailable ? 'Ready' : 'Sidra Native',
      color: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/30 text-emerald-300',
      icon: '🌲',
      deepLink: `https://pinetswap.app`,
      fallbackUniversalLink: `https://pinetswap.app`,
      downloadUrl: 'https://pinetswap.app',
      description: 'Sidra Chain DEX & Non-Custodial Wallet',
      isAvailable: isPinetSwapAvailable,
    },
    {
      id: 'safepal',
      name: 'SafePal Wallet',
      badge: isSafePalAvailable ? 'Ready' : 'Hardware & App',
      color: 'from-indigo-600/20 to-purple-600/20 border-indigo-500/30 text-indigo-300',
      icon: '🛡️',
      deepLink: `safepalwallet://dapp/url?url=${encodeURIComponent(currentUrl)}`,
      fallbackUniversalLink: `https://link.safepal.io/dapp?url=${encodeURIComponent(currentUrl)}`,
      downloadUrl: 'https://www.safepal.com/download',
      description: 'Connect SafePal Extension or Mobile App',
      isAvailable: isSafePalAvailable,
    },
    {
      id: 'metamask',
      name: 'MetaMask',
      badge: 'Popular',
      color: 'from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-400',
      icon: '🦊',
      deepLink: `https://metamask.app.link/dapp/${cleanUrl}`,
      fallbackUniversalLink: `https://metamask.app.link/dapp/${cleanUrl}`,
      downloadUrl: 'https://metamask.io/download/',
      description: 'Open in MetaMask Browser',
      isAvailable: typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
    },
    {
      id: 'okx',
      name: 'OKX Wallet',
      badge: 'Web3 Gaming',
      color: 'from-slate-800 to-slate-900 border-cyan-500/30 text-cyan-400',
      icon: '⬛',
      deepLink: `https://www.okx.com/download?deeplink=${encodeURIComponent('okx://wallet/dapp/url?dappUrl=' + encodeURIComponent(currentUrl))}`,
      fallbackUniversalLink: `https://www.okx.com/web3`,
      downloadUrl: 'https://www.okx.com/web3',
      description: 'Launch in OKX Wallet App',
      isAvailable: typeof window !== 'undefined' && !!((window as any).okxwallet || (window as any).ethereum?.isOkxWallet),
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      badge: 'Multi-Chain',
      color: 'from-blue-600/20 to-cyan-600/20 border-blue-500/30 text-blue-400',
      icon: '🛡️',
      deepLink: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`,
      fallbackUniversalLink: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`,
      downloadUrl: 'https://trustwallet.com/download',
      description: 'Open in Trust Wallet dApp tab',
      isAvailable: typeof window !== 'undefined' && !!(window as any).ethereum?.isTrust,
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      badge: 'EVM',
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-indigo-400',
      icon: '🔵',
      deepLink: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`,
      fallbackUniversalLink: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`,
      downloadUrl: 'https://www.coinbase.com/wallet',
      description: 'Connect via Coinbase Mobile',
      isAvailable: typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet,
    },
  ];

  const handleWalletClick = async (e: React.MouseEvent, wallet: typeof mobileWallets[0]) => {
    // 1. If wallet is directly available OR if ANY injected provider exists in this browser, connect directly!
    if (wallet.isAvailable || hasInjected) {
      e.preventDefault();
      await handleConnectInjected(wallet.id);
      return;
    }

    // 2. PinetSwap specific handling for external browser without provider
    if (wallet.id === 'pinetswap') {
      e.preventDefault();
      onShowToast('Opening PinetSwap (pinetswap.app) for Sidra Chain...', 'info');
      window.open(wallet.downloadUrl, '_blank');
      return;
    }

    // 3. SafePal specific handling
    if (wallet.id === 'safepal') {
      if (isMobile) {
        e.preventDefault();
        const start = Date.now();
        window.location.href = wallet.deepLink;
        setTimeout(() => {
          if (Date.now() - start < 1800 && wallet.fallbackUniversalLink) {
            window.open(wallet.fallbackUniversalLink, '_blank');
          }
        }, 1200);
      } else {
        e.preventDefault();
        onShowToast('SafePal extension not found. Opening SafePal download page...', 'info');
        window.open(wallet.downloadUrl, '_blank');
      }
      return;
    }

    // 4. If mobile external browser, let deep-link trigger
    if (isMobile) {
      return;
    }

    // 5. Desktop without extension installed: open download page
    e.preventDefault();
    onShowToast(`Opening ${wallet.name} download page...`, 'info');
    window.open(wallet.downloadUrl, '_blank');
  };

  const primaryTarget = isPinetSwapAvailable ? 'pinetswap' : isSafePalAvailable ? 'safepal' : (hasInjected ? 'pinetswap' : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-gmai-surface border border-cyan-500/30 shadow-[0_0_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-gaming text-sm sm:text-base font-bold text-white tracking-wider">
                CONNECT WEB3 WALLET
              </h2>
              <p className="text-[11px] text-slate-400">
                Sidra Chain (Chain ID: 97453)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Primary Injected Connection Option */}
          {hasInjected ? (
            <button
              type="button"
              onClick={() => handleConnectInjected(primaryTarget)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-purple-500/20 border border-cyan-400/50 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-lg shadow-inner">
                  {detectedWalletName === 'PinetSwap Wallet' ? '🌲' : detectedWalletName === 'SafePal Wallet' ? '🛡️' : '⚡'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {detectedWalletName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Detected & Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Connect installed {detectedWalletName} to GameMind AI
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                Connect →
              </span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-start gap-2.5 text-xs text-cyan-200">
              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-cyan-300">
                  {isMobile ? 'Mobile Browser Detected' : 'Select Your Web3 Wallet'}
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Choose PinetSwap, SafePal, or your favorite wallet below to connect or launch inside the wallet app.
                </p>
              </div>
            </div>
          )}

          {/* Mobile Wallet Cards / Direct Connect */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span>{isMobile ? 'ONE-TAP MOBILE CONNECT' : 'SELECT WALLET PROVIDER'}</span>
              <span className="text-[9px] text-cyan-400">DIRECT CONNECT</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mobileWallets.map(w => (
                <a
                  key={w.id}
                  href={w.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleWalletClick(e, w)}
                  className={`flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border hover:scale-[1.02] transition-all group ${w.color}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{w.icon}</span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white block truncate">
                          {w.name}
                        </span>
                        {w.isAvailable && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Installed and ready" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {w.badge}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 ml-1" />
                </a>
              ))}
            </div>
          </div>

          {/* Copy DApp Link Box */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                COPY DAPP URL FOR WALLET BROWSER
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={copyUrl}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Paste this URL inside PinetSwap, SafePal, or MetaMask in-app DApp browser tab to chat and create rooms.
            </p>
          </div>

          {/* Security Guarantee Note */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Zero gas required. Private keys and seed phrases are never requested or exposed.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
