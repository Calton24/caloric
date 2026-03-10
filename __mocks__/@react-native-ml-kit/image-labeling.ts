/**
 * Mock for @react-native-ml-kit/image-labeling
 * Used in tests where the native module isn't available.
 */
const ImageLabeling = {
  label: jest.fn().mockResolvedValue([]),
};

export default ImageLabeling;
