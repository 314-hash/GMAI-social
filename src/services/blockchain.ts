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

export function getBrowserProvider(): BrowserProvider | null {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new BrowserProvider((window as any).ethereum);
  }
  return null;
}

/**
 * Switch the user's wallet to Sidra Chain (Chain ID: 97453).
 * If the chain isn't added, calls wallet_addEthereumChain.
 */
export async function switchToSidraChain(): Promise<boolean> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('No EVM wallet detected. Please install MetaMask or another EVM wallet.');
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
    // We query using the Sidra RPC directly or browser provider to guarantee reading Sidra network
    let provider: any = null;
    const browserProvider = getBrowserProvider();

    if (browserProvider) {
      try {
        const net = await browserProvider.getNetwork();
        if (Number(net.chainId) === SIDRA_CHAIN_CONFIG.chainId) {
          provider = browserProvider;
        }
      } catch {
        // Fall back to direct RPC
      }
    }

    if (!provider) {
      provider = getSidraRpcProvider();
    }

    const tokenContract = new Contract(GMAI_TOKEN_CONFIG.address, ERC20_ABI, provider);

    // Read decimals and balance concurrently
    let decimals = GMAI_TOKEN_CONFIG.defaultDecimals;
    let balanceRaw: bigint = 0n;
    let symbol = GMAI_TOKEN_CONFIG.symbol;

    try {
      const [fetchedDecimals, fetchedBalance, fetchedSymbol] = await Promise.all([
        tokenContract.decimals().catch(() => 18),
        tokenContract.balanceOf(walletAddress),
        tokenContract.symbol().catch(() => GMAI_TOKEN_CONFIG.symbol),
      ]);
      decimals = Number(fetchedDecimals);
      balanceRaw = BigInt(fetchedBalance.toString());
      symbol = fetchedSymbol;
    } catch (readError: any) {
      console.warn('RPC contract read error, retrying with fallback RPC provider:', readError);
      // Secondary attempt with dedicated JsonRpcProvider
      const directRpc = getSidraRpcProvider();
      const fallbackContract = new Contract(GMAI_TOKEN_CONFIG.address, ERC20_ABI, directRpc);
      const [fetchedDecimals, fetchedBalance] = await Promise.all([
        fallbackContract.decimals().catch(() => 18),
        fallbackContract.balanceOf(walletAddress),
      ]);
      decimals = Number(fetchedDecimals);
      balanceRaw = BigInt(fetchedBalance.toString());
    }

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
    console.error('Failed to read GMAI balance from Sidra contract:', error);
    throw new Error(
      error?.message || 'Unable to verify GMAI balance on Sidra Chain. Please check your connection.'
    );
  }
}
