/**
 * Epic 2 — Ingredient Function & Explanation Prompt
 *
 * Standalone prompt for backfilling existing scored ingredients with
 * ingredientFunction and detailExplanation fields.
 * Not a full rescore — only classifies function and writes an explanation.
 */

export const INGREDIENT_FUNCTION_SYSTEM_PROMPT = `You classify food ingredient functions and provide plain-language explanations for consumers. Return ONLY valid JSON with no explanation, no markdown fences, no commentary.`;

export const VALID_INGREDIENT_FUNCTIONS = [
  "Preservative",
  "Emulsifier",
  "Colorant",
  "Sweetener",
  "Thickener",
  "Flavor Enhancer",
  "Acidity Regulator",
  "Antioxidant",
  "Stabilizer",
  "Leavening Agent",
  "Humectant",
  "Nutrient",
  "Base Ingredient",
  "Fiber",
  "Fat/Oil",
  "Protein",
  "Vitamin/Mineral",
  "Probiotic",
  "Other",
] as const;

export function buildIngredientFunctionMessage(ingredientName: string): string {
  return `For the food ingredient "${ingredientName}", provide:
1. Its primary function in food products (choose the single best fit from the valid functions list)
2. A 2-sentence plain-language explanation of what it is and any health considerations for everyday consumers

Valid functions: ${VALID_INGREDIENT_FUNCTIONS.join(", ")}

Return JSON:
{
  "ingredientFunction": "<function from the list above>",
  "detailExplanation": "<Sentence 1 about what it is. Sentence 2 about health considerations or safety.>"
}`;
}
