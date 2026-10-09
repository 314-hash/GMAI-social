import { describe, it, expect, beforeEach } from 'vitest';
import { getInjectedProvider, getWalletProvider, setActiveProvider } from '../src/services/blockchain';

describe('SafePal & Multi-Wallet Provider Resolution', () => {
  beforeEach(() => {
    setActiveProvider(null);
    delete (globalThis as any).window;
  });

  it('detects window.safepalProvider directly for SafePal wallet', () => {
    const mockSafePal = {
      isSafePal: true,
      request: async ({ method }: any) => {
        if (method === 'eth_accounts') return ['0xSafePalUser123'];
        return null;
      },
    };

    (globalThis as any).window = {
      safepalProvider: mockSafePal,
    };

    const provider = getWalletProvider('safepal');
    expect(provider).toBe(mockSafePal);
    expect(getInjectedProvider()).toBe(mockSafePal);
  });

  it('detects SafePal inside window.ethereum.providers array when multiple extensions installed', () => {
    const mockMetaMask = { isMetaMask: true, request: async () => {} };
    const mockSafePal = { isSafePal: true, request: async () => {} };

    (globalThis as any).window = {
      ethereum: {
        providers: [mockMetaMask, mockSafePal],
      },
    };

    const provider = getWalletProvider('safepal');
    expect(provider).toBe(mockSafePal);
  });

  it('does not select a namespace object lacking the request method', () => {
    const brokenSafePalNamespace = { version: '1.0.0' }; // missing request()
    const validEthereum = { isMetaMask: true, request: async () => {} };

    (globalThis as any).window = {
      safePal: brokenSafePalNamespace,
      ethereum: validEthereum,
    };

    const provider = getInjectedProvider();
    expect(provider).toBe(validEthereum);
  });

  it('detects window.pinetswapProvider directly for PinetSwap wallet', () => {
    const mockPinetSwap = {
      isPinetSwap: true,
      request: async ({ method }: any) => {
        if (method === 'eth_accounts') return ['0xPinetSwapUser456'];
        return null;
      },
    };

    (globalThis as any).window = {
      pinetswapProvider: mockPinetSwap,
    };

    const provider = getWalletProvider('pinetswap');
    expect(provider).toBe(mockPinetSwap);
    expect(getInjectedProvider()).toBe(mockPinetSwap);
  });

  it('detects PinetSwap inside window.ethereum with isPinetSwap flag', () => {
    const mockPinetEthereum = {
      isPinetSwap: true,
      request: async () => {},
    };

    (globalThis as any).window = {
      ethereum: mockPinetEthereum,
    };

    const provider = getWalletProvider('pinetswap');
    expect(provider).toBe(mockPinetEthereum);
  });
});
