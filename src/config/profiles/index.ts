/**
 * App Profile Registry
 * Add new app profiles here
 */

import { AppProfile, AppProfileConfig } from "../types";
import { defaultConfig } from "./default";
import { intakeConfig } from "./intake";

export const APP_PROFILES: Record<AppProfile, AppProfileConfig> = {
  intake: intakeConfig,
  default: defaultConfig,
  // Add new profiles here:
  // newapp: newAppConfig,
};

export { defaultConfig, intakeConfig };

