/**
 * Mock AsyncStorage
 */

const store: Record<string, string> = {};

export default {
  getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
  setItem: jest.fn((key: string, value: string) =>
    Promise.resolve((store[key] = value))
  ),
  removeItem: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach((key) => delete store[key]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, store[key] || null]))
  ),
};
