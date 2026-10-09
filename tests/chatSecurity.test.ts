import { describe, it, expect } from 'vitest';
import { sanitizeMessage, validateRoomSlug } from '../src/utils/sanitize';

describe('Chat Security, Anti-Spam & Input Sanitization', () => {
  it('sanitizes malicious HTML and script tags to prevent XSS attacks', () => {
    const malicious = '<script>alert("hacked")</script>Hello World!';
    const sanitized = sanitizeMessage(malicious);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
    expect(sanitized).toContain('Hello World!');
  });

  it('enforces 500-character upper bound message truncation', () => {
    const longMessage = 'A'.repeat(600);
    const sanitized = sanitizeMessage(longMessage, 500);

    expect(sanitized.length).toBe(500);
  });

  it('validates chatroom slugs and prohibits illegal syntax', () => {
    expect(validateRoomSlug('gaming-zone').valid).toBe(true);
    expect(validateRoomSlug('alpha_mind_123').valid).toBe(true);

    // Too short
    expect(validateRoomSlug('ab').valid).toBe(false);
    // Spaces not allowed
    expect(validateRoomSlug('gaming zone').valid).toBe(false);
    // Special symbols prohibited
    expect(validateRoomSlug('gaming$zone!').valid).toBe(false);
  });
});
