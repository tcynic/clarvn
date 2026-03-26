"use node";

/**
 * analyzeIngredients.ts — Paste-Ingredients Analysis
 *
 * Free users: 3 analyses/day. Premium: unlimited.
 * Parses comma-separated ingredient text, looks up scored ingredients,
 * uses AI to estimate scores for unrecognized ones, then assembles a product score.
 */

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { calculateProductScore, getTierFromScore } from "./assembly";

const MAX_TEXT_LENGTH = 5000;

const client = new Anthropic();

/** Estimate scores for unrecognized ingredient names via Claude. */
async function estimateIngredientScores(
  names: string[]
): Promise<Array<{ name: string; baseScore: number; tier: string }>> {
  if (names.length === 0) return [];

  const prompt = `You are a food safety expert. For each ingredient listed below, provide a safety score from 1.0 (safest) to 10.0 (most harmful) based on scientific evidence, and a tier: Clean (1.0-3.9), Watch (4.0-5.9), Caution (6.0-7.9), or Avoid (8.0-10.0).

Respond with a JSON array: [{"name": "...", "baseScore": X.X, "tier": "..."}]

Ingredients:
${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      name: string;
      baseScore: number;
      tier: string;
    }>;
    return parsed.filter(
      (r) => r.name && typeof r.baseScore === "number" && r.tier
    );
  } catch {
    return [];
  }
}

export const analyzeIngredientList = action({
  args: {
    rawText: v.string(),
  },
  handler: async (ctx, args): Promise<{
    assembledScore: number;
    tier: string;
    ingredients: Array<{ name: string; baseScore: number; tier: string; recognized: boolean; canonicalName?: string }>;
    recognizedCount: number;
    estimatedCount: number;
    totalCount: number;
  }> => {
    const rawText = args.rawText.trim();
    if (!rawText) {
      throw new ConvexError("Ingredient text cannot be empty");
    }
    if (rawText.length > MAX_TEXT_LENGTH) {
      throw new ConvexError(`Ingredient text exceeds ${MAX_TEXT_LENGTH} characters`);
    }

    // Check daily limit for free users
    const premium = await ctx.runQuery(internal.analyzeIngredientsHelpers.checkIsPremium, {});
    if (!premium) {
      const usage = await ctx.runQuery(
        internal.analyzeIngredientsHelpers.checkDailyAnalysisCount,
        {}
      );
      if (usage.atLimit) {
        throw new ConvexError(
          `Free users can run ${usage.limit} analyses per day. Upgrade to Premium for unlimited.`
        );
      }
    }

    // Parse ingredient names (comma-separated, newline-separated, or semicolon-separated)
    const names = rawText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 100); // hard cap

    // Look up known ingredients
    const lookupResults = await ctx.runQuery(
      internal.analyzeIngredientsHelpers.lookupIngredients,
      { names }
    );

    const recognized = lookupResults.filter((r) => r.recognized && r.ingredient);
    const unrecognized = lookupResults.filter((r) => !r.recognized);

    // AI estimation for unrecognized
    const estimated = await estimateIngredientScores(
      unrecognized.map((r) => r.name)
    );

    // Build full ingredient list
    type IngredientResult = {
      name: string;
      baseScore: number;
      tier: string;
      recognized: boolean;
      canonicalName?: string;
    };

    const ingredientResults: IngredientResult[] = [
      ...recognized.map((r) => ({
        name: r.name,
        baseScore: r.ingredient!.baseScore,
        tier: r.ingredient!.tier,
        recognized: true,
        canonicalName: r.ingredient!.canonicalName,
      })),
      ...unrecognized.map((r) => {
        const est = estimated.find(
          (e) => e.name.toLowerCase() === r.name.toLowerCase()
        );
        return {
          name: r.name,
          baseScore: est?.baseScore ?? 3.0,
          tier: est?.tier ?? "Watch",
          recognized: false,
        };
      }),
    ];

    // Assemble product score
    const ingredientScores = ingredientResults.map((i) => i.baseScore);
    const { baseScore: assembledScore } = calculateProductScore(ingredientScores);
    const tier = getTierFromScore(assembledScore);

    // Record usage for free users
    if (!premium) {
      await ctx.runMutation(
        internal.analyzeIngredientsHelpers.recordAnalysis,
        {}
      );
    }

    return {
      assembledScore,
      tier,
      ingredients: ingredientResults,
      recognizedCount: recognized.length,
      estimatedCount: unrecognized.length,
      totalCount: ingredientResults.length,
    };
  },
});
