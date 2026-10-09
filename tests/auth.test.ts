import { describe, it, expect, beforeEach } from 'vitest';
import { Wallet } from 'ethers';
import {
  createAuthChallenge,
  completeAuthentication,
  isUsernameAvailable,
  registerUsername,
  getStoredSession,
  clearSession,
} from '../src/services/auth';
import { validateUsername } from '../src/utils/sanitize';
import { verifyAuthSignature } from '../src/utils/crypto';

if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
  };
}

describe('User Authentication & Identity Security', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates username format and rejects illegal characters', () => {
    expect(validateUsername('CyberAce').valid).toBe(true);
    expect(validateUsername('user_123').valid).toBe(true);

    // Too short
    expect(validateUsername('ab').valid).toBe(false);
    // Too long
    expect(validateUsername('a'.repeat(21)).valid).toBe(false);
    // Illegal characters
    expect(validateUsername('user!@#').valid).toBe(false);
    expect(validateUsername('user name').valid).toBe(false);
    // Reserved system keywords
    expect(validateUsername('admin').valid).toBe(false);
    expect(validateUsername('system').valid).toBe(false);
  });

  it('enforces username uniqueness and prevents wallet impersonation', () => {
    const wallet1 = '0x1111111111111111111111111111111111111111';
    const wallet2 = '0x2222222222222222222222222222222222222222';

    registerUsername('ApexGamer', wallet1);

    // Same wallet can re-use/keep its username
    expect(isUsernameAvailable('ApexGamer', wallet1)).toBe(true);

    // Another wallet CANNOT impersonate or steal this username
    expect(isUsernameAvailable('ApexGamer', wallet2)).toBe(false);
    expect(() => registerUsername('ApexGamer', wallet2)).toThrow(/already claimed/);
  });

  it('performs cryptographic challenge creation and signature verification', async () => {
    // Generate an ephemeral test wallet
    const testWallet = Wallet.createRandom();
    const address = await testWallet.getAddress();

    const { challenge, nonce, timestamp } = createAuthChallenge(address);

    expect(challenge).toContain(address.toLowerCase());
    expect(challenge).toContain(nonce);

    // Sign message with private key
    const signature = await testWallet.signMessage(challenge);

    // Verify valid signature
    const isValid = verifyAuthSignature(challenge, signature, address);
    expect(isValid).toBe(true);

    // Reject counterfeit address verification
    const isCounterfeitValid = verifyAuthSignature(
      challenge,
      signature,
      '0x0000000000000000000000000000000000000000'
    );
    expect(isCounterfeitValid).toBe(false);
  });

  it('completes authentication and stores verified session', async () => {
    const testWallet = Wallet.createRandom();
    const address = await testWallet.getAddress();
    const { challenge, nonce, timestamp } = createAuthChallenge(address);
    const signature = await testWallet.signMessage(challenge);

    const session = completeAuthentication({
      address,
      username: 'ShadowWarrior',
      signature,
      nonce,
      timestamp,
      challenge,
    });

    expect(session.address).toBe(address.toLowerCase());
    expect(session.username).toBe('ShadowWarrior');

    const stored = getStoredSession();
    expect(stored?.address).toBe(address.toLowerCase());

    clearSession();
    expect(getStoredSession()).toBeNull();
  });
});
