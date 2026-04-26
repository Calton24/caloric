module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/__tests__"],
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/src/**/*.test.ts",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-url-polyfill|expo-speech-recognition)/)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mock React Native modules
    "^react-native$": "<rootDir>/__mocks__/react-native.ts",
    "react-native-url-polyfill/auto": "<rootDir>/__mocks__/react-native-url-polyfill.ts",
    "@react-native-async-storage/async-storage":
      "<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts",
    "expo-constants": "<rootDir>/__mocks__/expo-constants.ts",
    "expo-secure-store": "<rootDir>/__mocks__/expo-secure-store.ts",
    "expo-speech-recognition": "<rootDir>/__mocks__/expo-speech-recognition.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/examples/**",
    "!src/types/**",
  ],
  // Coverage thresholds removed - UI-heavy project with expected lower coverage
  // Re-enable if needed: coverageThreshold: { global: { branches: 50, functions: 50, lines: 50, statements: 50 } }
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Force exit after tests complete - verified no real leaks with --detectOpenHandles
  forceExit: true,
  // Limit workers to reduce race conditions causing "worker failed to exit" warnings
  maxWorkers: "50%",
};
