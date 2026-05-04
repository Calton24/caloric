/**
 * LocalizedText — Drop-in TText replacement that takes a translation key.
 *
 * Use this when you want the component itself to enforce i18n.
 * Accepts either `i18nKey` (translated) or `children` (already translated).
 *
 * @example
 * <LocalizedText i18nKey="settings.title" variant="heading" />
 * <LocalizedText i18nKey="home.logged" params={{ count: 3 }} color="secondary" />
 */

import React from "react";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { TText, type TTextProps } from "../primitives/TText";

type LocalizedTextProps = Omit<TTextProps, "children"> & {
  /** Translation key — required. The component translates it. */
  i18nKey: string;
  /** Interpolation params */
  params?: Record<string, string | number>;
};

export function LocalizedText({
  i18nKey,
  params,
  ...textProps
}: LocalizedTextProps) {
  const { t } = useAppTranslation();
  return <TText {...textProps}>{t(i18nKey, params as any)}</TText>;
}
