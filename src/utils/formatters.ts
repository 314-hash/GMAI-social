export function shortenAddress(address: string | null | undefined, chars: number = 4): string {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatGmaiBalance(balance: number | string | bigint): string {
  const num = typeof balance === 'bigint' ? Number(balance) : Number(balance || 0);
  if (isNaN(num)) return '0';
  
  if (num >= 1_000_000) {
    return (num / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'K';
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatExactNumber(balance: number | string): string {
  const num = Number(balance);
  if (isNaN(num)) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatTimestamp(timestamp: number | string | undefined | null): string {
  if (!timestamp) return '';
  const num = Number(timestamp);
  if (isNaN(num) || num <= 0) return '';
  try {
    const date = new Date(num);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatFullDate(timestamp: number | string | undefined | null): string {
  if (!timestamp) return '';
  const num = Number(timestamp);
  if (isNaN(num) || num <= 0) return '';
  try {
    const date = new Date(num);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function getTierBadge(balance: number): { label: string; color: string; bg: string; icon: string } {
  if (balance >= 5_000_000) {
    return { label: 'Whale Master', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: '👑' };
  }
  if (balance >= 1_000_000) {
    return { label: 'Apex Guardian', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/30', icon: '⚡' };
  }
  if (balance >= 500_000) {
    return { label: 'Room Creator', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30', icon: '💎' };
  }
  return { label: 'Holder', color: 'text-slate-400', bg: 'bg-slate-700/20 border-slate-600/30', icon: '🎮' };
}
