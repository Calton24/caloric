/**
 * Experiment Copy — Localized Variants
 *
 * Contains A/B copy for each experiment, per locale.
 * Keep experiment copy here (not in locale files) to:
 * - Avoid bloating translation files with test variants
 * - Make it easy to promote winners later
 * - Keep translators focused on production copy
 *
 * When an experiment concludes:
 * 1. Identify winning variant per locale
 * 2. Update the locale file with winning copy
 * 3. Remove the experiment from this file
 */

import type { Variant } from "./experiments";

export type SupportedLocale =
  | "en"
  | "de"
  | "es"
  | "fr"
  | "nl"
  | "pl"
  | "pt"
  | "pt-BR";

type LocaleCopyMap = Record<SupportedLocale, { A: string; B: string }>;

// ── welcome_cta_v1 ─────────────────────────────────────────────────────────
// Tests: ownership (A: "Create") vs action/momentum (B: "Start")

const WELCOME_CTA_COPY: LocaleCopyMap = {
  en: { A: "Create My Plan", B: "Start My Plan" },
  de: { A: "Meinen Plan erstellen", B: "Meinen Plan starten" },
  es: { A: "Crear mi plan", B: "Empezar mi plan" },
  fr: { A: "Créer mon plan", B: "Commencer mon plan" },
  nl: { A: "Maak mijn plan", B: "Start mijn plan" },
  pl: { A: "Stwórz mój plan", B: "Rozpocznij mój plan" },
  pt: { A: "Criar o meu plano", B: "Começar o meu plano" },
  "pt-BR": { A: "Criar meu plano", B: "Começar meu plano" },
};

// ── paywall_cta_default_v1 ─────────────────────────────────────────────────
// Tests: access clarity (A) vs unlock framing (B)

const PAYWALL_CTA_COPY: LocaleCopyMap = {
  en: { A: "Get Full Access", B: "Unlock Everything" },
  de: { A: "Vollen Zugriff erhalten", B: "Alles freischalten" },
  es: { A: "Accede a todo", B: "Desbloquea todo" },
  fr: { A: "Accédez à toutes les fonctionnalités", B: "Débloquez tout" },
  nl: { A: "Krijg volledige toegang", B: "Ontgrendel alles" },
  pl: { A: "Odblokuj pełny dostęp", B: "Odblokuj wszystko" },
  pt: { A: "Acede a tudo", B: "Desbloqueia tudo" },
  "pt-BR": { A: "Desbloquear acesso completo", B: "Desbloquear tudo" },
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get welcome CTA copy for the given locale and variant.
 * Falls back to English if locale not found.
 */
export function getWelcomeCtaCopy(locale: string, variant: Variant): string {
  const normalizedLocale = normalizeLocale(locale);
  const copy = WELCOME_CTA_COPY[normalizedLocale] ?? WELCOME_CTA_COPY.en;
  return copy[variant];
}

/**
 * Get paywall default CTA copy for the given locale and variant.
 * Falls back to English if locale not found.
 */
export function getPaywallCtaCopy(locale: string, variant: Variant): string {
  const normalizedLocale = normalizeLocale(locale);
  const copy = PAYWALL_CTA_COPY[normalizedLocale] ?? PAYWALL_CTA_COPY.en;
  return copy[variant];
}

/**
 * Normalize locale string to supported locale.
 * Handles variations like "en-US" → "en", "pt-BR" stays "pt-BR"
 */
function normalizeLocale(locale: string): SupportedLocale {
  // pt-BR is special — keep it
  if (locale.toLowerCase() === "pt-br") return "pt-BR";

  // Extract base language
  const base = locale.split("-")[0].toLowerCase();

  // Map to supported locales
  const supported: SupportedLocale[] = [
    "en",
    "de",
    "es",
    "fr",
    "nl",
    "pl",
    "pt",
  ];
  if (supported.includes(base as SupportedLocale)) {
    return base as SupportedLocale;
  }

  return "en"; // fallback
}
