/**
 * Mock for @react-native-ml-kit/text-recognition
 * Used in tests where the native module isn't available.
 */
const TextRecognition = {
  recognize: jest.fn().mockResolvedValue({
    text: "",
    blocks: [],
  }),
};

export const TextRecognitionScript = {
  LATIN: "latin",
  CHINESE: "chinese",
  DEVANAGARI: "devanagari",
  JAPANESE: "japanese",
  KOREAN: "korean",
};

export default TextRecognition;
