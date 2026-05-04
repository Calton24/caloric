// Mock for expo-speech-recognition — native module, not available in Jest
export const ExpoSpeechRecognitionModule = {
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

export const ExpoWebSpeechRecognition = jest.fn();
export const ExpoWebSpeechGrammar = jest.fn();
export const ExpoWebSpeechGrammarList = jest.fn();

export default ExpoSpeechRecognitionModule;
