import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, KeyRound, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { validateUsername } from '../utils/sanitize';
import { isUsernameAvailable, getUsernameForAddress, createQuickWalletSession } from '../services/auth';
import { shortenAddress } from '../utils/formatters';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWalletModal?: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onOpenWalletModal,
  onShowToast,
}) => {
  const { address, isConnected, connectWallet, authenticate, registerChatUsername } = useWallet();

  const [username, setUsername] = useState(() => {
    if (address) {
      const existing = getUsernameForAddress(address);
      if (existing) return existing;
      return `Player_${address.slice(2, 6)}`;
    }
    return '';
  });

  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync username when address connects or changes
  useEffect(() => {
    if (address) {
      const existing = getUsernameForAddress(address);
      setUsername(existing || `Player_${address.slice(2, 6)}`);
    }
  }, [address]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (onOpenWalletModal) {
      onClose();
      onOpenWalletModal();
    } else {
      try {
        await connectWallet();
      } catch (err: any) {
        setError(err.message || 'Connection failed');
      }
    }
  };

  // Instant mobile username registration & chat entry
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Please connect your EVM wallet first.');
      return;
    }

    const trimmed = username.trim() || `Player_${address.slice(2, 6)}`;
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    if (!isUsernameAvailable(trimmed, address)) {
      setError(`Username "${trimmed}" is already claimed by another wallet address.`);
      return;
    }

    try {
      const session = registerChatUsername(trimmed);
      onShowToast(`Joined as @${session.username}! Welcome to GameMind AI.`, 'success');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Username registration failed.');
    }
  };

  // Optional cryptographic EIP-191 sign
  const handleCryptographicAuth = async () => {
    if (!isConnected || !address) {
      setError('Please connect your EVM wallet first.');
      return;
    }

    const trimmed = username.trim() || `Player_${address.slice(2, 6)}`;
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    if (!isUsernameAvailable(trimmed, address)) {
      setError(`Username "${trimmed}" is already claimed by another wallet address.`);
      return;
    }

    try {
      setIsSigning(true);
      const session = await authenticate(trimmed);
      onShowToast(`Cryptographically verified as @${session.username}!`, 'success');
      onClose();
    } catch (err: any) {
      console.warn('Signature rejected or timed out, registering username directly:', err);
      const session = registerChatUsername(trimmed);
      onShowToast(`Joined as @${session.username}! Welcome to GameMind AI.`, 'success');
      onClose();
    } finally {
      setIsSigning(false);
    }
  };

  const handleCloseModal = () => {
    setIsSigning(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-gmai-surface border border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-gaming text-sm sm:text-base font-bold text-white tracking-wider">
                WALLET AUTHENTICATION
              </h2>
              <p className="text-[11px] text-slate-400">
                Cryptographic Identity Verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {!isConnected ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Connect EVM Wallet
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Connect your SafePal, MetaMask, OKX, or Mobile Web3 wallet to prove ownership and participate in GameMind AI community chat.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnect}
                className="w-full py-2.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] text-sm"
              >
                Connect Wallet Now
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Connected Wallet Info */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">
                    CONNECTED WALLET
                  </span>
                  <p className="text-xs font-mono font-semibold text-cyan-300">
                    {shortenAddress(address, 6)}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Wallet Verified
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Choose Chat Handle <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500 px-3 py-2">
                  <span className="text-xs text-slate-500 font-mono">@</span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="Player_4802"
                    className="w-full bg-transparent pl-1 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>3-20 chars (letters, numbers, _)</span>
                  <span>{username.length}/20</span>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-mono">Suggestions:</span>
                  {['GMAI_Master', 'SidraNinja', 'CyberPinet', 'MindHunter'].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setUsername(sug)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-[10px] text-slate-300 hover:text-cyan-300 border border-slate-700/60 transition-colors font-mono"
                    >
                      @{sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* Primary: Instant Save Username & Enter Chat */}
                <button
                  type="submit"
                  disabled={!username.trim()}
                  className="w-full py-3 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save Username & Enter Chat</span>
                </button>

                {/* Optional: EIP-191 Cryptographic Signature */}
                <button
                  type="button"
                  onClick={handleCryptographicAuth}
                  disabled={isSigning || !username.trim()}
                  className="w-full py-2 rounded-xl font-medium text-slate-400 hover:text-purple-300 bg-slate-900/60 hover:bg-purple-500/10 border border-slate-800 hover:border-purple-500/30 transition-all text-[11px] flex items-center justify-center gap-1.5"
                >
                  {isSigning ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Awaiting Wallet Signature...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Optional: Cryptographic EIP-191 Sign</span>
                    </>
                  )}
                </button>
              </div>

              {/* Explanation Note */}
              <p className="text-[10px] text-slate-500 text-center">
                Zero gas required. Safe for PinetSwap & all mobile EVM wallets. Private keys are never requested.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
