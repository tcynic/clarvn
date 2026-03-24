import { z } from "zod";

const TierSchema = z.enum(["Clean", "Watch", "Caution", "Avoid"]);

const EvidenceQualitySchema = z.enum([
  "RCT",
  "cohort",
  "animal",
  "regulatory",
  "advocacy",
]);

export const IngredientSchema = z.object({
  canonicalName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  harmEvidenceScore: z.number().min(1).max(10),
  regulatoryScore: z.number().min(0).max(10),
  avoidanceScore: z.number().min(1).max(10),
  baseScore: z.number().min(1).max(10),
  tier: TierSchema,
  flagLabel: z.string().optional(),
  evidenceSources: z.record(z.string(), z.string()).optional(),
});

export const ConditionModifierSchema = z.object({
  ingredientCanonicalName: z.string().min(1),
  condition: z.string().min(1),
  modifierAmount: z.number().min(0).max(9),
  evidenceCitation: z.string().min(1),
  evidenceQuality: EvidenceQualitySchema.optional(),
});

export const AlternativeSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  reason: z.string().optional(),
});

export const ScoringResponseSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  emoji: z.string().optional(),
  baseScore: z.number().min(1).max(10),
  tier: TierSchema,
  scoreRationale: z.string().optional(),
  ingredients: z.array(IngredientSchema).min(1),
  conditionModifiers: z.array(ConditionModifierSchema).default([]),
  alternatives: z.array(AlternativeSchema).default([]),
});

export type ScoringResponse = z.infer<typeof ScoringResponseSchema>;
export type Ingredient = z.infer<typeof IngredientSchema>;
export type ConditionModifier = z.infer<typeof ConditionModifierSchema>;
export type Alternative = z.infer<typeof AlternativeSchema>;

/** Parse and validate an AI response string. Throws ZodError on failure. */
export function validateScoringResponse(raw: string): ScoringResponse {
  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return ScoringResponseSchema.parse(parsed);
}

/** Diff response schema for Operation 3 refresh check. */
export const DiffResponseSchema = z.union([
  z.object({ change: z.literal(false) }),
  z.object({
    change: z.literal(true),
    change_reason: z.string().min(1),
    baseScore: z.number().min(1).max(10).optional(),
    tier: TierSchema.optional(),
  }),
]);

export type DiffResponse = z.infer<typeof DiffResponseSchema>;

export function validateDiffResponse(raw: string): DiffResponse {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return DiffResponseSchema.parse(parsed);
}
