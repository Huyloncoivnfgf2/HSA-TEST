import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import {
  getUserStorageTimestamp,
  getUserStorageValue,
  setUserStorageTimestamp,
  setUserStorageValue,
  userStorage,
} from './userStorage';

export type SyncStatus = 'synced' | 'syncing' | 'offline';
type SyncListener = (status: SyncStatus) => void;
type PendingValue = string | null;

let currentUser: User | null = null;
let pending = new Map<string, PendingValue>();
let timer: number | undefined;
let status: SyncStatus = navigator.onLine ? 'synced' : 'offline';
const listeners = new Set<SyncListener>();

function setStatus(next: SyncStatus): void {
  status = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function enqueueUserData(key: string, value: PendingValue): void {
  if (!currentUser || !supabase) return;
  pending.set(key, value);
  setStatus(navigator.onLine ? 'syncing' : 'offline');
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => void flushUserData(), 2000);
}

export async function flushUserData(): Promise<void> {
  if (!currentUser || !supabase || pending.size === 0) {
    if (navigator.onLine) setStatus('synced');
    return;
  }
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }
  const userId = currentUser.id;
  const values = [...pending.entries()].map(([key, value]) => ({ key, value }));
  values.forEach(({ key }) => pending.delete(key));
  setStatus('syncing');
  const updatedAt = new Date().toISOString();
  const rows = values.map(({ key, value }) => ({
    user_id: userId,
    key,
    value: value === null ? { __hsa_deleted: true } : { __hsa_value: value },
    updated_at: updatedAt,
  }));
  try {
    const { error } = await supabase.from('user_data').upsert(rows, { onConflict: 'user_id,key' });
    if (error) throw error;
    if (currentUser?.id !== userId) return;
    values.forEach(({ key }) => setUserStorageTimestamp(key, Date.parse(updatedAt)));
    setStatus(pending.size ? 'syncing' : 'synced');
    if (pending.size) window.setTimeout(() => void flushUserData(), 0);
  } catch (syncError: unknown) {
    if (currentUser?.id !== userId) return;
    values.forEach(({ key, value }) => {
      if (!pending.has(key)) pending.set(key, value);
    });
    setStatus('offline');
    console.error('Could not sync local user data:', syncError);
    window.setTimeout(() => void flushUserData(), 5000);
  }
}

export async function initializeUserData(user: User): Promise<void> {
  const userChanged = currentUser?.id !== user.id;
  currentUser = user;
  if (userChanged) pending = new Map();
  if (!supabase) return;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }
  setStatus('syncing');
  const { data, error } = await supabase
    .from('user_data')
    .select('key,value,updated_at')
    .eq('user_id', user.id);
  if (error) {
    setStatus('offline');
    console.error('Could not download user data:', error);
    return;
  }
  if (currentUser?.id !== user.id) return;
  const remoteKeys = new Set<string>();
  for (const row of data ?? []) {
    const storageKey = row.key.startsWith('storage:') ? row.key.slice('storage:'.length) : null;
    const key = storageKey ?? row.key;
    remoteKeys.add(row.key);
    const remoteTimestamp = Date.parse(row.updated_at);
    const localTimestamp = getUserStorageTimestamp(row.key);
    if (storageKey && remoteTimestamp > localTimestamp) {
      const value = row.value as { __hsa_deleted?: boolean; __hsa_value?: string };
      setUserStorageValue(key, value.__hsa_deleted ? null : value.__hsa_value ?? null);
      setUserStorageTimestamp(row.key, remoteTimestamp);
    } else if (!storageKey && remoteTimestamp > localTimestamp) {
      const value = row.value as { __hsa_deleted?: boolean; __hsa_value?: string };
      setUserStorageValue(`__cloud:${key}`, value.__hsa_deleted ? null : value.__hsa_value ?? null);
      setUserStorageTimestamp(row.key, remoteTimestamp);
    } else if (localTimestamp > remoteTimestamp) {
      enqueueUserData(row.key, getUserStorageValue(storageKey ? key : `__cloud:${key}`));
    }
  }
  for (const key of userStorage.keys()) {
    if (key.startsWith('__sync:')) continue;
    if (key.startsWith('__cloud:')) {
      const syncKey = key.slice('__cloud:'.length);
      if (!remoteKeys.has(syncKey)) enqueueUserData(syncKey, getUserStorageValue(key));
      continue;
    }
    if (!key.startsWith('__')) {
      const syncKey = `storage:${key}`;
      if (!remoteKeys.has(syncKey)) enqueueUserData(syncKey, getUserStorageValue(key));
    }
  }
  if (pending.size) await flushUserData();
  else setStatus('synced');
}

function handleOnline(): void {
  if (currentUser) void initializeUserData(currentUser);
  else setStatus('synced');
}

function handleOffline(): void {
  setStatus('offline');
}

export function stopUserDataSync(): void {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if (timer) window.clearTimeout(timer);
  currentUser = null;
  pending = new Map();
}
