import React, { useState } from 'react';
import { X, Lock, Sparkles, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useChat } from '../contexts/ChatContext';
import { useWallet } from '../contexts/WalletContext';
import { RoomCategory } from '../types/chat';
import { GMAI_TOKEN_CONFIG, SIDRA_CHAIN_CONFIG } from '../config/blockchain';
import { validateRoomSlug } from '../utils/sanitize';
import { formatGmaiBalance } from '../utils/formatters';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { createRoom } = useChat();
  const { address, authSession, balanceInfo, refreshBalance } = useWallet();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RoomCategory>('gaming');
  const [isTokenGated, setIsTokenGated] = useState(false);
  const [minGmaiBalance, setMinGmaiBalance] = useState(500000);
  const [rules, setRules] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericBal = parseFloat(balanceInfo.formatted || '0');
  const isEligibleToCreate = numericBal >= GMAI_TOKEN_CONFIG.minCreateRoomBalance;

  // Auto-generate slug from name if empty
  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address || !authSession) {
      setError('Please authenticate your wallet before creating a room.');
      return;
    }

    if (!isEligibleToCreate) {
      setError(
        `Insufficient balance. You hold ${formatGmaiBalance(balanceInfo.formatted)} GMAI, but ${GMAI_TOKEN_CONFIG.minCreateRoomBalance.toLocaleString()} GMAI is required.`
      );
      return;
    }

    if (!name.trim()) {
      setError('Room name is required.');
      return;
    }

    const slugValidation = validateRoomSlug(slug);
    if (!slugValidation.valid) {
      setError(slugValidation.error || 'Invalid room identifier.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createRoom({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        category,
        isTokenGated,
        minGmaiBalance: isTokenGated ? Number(minGmaiBalance) : 0,
        creatorAddress: address,
        creatorUsername: authSession.username,
        rules: rules.trim(),
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#a855f7', '#f59e0b'],
        });
      } catch {}

      onShowToast(`Chatroom #${slug} created successfully!`, 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create chatroom');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl bg-gmai-surface border border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-gaming text-sm sm:text-base font-bold text-white tracking-wider">
                CREATE NEW CHATROOM
              </h2>
              <p className="text-[11px] text-slate-400">
                Token-Gated Community Creation on Sidra Chain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification / Balance Card */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/15 bg-slate-900/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                CREATOR ELIGIBILITY CHECK
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-200">
                  {formatGmaiBalance(balanceInfo.formatted)} GMAI
                </span>
                <span className="text-xs text-slate-500">/ 500,000 GMAI Required</span>
              </div>
            </div>

            {isEligibleToCreate ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Eligible to Create</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                <Lock className="w-3.5 h-3.5" />
                <span>Insufficient Balance</span>
              </span>
            )}
          </div>
        </div>

        {/* Body / Form */}
        {!isEligibleToCreate ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                500,000 $GMAI Required
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Chatroom creation is token-gated to protect the ecosystem from spam. Verify your balance on Sidra Chain to unlock creator permissions.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => refreshBalance(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
              >
                Re-check Balance
              </button>
              <a
                href={`${SIDRA_CHAIN_CONFIG.explorerUrl}/token/${GMAI_TOKEN_CONFIG.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors border border-cyan-500/40"
              >
                View GMAI Contract
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Room Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chatroom Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. AI Autonomous Guild"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Room Slug */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Room Identifier (Slug) <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500 px-3 py-2">
                <span className="text-xs text-slate-500 font-mono">#</span>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="ai-autonomous-guild"
                  className="w-full bg-transparent pl-1 text-xs sm:text-sm text-cyan-300 font-mono placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as RoomCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-xs sm:text-sm text-slate-100 focus:outline-none"
              >
                <option value="gaming">Gaming & Esports</option>
                <option value="ai-agents">AI Agents & Neural Characters</option>
                <option value="metaverse">3D Metaverse Worlds</option>
                <option value="guilds">Guilds & Clans</option>
                <option value="trading">Alpha & Market Analysis</option>
                <option value="development">Dev & Modding</option>
                <option value="general">General Community</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                maxLength={200}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this chatroom about?"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Token-gated toggle */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Token-Gated Access
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Require visitors to hold $GMAI tokens to join.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isTokenGated}
                  onChange={e => setIsTokenGated(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
                />
              </div>

              {isTokenGated && (
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Minimum GMAI Requirement
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={minGmaiBalance}
                    onChange={e => setMinGmaiBalance(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Room Rules */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Room Guidelines & Rules (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={rules}
                onChange={e => setRules(e.target.value)}
                placeholder="e.g. No advertising, English only, respect all guild members."
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
              >
                {isSubmitting ? 'Registering Room...' : 'Create Chatroom'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
