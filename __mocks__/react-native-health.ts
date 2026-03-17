/**
 * Mock for react-native-health (used in test environment)
 */
const AppleHealthKit = {
  Constants: {
    Permissions: {
      Weight: "Weight",
      DietaryEnergyConsumed: "DietaryEnergyConsumed",
    },
  },
  isAvailable: jest.fn((_cb: Function) => {
    _cb(null, false);
  }),
  initHealthKit: jest.fn((_perms: unknown, cb: Function) => {
    cb(null);
  }),
  getWeightSamples: jest.fn((_opts: unknown, cb: Function) => {
    cb(null, []);
  }),
  saveWeight: jest.fn((_opts: unknown, cb: Function) => {
    cb(null);
  }),
  getEnergyConsumedSamples: jest.fn((_opts: unknown, cb: Function) => {
    cb(null, []);
  }),
  saveFood: jest.fn((_opts: unknown, cb: Function) => {
    cb(null, {});
  }),
};

export default AppleHealthKit;
module.exports = AppleHealthKit;
