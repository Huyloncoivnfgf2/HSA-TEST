import { enqueueUserData } from './userDataSync';

let userId: string | null = null;
const PREFIX = 'hsa-user-data:';

export function setStorageUserId(nextUserId: string): void {
  userId = nextUserId;
}

export function getStorageUserId(): string | null {
  return userId;
}

function scopedKey(key: string): string {
  if (!userId) throw new Error('User storage is unavailable before authentication');
  return `${PREFIX}${userId}:${key}`;
}

export const userStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(scopedKey(key));
  },
  setItem(key: string, value: string): void {
    const normalizedValue = String(value);
    localStorage.setItem(scopedKey(key), normalizedValue);
    if (!key.startsWith('__sync:')) {
      setUserStorageTimestamp(`storage:${key}`, Date.now());
      enqueueUserData(`storage:${key}`, normalizedValue);
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(scopedKey(key));
    if (!key.startsWith('__sync:')) {
      setUserStorageTimestamp(`storage:${key}`, Date.now());
      enqueueUserData(`storage:${key}`, null);
    }
  },
  get length(): number {
    return this.keys().length;
  },
  key(index: number): string | null {
    return this.keys()[index] ?? null;
  },
  keys(): string[] {
    if (!userId) return [];
    const prefix = `${PREFIX}${userId}:`;
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key.slice(prefix.length));
    }
    return keys;
  },
};

export function getUserStorageValue(key: string): string | null {
  return userId ? localStorage.getItem(scopedKey(key)) : null;
}

export function setUserStorageValue(key: string, value: string | null): void {
  if (!userId) return;
  const storageKey = scopedKey(key);
  if (value === null) localStorage.removeItem(storageKey);
  else localStorage.setItem(storageKey, value);
}

export function getUserStorageTimestamp(key: string): number {
  const raw = getUserStorageValue(`__sync:${key}`);
  return Number(raw) || 0;
}

export function setUserStorageTimestamp(key: string, timestamp: number): void {
  setUserStorageValue(`__sync:${key}`, String(timestamp));
}
