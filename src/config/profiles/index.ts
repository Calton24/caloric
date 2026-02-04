/**
 * App Profile Registry
 * Add new app profiles here
 */

import { AppProfile, AppProfileConfig } from "../types";
import { intakeConfig } from "./intake";
import { proxiConfig } from "./proxi";

export const APP_PROFILES: Record<AppProfile, AppProfileConfig> = {
  intake: intakeConfig,
  proxi: proxiConfig,
  // Add new profiles here:
  // newapp: newAppConfig,
};

export { intakeConfig, proxiConfig };
