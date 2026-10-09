import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ChatRoom, ChatMessage, UserPresence } from '../types/chat';
import { useWallet } from './WalletContext';
import {
  subscribeToChatRooms,
  registerChatRoom,
  subscribeToRoomMessages,
  sendRoomMessage,
  toggleMessageReaction,
  deleteMessage,
  togglePinMessage,
  subscribeToPresence,
} from '../services/gun';
import { sanitizeMessage } from '../utils/sanitize';

interface ChatContextType {
  rooms: ChatRoom[];
  activeRoom: ChatRoom;
  messages: ChatMessage[];
  unreadCounts: Record<string, number>;
  onlineUsers: UserPresence[];
  isGatedLocked: boolean;
  activeRoomMinBalance: number;
  blockedUsers: string[];
  setActiveRoomId: (roomId: string) => void;
  createRoom: (roomData: Omit<ChatRoom, 'id' | 'createdAt' | 'status'>) => Promise<ChatRoom>;
  sendMessage: (text: string) => Promise<void>;
  reactMessage: (messageId: string, emoji: string) => Promise<void>;
  removeMessage: (messageId: string) => Promise<void>;
  pinMessage: (messageId: string, currentStatus: boolean) => Promise<void>;
  blockUser: (address: string) => void;
  unblockUser: (address: string) => void;
}

