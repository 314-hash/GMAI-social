import { BrowserProvider, JsonRpcProvider, Contract, formatUnits } from 'ethers';
import { SIDRA_CHAIN_CONFIG, GMAI_TOKEN_CONFIG, ERC20_ABI } from '../config/blockchain';

export interface TokenBalanceResult {
  raw: bigint;
  formatted: string;
  decimals: number;
  symbol: string;
  numericBalance: number;
  isEligibleToCreate: boolean;
}

// In-memory cache for balance to avoid excessive RPC spam, but bounded
const balanceCache = new Map<string, { result: TokenBalanceResult; timestamp: number }>();
const CACHE_TTL_MS = 20_000; // 20 seconds cache

/**
 * Get an ethers provider.
 * Prefers injected window.ethereum if available and connected,
 * otherwise falls back to the configured Sidra RPC provider.
 */
export function getSidraRpcProvider(): JsonRpcProvider {
  return new JsonRpcProvider(SIDRA_CHAIN_CONFIG.rpcUrl);
}

// Active provider singleton to preserve the connected wallet across calls
let activeProvider: any = null;

export function setActiveProvider(provider: any): void {
  activeProvider = provider;
}

export function getActiveProvider(): any {
  return activeProvider;
}

// Store discovered EIP-6963 providers
const eip6963Providers = new Map<string, any>();

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event: any) => {
    if (event?.detail?.info?.rdns && event?.detail?.provider) {
      eip6963Providers.set(event.detail.info.rdns, event.detail.provider);
      if (event.detail.info.name) {
        eip6963Providers.set(event.detail.info.name.toLowerCase(), event.detail.provider);
      }
    }
  });
  try {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  } catch {
    // Ignore in non-standard environments
  }
}

/**
 * Validates whether an object is a callable Web3 provider
 */
export function isCallableProvider(p: any): boolean {
  return Boolean(
    p && (
      typeof p.request === 'function' ||
      typeof p.enable === 'function' ||
      typeof p.send === 'function'
    )
  );
}

/**
 * Detect EVM provider for specific wallet or general injected
 */
export function getWalletProvider(targetWallet?: string): any {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;

  // 1. SafePal specific check
  if (targetWallet === 'safepal') {
    if (eip6963Providers.get('io.safepal')) return eip6963Providers.get('io.safepal');
    if (eip6963Providers.get('io.safepal.wallet')) return eip6963Providers.get('io.safepal.wallet');
    if (eip6963Providers.get('safepal')) return eip6963Providers.get('safepal');
    if (isCallableProvider(anyWin.safepalProvider)) {
      return anyWin.safepalProvider;
    }
    if (anyWin.ethereum?.isSafePal && isCallableProvider(anyWin.ethereum)) {
      return anyWin.ethereum;
    }
    if (Array.isArray(anyWin.ethereum?.providers)) {
      const sp = anyWin.ethereum.providers.find((p: any) => p.isSafePal && isCallableProvider(p));
      if (sp) return sp;
    }
    if (isCallableProvider(anyWin.safePal)) {
      return anyWin.safePal;
    }
    // Mobile in-app browser fallback (SafePal webview often provides window.ethereum)
    if (isCallableProvider(anyWin.ethereum)) {
      return anyWin.ethereum;
    }
  }

  // 2. MetaMask specific check
  if (targetWallet === 'metamask') {
    if (eip6963Providers.get('io.metamask')) return eip6963Providers.get('io.metamask');
    if (Array.isArray(anyWin.ethereum?.providers)) {
      const mm = anyWin.ethereum.providers.find((p: any) => p.isMetaMask && !p.isSafePal && !p.isOkxWallet && isCallableProvider(p));
      if (mm) return mm;
    }
    if (anyWin.ethereum?.isMetaMask && !anyWin.ethereum?.isSafePal && !anyWin.ethereum?.isOkxWallet && isCallableProvider(anyWin.ethereum)) {
      return anyWin.ethereum;
    }
  }

  // 3. OKX specific check
  if (targetWallet === 'okx') {
    if (isCallableProvider(anyWin.okxwallet)) return anyWin.okxwallet;
    if (Array.isArray(anyWin.ethereum?.providers)) {
      const okx = anyWin.ethereum.providers.find((p: any) => p.isOkxWallet && isCallableProvider(p));
      if (okx) return okx;
    }
    if (anyWin.ethereum?.isOkxWallet && isCallableProvider(anyWin.ethereum)) return anyWin.ethereum;
  }

  // 4. PinetSwap specific check (Sidra Chain Native DEX & Wallet)
  if (targetWallet === 'pinetswap') {
    if (eip6963Providers.get('pinetswap')) return eip6963Providers.get('pinetswap');
    if (eip6963Providers.get('app.pinetswap')) return eip6963Providers.get('app.pinetswap');
    if (isCallableProvider(anyWin.pinetswapProvider)) {
      return anyWin.pinetswapProvider;
    }
    if (isCallableProvider(anyWin.pinetswap)) {
      return anyWin.pinetswap;
    }
    if (isCallableProvider(anyWin.pinet)) {
      return anyWin.pinet;
    }
    if ((anyWin.ethereum?.isPinetSwap || anyWin.ethereum?.isPinetswap) && isCallableProvider(anyWin.ethereum)) {
      return anyWin.ethereum;
    }
    if (Array.isArray(anyWin.ethereum?.providers)) {
      const ps = anyWin.ethereum.providers.find((p: any) => (p.isPinetSwap || p.isPinetswap || p.isPinet) && isCallableProvider(p));
      if (ps) return ps;
    }
    // If inside PinetSwap app or browser, or user selects PinetSwap with injected provider available
    if (isCallableProvider(anyWin.ethereum)) {
      return anyWin.ethereum;
    }
  }

  // Fallback to active or general injected
  return activeProvider || getInjectedProvider();
}

