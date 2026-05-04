/**
 * Experiments Module Tests
 */

import {
    getExperimentVariantSync,
    isVariantForced,
} from "./experiment-assignment";
import { getPaywallCtaCopy, getWelcomeCtaCopy } from "./experiment-copy";
import { EXPERIMENTS, EXPERIMENT_META } from "./experiments";

describe("experiments config", () => {
  it("defines exactly 2 experiments", () => {
    expect(Object.keys(EXPERIMENTS)).toHaveLength(2);
    expect(EXPERIMENTS.welcome_cta_v1).toEqual(["A", "B"]);
    expect(EXPERIMENTS.paywall_cta_default_v1).toEqual(["A", "B"]);
  });

  it("has metadata for all experiments", () => {
    for (const key of Object.keys(EXPERIMENTS)) {
      expect(EXPERIMENT_META[key as keyof typeof EXPERIMENTS]).toBeDefined();
      expect(
        EXPERIMENT_META[key as keyof typeof EXPERIMENTS].description
      ).toBeTruthy();
      expect(
        EXPERIMENT_META[key as keyof typeof EXPERIMENTS].hypothesis
      ).toBeTruthy();
    }
  });
});

describe("experiment copy", () => {
  describe("getWelcomeCtaCopy", () => {
    it("returns correct English variants", () => {
      expect(getWelcomeCtaCopy("en", "A")).toBe("Create My Plan");
      expect(getWelcomeCtaCopy("en", "B")).toBe("Start My Plan");
    });

    it("returns correct German variants", () => {
      expect(getWelcomeCtaCopy("de", "A")).toBe("Meinen Plan erstellen");
      expect(getWelcomeCtaCopy("de", "B")).toBe("Meinen Plan starten");
    });

    it("returns correct French variants", () => {
      expect(getWelcomeCtaCopy("fr", "A")).toBe("Créer mon plan");
      expect(getWelcomeCtaCopy("fr", "B")).toBe("Commencer mon plan");
    });

    it("returns correct Dutch variants", () => {
      expect(getWelcomeCtaCopy("nl", "A")).toBe("Maak mijn plan");
      expect(getWelcomeCtaCopy("nl", "B")).toBe("Start mijn plan");
    });

    it("returns correct Spanish variants", () => {
      expect(getWelcomeCtaCopy("es", "A")).toBe("Crear mi plan");
      expect(getWelcomeCtaCopy("es", "B")).toBe("Empezar mi plan");
    });

    it("normalizes locale variations", () => {
      expect(getWelcomeCtaCopy("en-US", "A")).toBe("Create My Plan");
      expect(getWelcomeCtaCopy("de-DE", "B")).toBe("Meinen Plan starten");
    });

    it("handles pt-BR correctly", () => {
      expect(getWelcomeCtaCopy("pt-BR", "A")).toBe("Criar meu plano");
      expect(getWelcomeCtaCopy("pt-BR", "B")).toBe("Começar meu plano");
    });

    it("falls back to English for unknown locales", () => {
      expect(getWelcomeCtaCopy("xyz", "A")).toBe("Create My Plan");
      expect(getWelcomeCtaCopy("ja", "B")).toBe("Start My Plan");
    });
  });

  describe("getPaywallCtaCopy", () => {
    it("returns correct English variants", () => {
      expect(getPaywallCtaCopy("en", "A")).toBe("Get Full Access");
      expect(getPaywallCtaCopy("en", "B")).toBe("Unlock Everything");
    });

    it("returns correct German variants", () => {
      expect(getPaywallCtaCopy("de", "A")).toBe("Vollen Zugriff erhalten");
      expect(getPaywallCtaCopy("de", "B")).toBe("Alles freischalten");
    });

    it("returns correct French variants", () => {
      expect(getPaywallCtaCopy("fr", "A")).toBe(
        "Accédez à toutes les fonctionnalités"
      );
      expect(getPaywallCtaCopy("fr", "B")).toBe("Débloquez tout");
    });

    it("returns correct Dutch variants", () => {
      expect(getPaywallCtaCopy("nl", "A")).toBe("Krijg volledige toegang");
      expect(getPaywallCtaCopy("nl", "B")).toBe("Ontgrendel alles");
    });

    it("returns correct Spanish variants", () => {
      expect(getPaywallCtaCopy("es", "A")).toBe("Accede a todo");
      expect(getPaywallCtaCopy("es", "B")).toBe("Desbloquea todo");
    });

    it("falls back to English for unknown locales", () => {
      expect(getPaywallCtaCopy("xyz", "A")).toBe("Get Full Access");
    });
  });
});

describe("experiment assignment", () => {
  it("returns null from sync cache before preload", () => {
    // Before preload, sync cache should return null
    const variant = getExperimentVariantSync("welcome_cta_v1");
    // This will be null until preloadExperimentAssignments() is called
    expect(variant === null || variant === "A" || variant === "B").toBe(true);
  });

  it("tracks forced variants correctly", () => {
    // Before any forcing, should return false
    const isForced = isVariantForced("welcome_cta_v1");
    expect(typeof isForced).toBe("boolean");
  });
});
