import { GUN_PEERS } from '../config/blockchain';
import { ChatMessage, ChatRoom, UserPresence } from '../types/chat';

// Gun instance singleton
let gunInstance: any = null;

export function getGun(): any {
  if (gunInstance) return gunInstance;

  // Use window.Gun if loaded via CDN / script tag
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

  console.warn('Gun.js library initializing resilient in-memory & local Gun relay mock');
  gunInstance = createLocalGunFallback();
  return gunInstance;
}

/**
 * Robust in-memory & localStorage fallback emulator if Gun network is restricted
 */
function createLocalGunFallback() {
  const nodeListeners: Record<string, Function[]> = {};

  return {
    get(nodeName: string) {
      return {
        get(childName: string) {
          const itemKey = `${nodeName}/${childName}`;
          return {
            put(data: any, cb?: Function) {
              try {
                localStorage.setItem(`gun_${itemKey}`, JSON.stringify(data));
                
                // Notify child listeners
                if (nodeListeners[itemKey]) {
                  nodeListeners[itemKey].forEach(fn => fn(data, childName));
                }

                // Notify parent map listeners
                if (nodeListeners[nodeName]) {
                  nodeListeners[nodeName].forEach(fn => fn(data, childName));
                }

                if (cb) cb({ ok: 1 });
              } catch (e) {
                if (cb) cb({ err: e });
              }
            },
            on(cb: Function) {
              if (!nodeListeners[itemKey]) nodeListeners[itemKey] = [];
              nodeListeners[itemKey].push(cb);
              try {
                const existing = localStorage.getItem(`gun_${itemKey}`);
                if (existing) cb(JSON.parse(existing), childName);
              } catch {}
            },
            once(cb: Function) {
              try {
                const existing = localStorage.getItem(`gun_${itemKey}`);
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
              // Emit existing keys
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix)) {
                  const subKey = k.replace(prefix, '');
                  try {
                    cb(JSON.parse(localStorage.getItem(k)!), subKey);
                  } catch {}
                }
              }
              if (!nodeListeners[nodeName]) nodeListeners[nodeName] = [];
              nodeListeners[nodeName].push(cb);
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
          const itemKey = `${nodeName}/${id}`;
          try {
            localStorage.setItem(`gun_${itemKey}`, JSON.stringify(data));
            if (nodeListeners[nodeName]) {
              nodeListeners[nodeName].forEach(fn => fn(data, id));
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
export async function sendRoomMessage(
  roomId: string,
  message: ChatMessage | (Omit<ChatMessage, 'id'> & { id?: string })
): Promise<string> {
  const gun = getGun();
  const messageId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  
  // Format payload with flat primitive values for Gun graph stability
  const payload = {
    id: messageId,
    roomId,
    senderAddress: message.senderAddress || '',
    senderUsername: message.senderUsername || 'Anonymous',
    text: message.text || '',
    timestamp: Number(message.timestamp) || Date.now(),
    reactions: typeof message.reactions === 'string' ? message.reactions : JSON.stringify(message.reactions || {}),
    isPinned: Boolean(message.isPinned),
    isDeleted: Boolean(message.isDeleted),
  };

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve(messageId);
      }
    };

    try {
      const roomNode = gun.get(`gmai_room_messages_${roomId}`);
      roomNode.get(messageId).put(payload, (ack: any) => {
        if (ack && ack.err) {
          console.warn('Gun put warning:', ack.err);
        }
        safeResolve();
      });

      // Safety timeout so slow or offline peers never block chat execution
      setTimeout(safeResolve, 800);
    } catch (e) {
      console.error('Failed to post message to Gun graph:', e);
      safeResolve();
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
      if (!active || !data || typeof data !== 'object') return;
      if (key === '_') return; // Ignore Gun graph metadata node

      if (data.text && data.timestamp) {
        // Parse reactions safely
        let reactions: Record<string, string[]> = {};
        if (typeof data.reactions === 'string') {
          try {
            const parsed = JSON.parse(data.reactions);
            if (parsed && typeof parsed === 'object') {
              reactions = parsed;
            }
          } catch {}
        } else if (data.reactions && typeof data.reactions === 'object') {
          reactions = { ...data.reactions };
          delete (reactions as any)._;
        }

        const msg: ChatMessage = {
          id: key || data.id || `msg_${Date.now()}`,
          roomId,
          senderAddress: String(data.senderAddress || ''),
          senderUsername: String(data.senderUsername || 'Anonymous'),
          text: String(data.text || ''),
          timestamp: Number(data.timestamp) || Date.now(),
          reactions,
          isPinned: Boolean(data.isPinned),
          isDeleted: Boolean(data.isDeleted),
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
      delete (reactions as any)._;
    }

    const currentUsers = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
    const lowerAddress = (userAddress || '').toLowerCase();
    const index = currentUsers.findIndex(a => typeof a === 'string' && a.toLowerCase() === lowerAddress);

    if (index >= 0) {
      currentUsers.splice(index, 1);
    } else {
      currentUsers.push(lowerAddress);
    }

    if (currentUsers.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = currentUsers;
    }

    // Save as JSON string to preserve arrays in Gun
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
      setTimeout(resolve, 800);
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
      if (!active || !data || typeof data !== 'object') return;
      if (key === '_') return;

      if (data.name && data.slug) {
        const room: ChatRoom = {
          id: key || data.id,
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          category: data.category || 'general',
          isTokenGated: Boolean(data.isTokenGated),
          minGmaiBalance: Number(data.minGmaiBalance) || 0,
          creatorAddress: String(data.creatorAddress || ''),
          creatorUsername: String(data.creatorUsername || 'GameMind AI'),
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
  if (!presence || !presence.address) return;
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
    gun.get(PRESENCE_NODE).map().on((data: any, key: string) => {
      if (!active || !data || typeof data !== 'object') return;
      if (key === '_') return;

      if (data.address && data.username) {
        onPresence({
          address: String(data.address),
          username: String(data.username),
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
