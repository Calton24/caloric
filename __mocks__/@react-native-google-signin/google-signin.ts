export const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn().mockResolvedValue(true),
  signIn: jest.fn().mockResolvedValue({
    data: { idToken: "mock-google-id-token" },
  }),
  signOut: jest.fn().mockResolvedValue(null),
};
