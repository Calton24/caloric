/**
 * Mock React Native
 */

export const Platform = {
  OS: "ios" as const,
  select: (obj: any) => obj.ios || obj.default,
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
};

export const StyleSheet = {
  create: (styles: any) => styles,
};

export default {
  Platform,
  Dimensions,
  StyleSheet,
};
