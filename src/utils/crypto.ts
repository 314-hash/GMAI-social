import { verifyMessage } from 'ethers';

export function generateNonce(): string {
  // Cryptographically secure random nonce or fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'nonce_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
}

export function constructAuthMessage(params: {
  address: string;
  nonce: string;
  timestamp: number;
  domain?: string;
}): string {
  const domain = params.domain || (typeof window !== 'undefined' ? window.location.host : 'gamemind.ai');
  return [
    'GameMind AI ($GMAI) Authentication Request',
    '',
    'Sign this message to verify your wallet ownership and log in to the GameMind AI Chatroom platform on Sidra Chain.',
    '',
    `Domain: ${domain}`,
    `Wallet: ${params.address.toLowerCase()}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${new Date(params.timestamp).toISOString()}`,
    '',
    'Notice: This request will not trigger any blockchain transaction or cost gas.'
  ].join('\n');
}

export function verifyAuthSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
