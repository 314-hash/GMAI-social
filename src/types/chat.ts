export type RoomCategory =
  | 'general'
  | 'gaming'
  | 'ai-agents'
  | 'metaverse'
  | 'guilds'
  | 'trading'
  | 'development';

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[]; // addresses that reacted
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderAddress: string;
  senderUsername: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji -> array of user addresses
  isPinned?: boolean;
  isDeleted?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: RoomCategory;
  isTokenGated: boolean;
  minGmaiBalance: number;
  creatorAddress: string;
  creatorUsername: string;
  createdAt: number;
  rules?: string;
  icon?: string;
  status: 'active' | 'archived';
  messageCount?: number;
}

export interface UserPresence {
  address: string;
  username: string;
  status: 'online' | 'offline' | 'idle';
  lastSeen: number;
}