/**
 * Detect injected EVM provider (SafePal, PinetSwap, MetaMask, OKX, Rabby, Trust, etc.)
 * Strictly validates that provider is callable.
 */
export function getInjectedProvider(): any {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;

  // Prioritize activeProvider if set
  if (isCallableProvider(activeProvider)) {
    return activeProvider;
  }

  // PinetSwap direct provider (Sidra Chain native)
  if (isCallableProvider(anyWin.pinetswapProvider)) {
    return anyWin.pinetswapProvider;
  }
  if (isCallableProvider(anyWin.pinetswap)) {
    return anyWin.pinetswap;
  }
  if (isCallableProvider(anyWin.pinet)) {
    return anyWin.pinet;
  }
  if ((anyWin.ethereum?.isPinetSwap || anyWin.ethereum?.isPinetswap) && isCallableProvider(anyWin.ethereum)) {
    return anyWin.ethereum;
  }

  // SafePal direct provider (SafePal mobile app in-app browser or extension)
  if (isCallableProvider(anyWin.safepalProvider)) {
    return anyWin.safepalProvider;
  }

  // SafePal or multi-provider in window.ethereum.providers
  if (Array.isArray(anyWin.ethereum?.providers)) {
    const ps = anyWin.ethereum.providers.find((p: any) => (p.isPinetSwap || p.isPinetswap || p.isPinet) && isCallableProvider(p));
    if (ps) return ps;
    const sp = anyWin.ethereum.providers.find((p: any) => p.isSafePal && isCallableProvider(p));
    if (sp) return sp;
    const anyValid = anyWin.ethereum.providers.find((p: any) => isCallableProvider(p));
    if (anyValid) return anyValid;
  }

  // window.ethereum with valid request / enable / send method
  if (isCallableProvider(anyWin.ethereum)) {
    return anyWin.ethereum;
  }

  // window.safePal with valid method
  if (isCallableProvider(anyWin.safePal)) {
    return anyWin.safePal;
  }

  // EIP-6963 provider
  if (eip6963Providers.size > 0) {
    const first = eip6963Providers.values().next().value;
    if (isCallableProvider(first)) return first;
  }

  return isCallableProvider(anyWin.ethereum) ? anyWin.ethereum : null;
}

export function getBrowserProvider(): BrowserProvider | null {
  const injected = activeProvider || getInjectedProvider();
  if (injected && (typeof injected.request === 'function' || typeof injected.send === 'function')) {
    try {
      return new BrowserProvider(injected);
    } catch (err) {
      console.warn('BrowserProvider instantiation error:', err);
    }
  }
  return null;
}

/**
 * Switch the user's wallet to Sidra Chain (Chain ID: 97453).
 * If the chain isn't added, calls wallet_addEthereumChain.
 */
