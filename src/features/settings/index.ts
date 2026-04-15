// Settings Feature — barrel export
export {
    LANGUAGE_OPTIONS, getLanguageLabel,
    getUnitsLabel
} from "./settings.selectors";
export { initialSettings, useSettingsStore } from "./settings.store";
export type {
    AppSettings,
    LanguageOption,
    UnitsPreference
} from "./settings.types";

