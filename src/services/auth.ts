import { AuthSession } from '../types/wallet';
import { generateNonce, constructAuthMessage, verifyAuthSignature } from '../utils/crypto';
import { validateUsername } from '../utils/sanitize';

const SESSION_STORAGE_KEY = 'gmai_auth_session';
const USERNAME_REGISTRY_KEY = 'gmai_registered_usernames';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RegisteredUser {
  username: string;
  address: string;
  registeredAt: number;
}

/**
 * Get the current active session from storage if still valid
 */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() - session.timestamp > SESSION_EXPIRY_MS) {
      clearSession();
      return null;
    }
    return session;
  } catch (e) {
    console.error('Error reading auth session:', e);
    return null;
  }
}

/**
 * Save auth session to localStorage
 */
export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Clear stored auth session
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Retrieve all registered usernames mapping to addresses
 */
export function getRegisteredUsers(): Record<string, RegisteredUser> {
  try {
    const raw = localStorage.getItem(USERNAME_REGISTRY_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Check if a username is available.
 * Returns true if not taken or if owned by the same address.
 */
export function isUsernameAvailable(username: string, walletAddress: string): boolean {
  const users = getRegisteredUsers();
  const lowerName = username.trim().toLowerCase();
  const existing = users[lowerName];
  if (!existing) return true;
  return existing.address.toLowerCase() === walletAddress.toLowerCase();
}

/**
 * Register a username for a verified wallet address.
 */
export function registerUsername(username: string, walletAddress: string): void {
  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid username.');
  }

  const normalized = username.trim().toLowerCase();
  const address = walletAddress.toLowerCase();
  const users = getRegisteredUsers();

  const existing = users[normalized];
  if (existing && existing.address.toLowerCase() !== address) {
    throw new Error(`Username "${username}" is already claimed by another wallet address.`);
  }

  users[normalized] = {
    username: username.trim(),
    address,
    registeredAt: Date.now(),
  };

  localStorage.setItem(USERNAME_REGISTRY_KEY, JSON.stringify(users));
}

/**
 * Lookup username for a wallet address if already registered
 */
export function getUsernameForAddress(walletAddress: string): string | null {
  const users = getRegisteredUsers();
  const target = walletAddress.toLowerCase();
  for (const record of Object.values(users)) {
    if (record.address.toLowerCase() === target) {
      return record.username;
    }
  }
  return null;
}

/**
 * Generate a challenge message for the wallet to sign.
 */
export function createAuthChallenge(address: string): { challenge: string; nonce: string; timestamp: number } {
  const nonce = generateNonce();
  const timestamp = Date.now();
  const challenge = constructAuthMessage({ address, nonce, timestamp });
  return { challenge, nonce, timestamp };
}

/**
 * Complete authentication: verify cryptographic signature, register username, and persist session.
 */
export function completeAuthentication(params: {
  address: string;
  username: string;
  signature: string;
  nonce: string;
  timestamp: number;
  challenge: string;
}): AuthSession {
  const { address, username, signature, nonce, timestamp, challenge } = params;

  // 1. Verify cryptographic signature
  const isValid = verifyAuthSignature(challenge, signature, address);
  if (!isValid) {
    throw new Error('Signature verification failed! Wallet ownership could not be verified.');
  }

  // 2. Validate and register unique username
  registerUsername(username, address);

  // 3. Create session
  const session: AuthSession = {
    address: address.toLowerCase(),
    username: username.trim(),
    signature,
    nonce,
    timestamp,
  };

  saveSession(session);
  return session;
}
