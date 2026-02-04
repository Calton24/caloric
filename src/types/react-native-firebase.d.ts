/**
 * Type declarations for React Native Firebase packages
 * Allows TypeScript to compile without full type definitions
 */

declare module "@react-native-firebase/app" {
  const firebaseApp: any;
  export default firebaseApp;
}

declare module "@react-native-firebase/analytics" {
  const analytics: any;
  export default analytics;
}

declare module "@react-native-firebase/crashlytics" {
  const crashlytics: any;
  export default crashlytics;
}

declare module "@react-native-firebase/perf" {
  const perf: any;
  export default perf;
}