const DEFAULT_ROOMS: ChatRoom[] = [
  {
    id: 'general',
    name: 'GameMind AI Community',
    slug: 'community-general',
    description: 'The main community room for all GameMind AI ($GMAI) players, builders, and enthusiasts on Sidra Chain.',
    category: 'general',
    isTokenGated: false,
    minGmaiBalance: 0,
    creatorAddress: '0x0000000000000000000000000000000000000000',
    creatorUsername: 'GameMind System',
    createdAt: 1718000000000,
    status: 'active',
    rules: 'Be respectful. No spam or harmful links. Enjoy discussing AI & Web3 gaming!',
  },
  {
    id: 'ai-agents',
    name: 'Autonomous AI Agents',
    slug: 'ai-agents-hub',
    description: 'Explore neural game characters, autonomous NPC agents, and Mindverse cognitive logic.',
    category: 'ai-agents',
    isTokenGated: false,
    minGmaiBalance: 0,
    creatorAddress: '0x0000000000000000000000000000000000000000',
    creatorUsername: 'GameMind System',
    createdAt: 1718000001000,
    status: 'active',
    rules: 'Share AI prompts, fine-tuning methodologies, and game logic integration.',
  },
  {
    id: 'gmai-vip-lounge',
    name: 'GMAI Alpha Syndicate',
    slug: 'gmai-alpha-syndicate',
    description: 'Exclusive token-gated sanctum for verified holders of 500,000+ $GMAI tokens on Sidra Chain.',
    category: 'trading',
    isTokenGated: true,
    minGmaiBalance: 500000,
    creatorAddress: '0x4765561e63914E72168bBd2A7e2ce72F9057ca04',
    creatorUsername: 'Founders Council',
    createdAt: 1718000002000,
    status: 'active',
    rules: 'High-tier holders only. Confidential ecosystem strategy, governance, and early alpha.',
  },
  {
    id: 'metaverse-gaming',
    name: '3D Metaverse & Guilds',
    slug: 'metaverse-guilds',
    description: 'Esports, guild coordination, modular worlds, and 3D metaverse tournaments.',
    category: 'gaming',
    isTokenGated: false,
    minGmaiBalance: 0,
    creatorAddress: '0x0000000000000000000000000000000000000000',
    creatorUsername: 'GameMind System',
    createdAt: 1718000003000,
    status: 'active',
    rules: 'Raid coordination, clan recruiting, and gameplay media sharing.',
  },
];

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, authSession, balanceInfo, refreshBalance } = useWallet();

  const [roomsMap, setRoomsMap] = useState<Map<string, ChatRoom>>(() => {
    const map = new Map<string, ChatRoom>();
    DEFAULT_ROOMS.forEach(r => map.set(r.id, r));
    return map;
  });

  const [activeRoomId, setActiveRoomIdState] = useState<string>('general');
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineUsersMap, setOnlineUsersMap] = useState<Map<string, UserPresence>>(new Map());
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gmai_blocked_users') || '[]');
    } catch {
      return [];
    }
  });

  // Rate limiter ref to prevent spamming
  const lastMessageTimeRef = useRef<number>(0);

  // Active room object fallback guaranteed
  const activeRoom = roomsMap.get(activeRoomId) || DEFAULT_ROOMS[0];

  // Token-gate evaluation for the active room
  const userNumericBalance = parseFloat(balanceInfo.formatted || '0');
  const isGatedLocked = Boolean(
    activeRoom.isTokenGated && userNumericBalance < activeRoom.minGmaiBalance
  );

  // Switch room
  const setActiveRoomId = useCallback((roomId: string) => {
    setActiveRoomIdState(roomId);
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
    refreshBalance(true);
  }, [refreshBalance]);

  // Subscribe to rooms in Gun
  useEffect(() => {
    const unsubscribe = subscribeToChatRooms((room: ChatRoom) => {
      setRoomsMap(prev => {
        const next = new Map(prev);
        next.set(room.id, room);
        return next;
      });
    });
    return unsubscribe;
  }, []);

  // Subscribe to messages in active room
  useEffect(() => {
    if (!activeRoomId) return;

    // Reset messages for new room
    setMessagesMap(new Map());

    const unsubscribe = subscribeToRoomMessages(activeRoomId, (msg: ChatMessage) => {
      if (!msg || !msg.text) return;

      setMessagesMap(prev => {
        const next = new Map(prev);
        next.set(msg.id, msg);
        return next;
      });

      // Track unread if not currently viewing
      if (msg.roomId && msg.roomId !== activeRoomId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.roomId]: (prev[msg.roomId] || 0) + 1,
        }));
      }
    });

    return unsubscribe;
  }, [activeRoomId]);

  // Subscribe to presence
  useEffect(() => {
    const unsubscribe = subscribeToPresence((user: UserPresence) => {
      if (!user || !user.address) return;
      setOnlineUsersMap(prev => {
        const next = new Map(prev);
        // Only keep users active in last 10 minutes
        if (Date.now() - user.lastSeen < 10 * 60 * 1000) {
          next.set(user.address.toLowerCase(), user);
        } else {
          next.delete(user.address.toLowerCase());
        }
        return next;
      });
    });
    return unsubscribe;
  }, []);

  // Post message handler with optimistic update, rate limit, and validation
  const sendMessage = useCallback(
    async (text: string) => {
      if (!authSession || !address) {
        throw new Error('Please connect your wallet and authenticate to chat.');
      }

      if (isGatedLocked) {
        throw new Error(
          `Insufficient GMAI balance. You need at least ${activeRoom.minGmaiBalance.toLocaleString()} GMAI to speak in this room.`
        );
      }

      const now = Date.now();
      // Rate limit: 1.2 second cooldown
      if (now - lastMessageTimeRef.current < 1200) {
        throw new Error('Please slow down. Anti-spam cooldown is active.');
      }

      const sanitized = sanitizeMessage(text, 500);
      if (!sanitized) {
        throw new Error('Message cannot be empty.');
      }

      lastMessageTimeRef.current = now;

      // 1. Optimistic message creation
      const optimisticId = `msg_${now}_${Math.random().toString(36).substr(2, 6)}`;
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        roomId: activeRoomId,
        senderAddress: address,
        senderUsername: authSession.username,
        text: sanitized,
        timestamp: now,
        reactions: {},
        isPinned: false,
        isDeleted: false,
      };

      // Add to local state immediately
      setMessagesMap(prev => {
        const next = new Map(prev);
        next.set(optimisticId, optimisticMsg);
        return next;
      });

      // 2. Broadcast to Gun graph
      try {
        await sendRoomMessage(activeRoomId, optimisticMsg);
      } catch (err) {
        console.warn('Gun message broadcast warning:', err);
      }
    },
    [activeRoomId, authSession, address, isGatedLocked, activeRoom.minGmaiBalance]
  );

  // Create room
  const createRoom = useCallback(
    async (roomData: Omit<ChatRoom, 'id' | 'createdAt' | 'status'>): Promise<ChatRoom> => {
      if (!authSession || !address) {
        throw new Error('Wallet authentication required to create a chatroom.');
      }

      // Re-verify balance
      const currentBal = parseFloat(balanceInfo.formatted || '0');
      if (currentBal < 500000) {
        throw new Error(
          `Insufficient token balance! You have ${currentBal.toLocaleString()} GMAI, but 500,000 GMAI is required.`
        );
      }

      const newRoom: ChatRoom = {
        ...roomData,
        id: roomData.slug,
        createdAt: Date.now(),
        status: 'active',
      };

      await registerChatRoom(newRoom);

      setRoomsMap(prev => {
        const next = new Map(prev);
        next.set(newRoom.id, newRoom);
        return next;
      });

      setActiveRoomIdState(newRoom.id);
      return newRoom;
    },
    [authSession, address, balanceInfo.formatted]
  );

  // Toggle reaction
  const reactMessage = useCallback(
    async (messageId: string, emoji: string) => {
      if (!address) return;
      await toggleMessageReaction(activeRoomId, messageId, emoji, address);
    },
    [activeRoomId, address]
  );

  // Delete message
  const removeMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(activeRoomId, messageId);
      setMessagesMap(prev => {
        const next = new Map(prev);
        const item = next.get(messageId);
        if (item) {
          next.set(messageId, { ...item, isDeleted: true });
        }
        return next;
      });
    },
    [activeRoomId]
  );

  // Pin message
  const pinMessage = useCallback(
    async (messageId: string, currentStatus: boolean) => {
      await togglePinMessage(activeRoomId, messageId, currentStatus);
      setMessagesMap(prev => {
        const next = new Map(prev);
        const item = next.get(messageId);
        if (item) {
          next.set(messageId, { ...item, isPinned: !currentStatus });
        }
        return next;
      });
    },
    [activeRoomId]
  );

  // Block/unblock user
  const blockUser = useCallback((userAddress: string) => {
    if (!userAddress) return;
    setBlockedUsers(prev => {
      const next = [...prev, userAddress.toLowerCase()];
      localStorage.setItem('gmai_blocked_users', JSON.stringify(next));
      return next;
    });
  }, []);

  const unblockUser = useCallback((userAddress: string) => {
    if (!userAddress) return;
    setBlockedUsers(prev => {
      const next = prev.filter(a => a !== userAddress.toLowerCase());
      localStorage.setItem('gmai_blocked_users', JSON.stringify(next));
      return next;
    });
  }, []);

  // Sorted messages (by timestamp) with safe defensive checks and duplicate prevention
  const seenMessageKeys = new Set<string>();
  const messagesList = Array.from(messagesMap.values())
    .filter(m => {
      if (!m || !m.text) return false;
      const sender = (m.senderAddress || '').toLowerCase();
      if (blockedUsers.includes(sender)) return false;

      // Deduplicate: same sender + same text within a 3-second window
      const timeBucket = Math.floor((Number(m.timestamp) || 0) / 3000);
      const dedupeKey = `${sender}:${m.text.trim()}:${timeBucket}`;
      if (seenMessageKeys.has(dedupeKey)) {
        return false;
      }
      seenMessageKeys.add(dedupeKey);
      return true;
    })
    .sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));

  const roomsList = Array.from(roomsMap.values());
  const onlineList = Array.from(onlineUsersMap.values());

  return (
    <ChatContext.Provider
      value={{
        rooms: roomsList,
        activeRoom,
        messages: messagesList,
        unreadCounts,
        onlineUsers: onlineList,
        isGatedLocked,
        activeRoomMinBalance: activeRoom.minGmaiBalance,
        blockedUsers,
        setActiveRoomId,
        createRoom,
        sendMessage,
        reactMessage,
        removeMessage,
        pinMessage,
        blockUser,
        unblockUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
