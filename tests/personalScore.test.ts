import { describe, test, expect } from "vitest";
import { getPersonalScore, getTierFromScore } from "../src/lib/personalScore";
import type { ModifierData, UserProfile } from "../src/lib/personalScore";

const RED_40_ADHD: ModifierData = {
  ingredientId: "ing_1",
  condition: "ADHD",
  modifierAmount: 2.8,
  evidenceCitation: "McCann et al. 2007 Lancet RCT",
  status: "active",
};

const RED_40_IBS: ModifierData = {
  ingredientId: "ing_1",
  condition: "IBS / Gut sensitivity",
  modifierAmount: 0.4,
  evidenceCitation: "Azo dye sensitivity literature",
  status: "active",
};

const PROFILE_ADHD_IBS: UserProfile = {
  motivation: ["Manage my health conditions"],
  conditions: ["ADHD"],
  sensitivities: ["IBS / Gut sensitivity"],
};

const PROFILE_EMPTY: UserProfile = {
  motivation: [],
  conditions: [],
  sensitivities: [],
};

describe("4.8 — getPersonalScore", () => {
  test("base case: ADHD + IBS — base 4.5 + 2.8 + 0.4 = 7.7, tier Caution", () => {
    const result = getPersonalScore(4.5, [RED_40_ADHD, RED_40_IBS], PROFILE_ADHD_IBS);
    expect(result.baseScore).toBe(4.5);
    expect(result.personalScore).toBeCloseTo(7.7, 5);
    expect(result.tier).toBe("Watch");
    expect(result.personalTier).toBe("Caution");
    expect(result.appliedModifiers).toHaveLength(2);
  });

  test("personal score is capped at 10.0 when modifiers exceed", () => {
    const hugeModifier: ModifierData = {
      ingredientId: "ing_2",
      condition: "ADHD",
      modifierAmount: 9.0,
      evidenceCitation: "Test",
      status: "active",
    };
    const result = getPersonalScore(8.0, [hugeModifier], PROFILE_ADHD_IBS);
    expect(result.personalScore).toBe(10.0);
  });

  test("no modifiers applied when profile has no matching conditions", () => {
    const result = getPersonalScore(4.5, [RED_40_ADHD, RED_40_IBS], PROFILE_EMPTY);
    expect(result.personalScore).toBe(4.5);
    expect(result.appliedModifiers).toHaveLength(0);
  });

  test("inactive modifiers are ignored", () => {
    const inactive: ModifierData = { ...RED_40_ADHD, status: "archived" };
    const result = getPersonalScore(4.5, [inactive], PROFILE_ADHD_IBS);
    expect(result.personalScore).toBe(4.5);
    expect(result.appliedModifiers).toHaveLength(0);
  });

  test("condition matching is case-insensitive", () => {
    const lowerCond: ModifierData = { ...RED_40_ADHD, condition: "adhd" };
    const result = getPersonalScore(4.5, [lowerCond], PROFILE_ADHD_IBS);
    expect(result.appliedModifiers).toHaveLength(1);
  });
});

describe("getTierFromScore", () => {
  test("score 1.0 = Clean", () => expect(getTierFromScore(1.0)).toBe("Clean"));
  test("score 3.0 = Clean", () => expect(getTierFromScore(3.0)).toBe("Clean"));
  test("score 3.1 = Clean (transitional band uses lower tier)", () => expect(getTierFromScore(3.1)).toBe("Clean"));
  test("score 3.9 = Clean (transitional band)", () => expect(getTierFromScore(3.9)).toBe("Clean"));
  test("score 4.0 = Watch", () => expect(getTierFromScore(4.0)).toBe("Watch"));
  test("score 5.0 = Watch", () => expect(getTierFromScore(5.0)).toBe("Watch"));
  test("score 5.1 = Watch (transitional band)", () => expect(getTierFromScore(5.1)).toBe("Watch"));
  test("score 6.0 = Caution", () => expect(getTierFromScore(6.0)).toBe("Caution"));
  test("score 7.0 = Caution", () => expect(getTierFromScore(7.0)).toBe("Caution"));
  test("score 8.0 = Avoid", () => expect(getTierFromScore(8.0)).toBe("Avoid"));
  test("score 10.0 = Avoid", () => expect(getTierFromScore(10.0)).toBe("Avoid"));
});
