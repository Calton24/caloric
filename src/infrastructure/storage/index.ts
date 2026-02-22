/**
 * Key-Value Storage - Public API
 *
 * Default: AsyncStorageProvider
 * Swap via setStorage() for MMKV, SecureStore, or InMemoryStore (tests).
 *
 * Usage:
 *   import { getStorage } from '@/src/infrastructure/storage';
 *   const value = await getStorage().getItem('key');
 */

import { AsyncStorageProvider } from "./providers/async-storage";
import type { KeyValueStore } from "./types";

let instance: KeyValueStore = new AsyncStorageProvider();

/**
 * Get the current storage provider
 */
export function getStorage(): KeyValueStore {
  return instance;
}

/**
 * Swap the storage implementation
 * Call early in app bootstrap or in test setup
 */
export function setStorage(store: KeyValueStore): void {
  instance = store;
}

/**
 * Reset to default provider (test cleanup)
 * @internal
 */
export function __resetStorage(): void {
  instance = new AsyncStorageProvider();
}

// Re-export types and providers
export { AsyncStorageProvider } from "./providers/async-storage";
export { InMemoryStore } from "./providers/memory";
export type { KeyValueStore } from "./types";

