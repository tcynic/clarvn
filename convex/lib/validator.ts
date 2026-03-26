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

/**
 * Sanitize common LLM JSON output issues:
 * - Markdown fences
 * - Trailing commas before } or ]
 * - Single-line // comments
 * - Unescaped control characters inside string values
 */
function sanitizeLLMJson(raw: string): string {
  // 1. Strip markdown fences
  let s = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // 2. Extract the outermost JSON object in case of surrounding prose
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  // 3. Remove single-line // comments (not inside strings)
  s = s.replace(/^(\s*)\/\/.*$/gm, "$1");

  // 4. Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 5. Fix unescaped control characters inside JSON string values.
  //    Walk through the string and escape literal newlines/tabs that
  //    appear between unescaped double-quotes.
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
    return match
      .replace(/(?<!\\)\t/g, "\\t")
      .replace(/(?<!\\)\r/g, "\\r")
      .replace(/\n/g, "\\n");
  });

  return s;
}

/** Parse and validate an AI response string. Throws ZodError on failure. */
export function validateScoringResponse(raw: string): ScoringResponse {
  const cleaned = sanitizeLLMJson(raw);
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
  const cleaned = sanitizeLLMJson(raw);
  const parsed = JSON.parse(cleaned);
  return DiffResponseSchema.parse(parsed);
}

/** Ingredient-level scoring response schema (Epic 3). */
export const IngredientConditionModifierSchema = z.object({
  condition: z.string().min(1),
  modifierAmount: z.number().min(0).max(9),
  evidenceCitation: z.string().min(1),
  evidenceQuality: EvidenceQualitySchema.optional(),
});

export const IngredientScoringResponseSchema = z.object({
  canonicalName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  harmEvidenceScore: z.number().min(1).max(10),
  regulatoryScore: z.number().min(0).max(10),
  avoidanceScore: z.number().min(1).max(10),
  baseScore: z.number().min(1).max(10),
  tier: TierSchema,
  flagLabel: z.string().optional(),
  ingredientFunction: z.string().optional(),
  detailExplanation: z.string().optional(),
  evidenceSources: z.record(z.string(), z.string()).optional(),
  conditionModifiers: z.array(IngredientConditionModifierSchema).default([]),
});

export type IngredientScoringResponse = z.infer<
  typeof IngredientScoringResponseSchema
>;

export function validateIngredientScoringResponse(
  raw: string
): IngredientScoringResponse {
  const cleaned = sanitizeLLMJson(raw);
  const parsed = JSON.parse(cleaned);
  return IngredientScoringResponseSchema.parse(parsed);
}
