export default {
  configure: jest.fn(),
  getCustomerInfo: jest
    .fn()
    .mockResolvedValue({ entitlements: { active: {} } }),
  restorePurchases: jest
    .fn()
    .mockResolvedValue({ entitlements: { active: {} } }),
  addCustomerInfoUpdateListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
};
