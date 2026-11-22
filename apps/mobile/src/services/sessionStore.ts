/**
 * Persists the signed-in session (token + user) in the device's secure storage
 * (Android Keystore via expo-secure-store), so staff stay signed in across app restarts.
 */
import * as SecureStore from 'expo-secure-store';
import type { CurrentUser } from '../types/hotel';

const KEY = 'resortos.session.v1';

export interface StoredSession {
  token: string;
  user: CurrentUser;
}

export const sessionStore = {
  async load(): Promise<StoredSession | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredSession;
      return parsed?.token && parsed?.user ? parsed : null;
    } catch {
      return null;
    }
  },
  async save(session: StoredSession): Promise<void> {
    try {
      await SecureStore.setItemAsync(KEY, JSON.stringify(session));
    } catch {
      // Session simply will not survive a restart.
    }
  },
  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // ignore
    }
  },
};
