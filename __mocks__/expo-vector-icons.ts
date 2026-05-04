/**
 * Jest stub — @expo/vector-icons ships ESM; avoid parsing node_modules in tests.
 */

const MockIcon = () => null;

export const AntDesign = MockIcon;
export const Entypo = MockIcon;
export const EvilIcons = MockIcon;
export const Feather = MockIcon;
export const Fontisto = MockIcon;
export const FontAwesome = MockIcon;
export const FontAwesome5 = MockIcon;
export const FontAwesome6 = MockIcon;
export const Foundation = MockIcon;
export const Ionicons = MockIcon;
export const MaterialCommunityIcons = MockIcon;
export const MaterialIcons = MockIcon;
export const Octicons = MockIcon;
export const SimpleLineIcons = MockIcon;
export const Zocial = MockIcon;

export function createIconSet(): typeof MockIcon {
  return MockIcon;
}

export function createMultiStyleIconSet(): typeof MockIcon {
  return MockIcon;
}

export function createIconSetFromFontello(): typeof MockIcon {
  return MockIcon;
}

export function createIconSetFromIcoMoon(): typeof MockIcon {
  return MockIcon;
}
