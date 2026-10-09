import { GUN_PEERS } from '../config/blockchain';
import { ChatMessage, ChatRoom, UserPresence } from '../types/chat';

// Gun instance singleton
let gunInstance: any = null;

export function getGun(): any {
  if (gunInstance) return gunInstance;

  // Use window.Gun if loaded via CDN / script tag, or require/import
  const GunConstructor = (typeof window !== 'undefined' && (window as any).Gun) 
    ? (window as any).Gun 
    : null;

  if (GunConstructor) {
    try {
      gunInstance = GunConstructor({
        peers: GUN_PEERS,
        localStorage: true,
        radisk: true,
      });
      console.log('⚡ Gun.js initialized with peers:', GUN_PEERS);
      return gunInstance;
    } catch (err) {
      console.warn('Gun constructor error, falling back to local-only Gun instance:', err);
    }
  }

  // In-memory / storage fallback mock if Gun is unavailable
  console.warn('Gun.js library not detected on window, initializing resilient in-memory Gun relay mock');
  gunInstance = createLocalGunFallback();
  return gunInstance;
}

/**
 * Robust in-memory & localStorage fallback emulator if Gun network is restricted
 */
function createLocalGunFallback() {
  const listeners: Record<string, Function[]> = {};

  return {
    get(nodeName: string) {
      return {
        get(childName: string) {
          const key = `${nodeName}/${childName}`;
          return {
            put(data: any, cb?: Function) {
              try {
                localStorage.setItem(`gun_${key}`, JSON.stringify(data));
                if (listeners[key]) {
                  listeners[key].forEach(fn => fn(data, childName));
                }
                if (cb) cb({ ok: 1 });
              } catch (e) {
                if (cb) cb({ err: e });
              }
            },
            on(cb: Function) {
              if (!listeners[key]) listeners[key] = [];
              listeners[key].push(cb);
              try {
                const existing = localStorage.getItem(`gun_${key}`);
                if (existing) cb(JSON.parse(existing), childName);
              } catch {}
            },
            once(cb: Function) {
              try {
                const existing = localStorage.getItem(`gun_${key}`);
                if (existing) cb(JSON.parse(existing));
                else cb(null);
              } catch {
                cb(null);
              }
            }
          };
        },
        map() {
          return {
            on(cb: Function) {
              const prefix = `gun_${nodeName}/`;
              // Emit existing
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix)) {
                  const subKey = k.replace(prefix, '');
                  try {
                    cb(JSON.parse(localStorage.getItem(k)!), subKey);
                  } catch {}
                }
              }
              if (!listeners[nodeName]) listeners[nodeName] = [];
              listeners[nodeName].push(cb);
            },
            once(cb: Function) {
              const prefix = `gun_${nodeName}/`;
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix)) {
                  const subKey = k.replace(prefix, '');
                  try {
                    cb(JSON.parse(localStorage.getItem(k)!), subKey);
                  } catch {}
                }
              }
            },
            off() {}
          };
        },
        set(data: any, cb?: Function) {
          const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          const key = `${nodeName}/${id}`;
          try {
            localStorage.setItem(`gun_${key}`, JSON.stringify(data));
            if (listeners[nodeName]) {
              listeners[nodeName].forEach(fn => fn(data, id));
            }
            if (cb) cb({ ok: 1 });
          } catch (e) {
            if (cb) cb({ err: e });
          }
        }
      };
    }
  };
}

// Global node names
export const ROOMS_NODE = 'gmai_all_rooms';
export const PRESENCE_NODE = 'gmai_presence';

/**
 * Post a new message into a room's Gun node
 */
export async function sendRoomMessage(roomId: string, message: Omit<ChatMessage, 'id'>): Promise<string> {
  const gun = getGun();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  const fullMessage: ChatMessage = {
    ...message,
    id: messageId,
    reactions: {},
    isPinned: false,
    isDeleted: false,
  };

  return new Promise((resolve, reject) => {
    try {
      const roomNode = gun.get(`gmai_room_messages_${roomId}`);
      roomNode.get(messageId).put(fullMessage, (ack: any) => {
        if (ack && ack.err) {
          console.error('Gun error saving message:', ack.err);
          // Still resolve for graceful offline/local experience
          resolve(messageId);
        } else {
          resolve(messageId);
        }
      });
    } catch (e) {
      console.error('Failed to post message to Gun graph:', e);
      reject(e);
    }
  });
}

/**
 * Subscribe to real-time messages in a room
 */