export async function switchToSidraChain(providerToUse?: any): Promise<boolean> {
  const ethereum = providerToUse || activeProvider || getInjectedProvider();
  if (!ethereum) {
    throw new Error('No EVM wallet detected. Please install SafePal, MetaMask, or another EVM wallet.');
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SIDRA_CHAIN_CONFIG.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 code indicates chain has not been added to wallet yet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SIDRA_CHAIN_CONFIG.chainIdHex,
              chainName: SIDRA_CHAIN_CONFIG.chainName,
              nativeCurrency: SIDRA_CHAIN_CONFIG.nativeCurrency,
              rpcUrls: [SIDRA_CHAIN_CONFIG.rpcUrl],
              blockExplorerUrls: [SIDRA_CHAIN_CONFIG.explorerUrl],
            },
          ],
        });
        return true;
      } catch (addError: any) {
        console.error('Failed to add Sidra Chain to wallet:', addError);
        throw new Error(addError.message || 'Failed to add Sidra Chain to wallet');
      }
    }
    console.error('Failed to switch to Sidra Chain:', switchError);
    throw switchError;
  }
}

/**
 * Fetch token balance directly from the verified smart contract on Sidra Chain.
 * Respects real token decimals and does not trust frontend inputs.
 */
export async function fetchGmaiBalance(
  walletAddress: string,
  bypassCache: boolean = false
): Promise<TokenBalanceResult> {
  if (!walletAddress) {
    throw new Error('Wallet address is required to fetch token balance.');
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Check cache
  if (!bypassCache) {
    const cached = balanceCache.get(normalizedAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  try {
    // Sidra Chain direct RPC query with timeout protection so mobile never hangs
    const queryBalanceWithProvider = async (prov: any) => {
      const tokenContract = new Contract(GMAI_TOKEN_CONFIG.address, ERC20_ABI, prov);
      const [fetchedDecimals, fetchedBalance, fetchedSymbol] = await Promise.all([
        tokenContract.decimals().catch(() => 18),
        tokenContract.balanceOf(walletAddress),
        tokenContract.symbol().catch(() => GMAI_TOKEN_CONFIG.symbol),
      ]);
      return {
        decimals: Number(fetchedDecimals),
        balanceRaw: BigInt(fetchedBalance.toString()),
        symbol: fetchedSymbol,
      };
    };

    // Primary: Sidra direct RPC node (fastest & most consistent)
    const sidraRpc = getSidraRpcProvider();
    const sidraPromise = queryBalanceWithProvider(sidraRpc);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Sidra RPC read timeout')), 3500)
    );

    let contractData: { decimals: number; balanceRaw: bigint; symbol: string };
    try {
      contractData = await Promise.race([sidraPromise, timeoutPromise]);
    } catch (primaryErr) {
      console.warn('Direct Sidra RPC query error/timeout, checking browser provider fallback:', primaryErr);
      const browserProvider = getBrowserProvider();
      if (browserProvider) {
        const browserPromise = queryBalanceWithProvider(browserProvider);
        const browserTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Browser RPC read timeout')), 2500)
        );
        contractData = await Promise.race([browserPromise, browserTimeout]);
      } else {
        throw primaryErr;
      }
    }

    const { decimals, balanceRaw, symbol } = contractData;
    const formatted = formatUnits(balanceRaw, decimals);
    const numericBalance = parseFloat(formatted);
    const isEligibleToCreate = numericBalance >= GMAI_TOKEN_CONFIG.minCreateRoomBalance;

    const result: TokenBalanceResult = {
      raw: balanceRaw,
      formatted,
      decimals,
      symbol,
      numericBalance,
      isEligibleToCreate,
    };

    // Update cache
    balanceCache.set(normalizedAddress, { result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    console.warn('Unable to verify live GMAI balance on Sidra Chain, returning safe fallback:', error);
    // Safe non-blocking fallback for mobile: return 0 balance without throwing
    const fallbackResult: TokenBalanceResult = {
      raw: 0n,
      formatted: '0',
      decimals: GMAI_TOKEN_CONFIG.defaultDecimals,
      symbol: GMAI_TOKEN_CONFIG.symbol,
      numericBalance: 0,
      isEligibleToCreate: false,
    };
    // Cache for 8 seconds to avoid rapid retries
    balanceCache.set(normalizedAddress, { result: fallbackResult, timestamp: Date.now() - CACHE_TTL_MS + 8000 });
    return fallbackResult;
  }
}
