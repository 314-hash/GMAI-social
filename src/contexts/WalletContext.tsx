import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { SIDRA_CHAIN_CONFIG, GMAI_TOKEN_CONFIG } from '../config/blockchain';
import { AuthSession, TokenBalanceInfo, ConnectionStatus } from '../types/wallet';
import { switchToSidraChain, fetchGmaiBalance } from '../services/blockchain';
import {
  getStoredSession,
  clearSession,
  createAuthChallenge,
  completeAuthentication,
} from '../services/auth';
import { broadcastPresence } from '../services/gun';

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  status: ConnectionStatus;
  error: string | null;
  authSession: AuthSession | null;
  isAuthenticated: boolean;
  balanceInfo: TokenBalanceInfo;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<boolean>;
  authenticate: (username: string) => Promise<AuthSession>;
  refreshBalance: (force?: boolean) => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  const [balanceInfo, setBalanceInfo] = useState<TokenBalanceInfo>({
    formatted: '0',
    raw: 0n,
    decimals: GMAI_TOKEN_CONFIG.defaultDecimals,
    symbol: GMAI_TOKEN_CONFIG.symbol,
    isEligibleToCreate: false,
    isLoading: false,
    error: null,
    lastChecked: null,
  });

  const isConnected = !!address;
  const isCorrectNetwork = chainId === SIDRA_CHAIN_CONFIG.chainId;
  const isAuthenticated = Boolean(
    authSession?.address &&
    address &&
    authSession.address.toLowerCase() === address.toLowerCase()
  );

  // Balance refresh helper
  const refreshBalance = useCallback(async (force = false) => {
    if (!address) return;
    setBalanceInfo(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetchGmaiBalance(address, force);
      setBalanceInfo({
        formatted: res.formatted,
        raw: res.raw,
        decimals: res.decimals,
        symbol: res.symbol,
        isEligibleToCreate: res.isEligibleToCreate,
        isLoading: false,
        error: null,
        lastChecked: Date.now(),
      });
    } catch (err: any) {
      console.warn('Balance check failed:', err);
      setBalanceInfo(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Balance verification unavailable',
      }));
    }
  }, [address]);

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    setError(null);
    setStatus('connecting');

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setStatus('error');
      setError('No EVM wallet detected. Please install MetaMask, OKX, or Rabby wallet.');
      return;
    }

    try {
      const provider = new BrowserProvider(ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected');
      }

      const activeAddress = accounts[0];
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      setAddress(activeAddress);
      setChainId(currentChainId);
      setStatus('connected');

      // Check for saved session matching this address
      const stored = getStoredSession();
      if (stored?.address && activeAddress && stored.address.toLowerCase() === activeAddress.toLowerCase()) {
        setAuthSession(stored);
      } else {
        setAuthSession(null);
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setStatus('error');
      setError(err?.message || 'Failed to connect wallet');
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    if (address && authSession) {
      broadcastPresence({
        address,
        username: authSession.username,
        status: 'offline',
        lastSeen: Date.now(),
      });
    }
    setAddress(null);
    setChainId(null);
    setStatus('disconnected');
    setAuthSession(null);
    clearSession();
    setBalanceInfo({
      formatted: '0',
      raw: 0n,
      decimals: GMAI_TOKEN_CONFIG.defaultDecimals,
      symbol: GMAI_TOKEN_CONFIG.symbol,
      isEligibleToCreate: false,
      isLoading: false,
      error: null,
      lastChecked: null,
    });
  }, [address, authSession]);

  // Switch network
  const switchNetwork = useCallback(async () => {
    try {
      setError(null);
      await switchToSidraChain();
      const ethereum = (window as any).ethereum;
      if (ethereum) {
        const provider = new BrowserProvider(ethereum);
        const net = await provider.getNetwork();
        setChainId(Number(net.chainId));
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
      return false;
    }
  }, []);

  // Authenticate using challenge signature
  const authenticate = useCallback(async (username: string): Promise<AuthSession> => {
    if (!address) {
      throw new Error('Wallet must be connected first.');
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error('No EVM wallet provider available.');
    }

    const { challenge, nonce, timestamp } = createAuthChallenge(address);
    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    // User signs message
    const signature = await signer.signMessage(challenge);

    // Cryptographically verify and record session
    const session = completeAuthentication({
      address,
      username,
      signature,
      nonce,
      timestamp,
      challenge,
    });

    setAuthSession(session);

    // Broadcast presence
    broadcastPresence({
      address,
      username: session.username,
      status: 'online',
      lastSeen: Date.now(),
    });

    return session;
  }, [address]);

  // Auto-refresh balance on address change
  useEffect(() => {
    if (address) {
      refreshBalance(true);
    }
  }, [address, chainId, refreshBalance]);

  // Listen to provider events (accountsChanged, chainChanged)
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        const newAddress = accounts[0];
        setAddress(newAddress);
        const stored = getStoredSession();
        if (stored?.address && newAddress && stored.address.toLowerCase() === newAddress.toLowerCase()) {
          setAuthSession(stored);
        } else {
          setAuthSession(null);
        }
      }
    };

    const handleChainChanged = (chainHex: string) => {
      const newChainId = parseInt(chainHex, 16);
      setChainId(newChainId);
    };

    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.on?.('chainChanged', handleChainChanged);

    // Auto-check if already authorized
    ethereum.request?.({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        const activeAddress = accounts[0];
        setAddress(activeAddress);
        setStatus('connected');
        ethereum.request?.({ method: 'eth_chainId' }).then((hex: string) => {
          setChainId(parseInt(hex, 16));
        });
        const stored = getStoredSession();
        if (stored?.address && activeAddress && stored.address.toLowerCase() === activeAddress.toLowerCase()) {
          setAuthSession(stored);
        }
      }
    }).catch(() => {});

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [disconnectWallet]);

  const clearError = () => setError(null);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isCorrectNetwork,
        status,
        error,
        authSession,
        isAuthenticated,
        balanceInfo,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        authenticate,
        refreshBalance,
        clearError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
