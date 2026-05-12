/**
 * AsyncStorage Provider
 * Default KeyValueStore implementation using @react-native-async-storage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStore } from "../types";

export class AsyncStorageProvider implements KeyValueStore {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async multiRemove(keys: string[]): Promise<void> {
    const uniq = [...new Set(keys.filter(Boolean))];
    if (uniq.length === 0) return;
    const chunkSize = 200;
    for (let i = 0; i < uniq.length; i += chunkSize) {
      await AsyncStorage.multiRemove(uniq.slice(i, i + chunkSize));
    }
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
}
