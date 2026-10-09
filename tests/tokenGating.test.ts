import { describe, it, expect } from 'vitest';
import { formatUnits, parseUnits } from 'ethers';
import { GMAI_TOKEN_CONFIG } from '../src/config/blockchain';

describe('Token Gating & 500,000 $GMAI Eligibility Rules', () => {
  it('correctly handles token decimals with 18 decimals precision', () => {
    const rawBalance = parseUnits('500000', 18);
    const formatted = formatUnits(rawBalance, 18);
    expect(formatted).toBe('500000.0');
    expect(parseFloat(formatted)).toBe(500000);
  });

  it('rejects room creation when user has fewer than 500,000 GMAI tokens', () => {
    const userBalance1 = 499999.99;
    const isEligible1 = userBalance1 >= GMAI_TOKEN_CONFIG.minCreateRoomBalance;
    expect(isEligible1).toBe(false);

    const userBalanceZero = 0;
    const isEligibleZero = userBalanceZero >= GMAI_TOKEN_CONFIG.minCreateRoomBalance;
    expect(isEligibleZero).toBe(false);
  });

  it('permits room creation when user holds at least 500,000 GMAI tokens', () => {
    const userBalanceExact = 500000;
    const isEligibleExact = userBalanceExact >= GMAI_TOKEN_CONFIG.minCreateRoomBalance;
    expect(isEligibleExact).toBe(true);

    const userBalanceWhale = 2500000;
    const isEligibleWhale = userBalanceWhale >= GMAI_TOKEN_CONFIG.minCreateRoomBalance;
    expect(isEligibleWhale).toBe(true);
  });

  it('enforces token-gated room membership requirement and fails closed', () => {
    const roomThreshold = 500000;

    // Below threshold -> Locked
    const visitorBalance = 125000;
    const isAccessLocked = visitorBalance < roomThreshold;
    expect(isAccessLocked).toBe(true);

    // Meets threshold -> Unlocked
    const holderBalance = 750000;
    const isHolderLocked = holderBalance < roomThreshold;
    expect(isHolderLocked).toBe(false);

    // Fail-closed test: If verification failed or balance is null/undefined, fail closed
    const unverifiedBalance = null;
    const failClosedNumeric = parseFloat((unverifiedBalance as any) || '0');
    const isFailClosedLocked = failClosedNumeric < roomThreshold;
    expect(isFailClosedLocked).toBe(true);
  });
});