export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  const gun = getGun();
  const roomNode = gun.get(`gmai_room_messages_${roomId}`);

  let active = true;

  try {
    roomNode.map().on((data: any, key: string) => {
      if (!active || !data) return;
      if (typeof data === 'object' && data.text && data.senderUsername && data.timestamp) {
        // Clean reactions if stringified
        let reactions = data.reactions;
        if (typeof reactions === 'string') {
          try { reactions = JSON.parse(reactions); } catch { reactions = {}; }
        }

        const msg: ChatMessage = {
          id: key || data.id,
          roomId,
          senderAddress: data.senderAddress || '',
          senderUsername: data.senderUsername || 'Anonymous',
          text: data.text || '',
          timestamp: Number(data.timestamp) || Date.now(),
          reactions: reactions || {},
          isPinned: !!data.isPinned,
          isDeleted: !!data.isDeleted,
        };
        onMessage(msg);
      }
    });
  } catch (err) {
    console.error(`Error subscribing to room ${roomId}:`, err);
  }

  return () => {
    active = false;
    try {
      roomNode.map().off();
    } catch {}
  };
}

/**
 * Add or toggle an emoji reaction on a message
 */
export async function toggleMessageReaction(
  roomId: string,
  messageId: string,
  emoji: string,
  userAddress: string
): Promise<void> {
  const gun = getGun();
  const msgNode = gun.get(`gmai_room_messages_${roomId}`).get(messageId);

  msgNode.once((data: any) => {
    if (!data) return;
    let reactions: Record<string, string[]> = {};
    if (typeof data.reactions === 'string') {
      try { reactions = JSON.parse(data.reactions); } catch {}
    } else if (typeof data.reactions === 'object' && data.reactions !== null) {
      reactions = { ...data.reactions };
    }

    const currentUsers = reactions[emoji] ? [...reactions[emoji]] : [];
    const lowerAddress = userAddress.toLowerCase();
    const index = currentUsers.findIndex(a => a.toLowerCase() === lowerAddress);

    if (index >= 0) {
      // Remove reaction
      currentUsers.splice(index, 1);
    } else {
      // Add reaction
      currentUsers.push(lowerAddress);
    }

    if (currentUsers.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = currentUsers;
    }

    // Save back to Gun
    msgNode.get('reactions').put(JSON.stringify(reactions));
  });
}

/**
 * Moderate: Hide or delete a message
 */
export async function deleteMessage(roomId: string, messageId: string): Promise<void> {
  const gun = getGun();
  gun.get(`gmai_room_messages_${roomId}`).get(messageId).get('isDeleted').put(true);
}

/**
 * Moderate: Pin/unpin a message
 */
export async function togglePinMessage(roomId: string, messageId: string, currentPinStatus: boolean): Promise<void> {
  const gun = getGun();
  gun.get(`gmai_room_messages_${roomId}`).get(messageId).get('isPinned').put(!currentPinStatus);
}

/**
 * Create a new chatroom and register it in the global directory
 */
export async function registerChatRoom(room: ChatRoom): Promise<void> {
  const gun = getGun();
  return new Promise((resolve, reject) => {
    try {
      gun.get(ROOMS_NODE).get(room.id).put(room, (ack: any) => {
        if (ack && ack.err) {
          reject(new Error(ack.err));
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Subscribe to all registered chatrooms
 */
export function subscribeToChatRooms(onRoom: (room: ChatRoom) => void): () => void {
  const gun = getGun();
  let active = true;

  try {
    gun.get(ROOMS_NODE).map().on((data: any, key: string) => {
      if (!active || !data) return;
      if (typeof data === 'object' && data.name && data.slug) {
        const room: ChatRoom = {
          id: key || data.id,
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          category: data.category || 'general',
          isTokenGated: !!data.isTokenGated,
          minGmaiBalance: Number(data.minGmaiBalance) || 0,
          creatorAddress: data.creatorAddress || '',
          creatorUsername: data.creatorUsername || 'GameMind AI',
          createdAt: Number(data.createdAt) || Date.now(),
          rules: data.rules || '',
          icon: data.icon || '',
          status: data.status || 'active',
        };
        onRoom(room);
      }
    });
  } catch (err) {
    console.error('Error listening to chat rooms:', err);
  }

  return () => {
    active = false;
  };
}

/**
 * Update user presence in Gun
 */
export function broadcastPresence(presence: UserPresence): void {
  const gun = getGun();
  try {
    gun.get(PRESENCE_NODE).get(presence.address.toLowerCase()).put(presence);
  } catch {}
}

/**
 * Subscribe to presence updates
 */
export function subscribeToPresence(onPresence: (presence: UserPresence) => void): () => void {
  const gun = getGun();
  let active = true;

  try {
    gun.get(PRESENCE_NODE).map().on((data: any) => {
      if (!active || !data) return;
      if (typeof data === 'object' && data.address && data.username) {
        onPresence({
          address: data.address,
          username: data.username,
          status: data.status || 'online',
          lastSeen: Number(data.lastSeen) || Date.now(),
        });
      }
    });
  } catch {}

  return () => {
    active = false;
  };
}
