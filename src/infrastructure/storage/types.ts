/**
 * Key-Value Storage - Type Definitions
 *
 * Platform-agnostic storage interface.
 * Implementations: AsyncStorage, MMKV, SecureStore, InMemory (tests)
 */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
