/**
 * App Profile Registry
 * Add new app profiles here
 */

import { AppProfile, AppProfileConfig } from "../types";
import { defaultConfig } from "./default";
import { caloricConfig } from "./caloric";
import { proxiConfig } from "./proxi";

export const APP_PROFILES: Record<AppProfile, AppProfileConfig> = {
  default: defaultConfig,
  caloric: caloricConfig,
  proxi: proxiConfig,
  // Add new profiles here:
  // newapp: newAppConfig,
};

export { defaultConfig, caloricConfig, proxiConfig };
