export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  status: ConnectionStatus;
  error: string | null;
}

export interface AuthSession {
  address: string;
  username: string;
  signature: string;
  nonce: string;
  timestamp: number;
}

export interface TokenBalanceInfo {
  formatted: string;
  raw: bigint;
  decimals: number;
  symbol: string;
  isEligibleToCreate: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: number | null;
}
