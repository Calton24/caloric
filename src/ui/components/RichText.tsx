/**
 * RichText — Translation-aware rich text component
 *
 * Uses react-i18next's Trans component under the hood to support
 * styled inline elements within translated strings.
 *
 * Instead of leaving mixed-JSX strings untranslated, use this:
 *
 * @example
 * // In locale file:
 * "noMatch": "We couldn't find <bold>\"{{food}}\"</bold> in our database. Try again or type it in."
 *
 * // In component:
 * <RichText
 *   i18nKey="mealConfirm.noMatch"
 *   values={{ food: draft.rawInput || draft.title }}
 *   components={{
 *     bold: <TText style={{ fontWeight: "600", color: theme.colors.text }} />,
 *   }}
 *   style={{ fontSize: 15, color: theme.colors.textMuted }}
 * />
 */

import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Text, type StyleProp, type TextStyle } from "react-native";

interface RichTextProps {
  /** Translation key (e.g. "mealConfirm.noMatch") */
  i18nKey: string;
  /** Interpolation values (e.g. { food: "pizza" }) */
  values?: Record<string, string | number>;
  /**
   * Named components that map to tags in the translation string.
   * e.g. { bold: <Text style={{ fontWeight: "bold" }} /> }
   *
   * In the translation string, use XML-like tags: <bold>text</bold>
   */
  components?: Record<string, React.ReactElement>;
  /** Base text style applied to the outer wrapper */
  style?: StyleProp<TextStyle>;
  /** Optional testID */
  testID?: string;
}

export function RichText({
  i18nKey,
  values,
  components,
  style,
  testID,
}: RichTextProps) {
  const { t } = useTranslation("common");

  return (
    <Text style={style} testID={testID}>
      <Trans t={t} i18nKey={i18nKey} values={values} components={components} />
    </Text>
  );
}
