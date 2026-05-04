/**
 * eslint-plugin-i18n — Local ESLint plugin for i18n enforcement
 *
 * Rules:
 *   i18n/no-hardcoded-strings — Detects hardcoded strings in JSX text nodes.
 *
 * Works with ESLint 9 flat config. No external dependency needed.
 *
 * This catches the most common i18n bug: raw English strings in JSX.
 * It flags any JSXText or Literal inside JSXExpression that looks like
 * a user-facing string (2+ chars, not whitespace, not a format string).
 */

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  meta: { name: "eslint-plugin-i18n", version: "1.0.0" },
  rules: {
    "no-hardcoded-strings": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Disallow hardcoded user-facing strings in JSX. Use t() from useAppTranslation.",
        },
        schema: [
          {
            type: "object",
            properties: {
              /** Minimum string length to flag (default: 2) */
              minLength: { type: "number" },
              /** Patterns to ignore (e.g. className values, testIDs) */
              ignorePatterns: {
                type: "array",
                items: { type: "string" },
              },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          hardcodedString:
            'Hardcoded string "{{text}}" in JSX. Use t("key") from useAppTranslation instead.',
        },
      },

      create(context) {
        const options = context.options[0] || {};
        const minLength = options.minLength ?? 2;
        const ignorePatterns = (options.ignorePatterns || []).map(
          (p) => new RegExp(p)
        );

        // Props that commonly hold non-translatable values
        const IGNORED_PROPS = new Set([
          "testID",
          "accessibilityRole",
          "nativeID",
          "key",
          "name",
          "type",
          "mode",
          "variant",
          "size",
          "color",
          "hitSlop",
          "keyboardType",
          "autoCapitalize",
          "autoComplete",
          "autoCorrect",
          "textContentType",
          "returnKeyType",
          "secureTextEntry",
          "selectionColor",
          "underlineColorAndroid",
          "importantForAutofill",
          "dataDetectorType",
          "sf",
          "ionicon",
          "href",
          "flag",
          "entering",
          "exiting",
          "style",
          "contentContainerStyle",
          "pointerEvents",
          // Expo Router
          "initialRouteName",
        ]);

        // Quick checks
        function shouldIgnore(text) {
          const trimmed = text.trim();
          if (trimmed.length < minLength) return true;
          // Whitespace only
          if (/^\s*$/.test(trimmed)) return true;
          // Looks like a format/template token {{x}}
          if (/^\{\{.*\}\}$/.test(trimmed)) return true;
          // Single character or just punctuation
          if (/^[\s\d.,;:!?'"()\-/\\|@#$%^&*=+<>{}[\]`~]+$/.test(trimmed))
            return true;
          // Emoji-only strings (false positives)
          if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(trimmed))
            return true;
          // SVG gradient ID patterns
          if (/^(url\(#|grad-)/.test(trimmed)) return true;
          // Custom ignore patterns
          if (ignorePatterns.some((re) => re.test(trimmed))) return true;
          return false;
        }

        function isInIgnoredProp(node) {
          const parent = node.parent;
          if (!parent) return false;
          // JSXAttribute: <Comp prop="value" />
          if (parent.type === "JSXAttribute") {
            const propName = parent.name?.name;
            return IGNORED_PROPS.has(propName);
          }
          // JSXExpressionContainer inside JSXAttribute: <Comp prop={"value"} />
          if (
            parent.type === "JSXExpressionContainer" &&
            parent.parent?.type === "JSXAttribute"
          ) {
            const propName = parent.parent.name?.name;
            return IGNORED_PROPS.has(propName);
          }
          return false;
        }

        function isInStyleSheet(node) {
          // Walk up to see if we're inside StyleSheet.create or a style object
          let current = node.parent;
          let depth = 0;
          while (current && depth < 10) {
            if (
              current.type === "CallExpression" &&
              current.callee?.object?.name === "StyleSheet"
            ) {
              return true;
            }
            current = current.parent;
            depth++;
          }
          return false;
        }

        return {
          // Direct text children: <Text>Hello</Text>
          JSXText(node) {
            if (shouldIgnore(node.value)) return;
            context.report({
              node,
              messageId: "hardcodedString",
              data: { text: node.value.trim().slice(0, 40) },
            });
          },

          // String literals in JSX expressions: <Text>{"Hello"}</Text>
          // Also catches prop values: <Comp label="Hello" />
          Literal(node) {
            if (typeof node.value !== "string") return;
            if (shouldIgnore(node.value)) return;
            if (isInIgnoredProp(node)) return;
            if (isInStyleSheet(node)) return;

            const parent = node.parent;

            // Inside JSX expression container: {" "}, {"text"}
            if (parent?.type === "JSXExpressionContainer") {
              context.report({
                node,
                messageId: "hardcodedString",
                data: { text: node.value.trim().slice(0, 40) },
              });
              return;
            }

            // JSX attribute value: <Comp title="Hello" />
            if (parent?.type === "JSXAttribute") {
              const propName = parent.name?.name;
              if (IGNORED_PROPS.has(propName)) return;
              // Only flag certain props that are clearly user-facing
              const USER_FACING_PROPS = new Set([
                "title",
                "label",
                "placeholder",
                "description",
                "subtitle",
                "message",
                "buttonText",
                "actionLabel",
                "headerTitle",
                "headerRight",
                "headerLeft",
                "tabBarLabel",
              ]);
              if (USER_FACING_PROPS.has(propName)) {
                context.report({
                  node,
                  messageId: "hardcodedString",
                  data: { text: node.value.trim().slice(0, 40) },
                });
              }
            }
          },

          // Template literals in JSX: {`Hello ${name}`}
          TemplateLiteral(node) {
            if (node.parent?.type !== "JSXExpressionContainer") return;
            // If it has expressions, it's dynamic — likely needs i18n
            const fullText = node.quasis.map((q) => q.value.raw).join("");
            if (shouldIgnore(fullText)) return;
            // Skip if it looks like a style/className template
            if (isInIgnoredProp(node)) return;
            context.report({
              node,
              messageId: "hardcodedString",
              data: { text: fullText.trim().slice(0, 40) },
            });
          },
        };
      },
    },
  },
};

module.exports = plugin;
