// Centralized Blockchain & GameMind AI Configuration

export const SIDRA_CHAIN_CONFIG = {
  chainId: Number(import.meta.env.VITE_SIDRA_CHAIN_ID || 97453),
  chainIdHex: '0x' + Number(import.meta.env.VITE_SIDRA_CHAIN_ID || 97453).toString(16),
  chainName: import.meta.env.VITE_SIDRA_CHAIN_NAME || 'Sidra Chain',
  rpcUrl: import.meta.env.VITE_SIDRA_RPC_URL || 'https://node.sidrachain.com',
  explorerUrl: import.meta.env.VITE_SIDRA_EXPLORER_URL || 'https://explorer.sidrachain.com',
  nativeCurrency: {
    name: import.meta.env.VITE_SIDRA_CURRENCY_NAME || 'Sidra',
    symbol: import.meta.env.VITE_SIDRA_CURRENCY_SYMBOL || 'SIDRA',
    decimals: Number(import.meta.env.VITE_SIDRA_CURRENCY_DECIMALS || 18),
  },
};

export const GMAI_TOKEN_CONFIG = {
  address: (import.meta.env.VITE_GMAI_TOKEN_ADDRESS || '0x4765561e63914E72168bBd2A7e2ce72F9057ca04') as string,
  symbol: import.meta.env.VITE_GMAI_TOKEN_SYMBOL || 'GMAI',
  minCreateRoomBalance: Number(import.meta.env.VITE_MIN_GMAI_CREATE_ROOM || 500000),
  defaultGatedMinBalance: Number(import.meta.env.VITE_DEFAULT_GATED_MIN_BALANCE || 500000),
  defaultDecimals: 18,
};

// Standard ERC20 ABI with decimals, balanceOf, symbol, name
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

export const GUN_PEERS = (() => {
  const customRelay = import.meta.env.VITE_GUN_RELAY_URL?.trim();
  const publicPeers = (import.meta.env.VITE_GUN_PUBLIC_PEERS || '')
    .split(',')
    .map((p: string) => p.trim())
    .filter(Boolean);

  const peers: string[] = [];
  if (customRelay) {
    peers.push(customRelay);
  } else if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    // Attempt local gun endpoint if running locally with server.js
    peers.push(`${window.location.origin}/gun`);
  }
  
  if (publicPeers.length > 0) {
    peers.push(...publicPeers);
  } else {
    peers.push(
      'https://gun-manhattan.herokuapp.com/gun',
      'https://peer.wall.org/gun',
      'https://relay.peer.ooo/gun'
    );
  }

  return peers;
})();
