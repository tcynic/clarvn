import { describe, test, expect } from "vitest";
import {
  validateScoringResponse,
  ScoringResponseSchema,
} from "../convex/lib/validator";

const VALID_RESPONSE = {
  name: "Froot Loops",
  brand: "Kellogg's",
  emoji: "🥣",
  baseScore: 4.5,
  tier: "Watch",
  scoreRationale: "Artificial dyes dominant concern",
  ingredients: [
    {
      canonicalName: "Red No. 40",
      aliases: ["Allura Red AC"],
      harmEvidenceScore: 7.6,
      regulatoryScore: 1.3,
      avoidanceScore: 7.8,
      baseScore: 4.5,
      tier: "Watch",
      flagLabel: "Artificial dye",
    },
  ],
  conditionModifiers: [
    {
      ingredientCanonicalName: "Red No. 40",
      condition: "ADHD",
      modifierAmount: 2.8,
      evidenceCitation: "McCann et al. 2007 Lancet RCT",
      evidenceQuality: "RCT",
    },
  ],
  alternatives: [],
};

describe("2.7 — Zod validator", () => {
  test("accepts a valid scoring response", () => {
    const result = ScoringResponseSchema.parse(VALID_RESPONSE);
    expect(result.name).toBe("Froot Loops");
    expect(result.baseScore).toBe(4.5);
  });

  test("rejects response missing required 'name' field", () => {
    const bad = { ...VALID_RESPONSE, name: undefined };
    expect(() => ScoringResponseSchema.parse(bad)).toThrow();
  });

  test("rejects response missing 'ingredients' array", () => {
    const { ingredients: _, ...bad } = VALID_RESPONSE;
    expect(() => ScoringResponseSchema.parse(bad)).toThrow();
  });

  test("rejects response with empty ingredients array", () => {
    const bad = { ...VALID_RESPONSE, ingredients: [] };
    expect(() => ScoringResponseSchema.parse(bad)).toThrow();
  });

  test("rejects baseScore outside 1–10 range (too high)", () => {
    const bad = { ...VALID_RESPONSE, baseScore: 11 };
    expect(() => ScoringResponseSchema.parse(bad)).toThrow();
  });

  test("rejects baseScore outside 1–10 range (too low)", () => {
    const bad = { ...VALID_RESPONSE, baseScore: 0 };
    expect(() => ScoringResponseSchema.parse(bad)).toThrow();
  });

  test("rejects invalid tier value", () => {
    const bad = { ...VALID_RESPONSE, tier: "Medium" };
    expect(() => ScoringResponseSchema.parse(bad)).toThrow();
  });

  test("validateScoringResponse strips markdown fences from raw string", () => {
    const raw =
      "```json\n" + JSON.stringify(VALID_RESPONSE) + "\n```";
    const result = validateScoringResponse(raw);
    expect(result.name).toBe("Froot Loops");
  });

  test("validateScoringResponse throws on invalid JSON", () => {
    expect(() => validateScoringResponse("not json at all")).toThrow();
  });
});
