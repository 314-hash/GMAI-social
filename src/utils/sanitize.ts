export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: 'Username is required.' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must not exceed 20 characters.' };
  }
  // Allow letters, numbers, and underscores
  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores (_).' };
  }
  
  // Prohibit reserved system keywords
  const reserved = ['system', 'admin', 'moderator', 'gmai', 'support', 'bot'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: `The username "${trimmed}" is reserved.` };
  }

  return { valid: true };
}

export function sanitizeMessage(content: string, maxLength: number = 500): string {
  if (!content) return '';
  let cleaned = content.trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  // Strip dangerous html script tags
  cleaned = cleaned
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return cleaned;
}

export function validateRoomSlug(slug: string): { valid: boolean; error?: string } {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) {
    return { valid: false, error: 'Room identifier is required.' };
  }
  if (trimmed.length < 3 || trimmed.length > 32) {
    return { valid: false, error: 'Room identifier must be 3-32 characters.' };
  }
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Room identifier can only contain lowercase letters, numbers, hyphens, and underscores.' };
  }
  return { valid: true };
}
