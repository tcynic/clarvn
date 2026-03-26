"use node";
/**
 * Epic 3 — Ingredient Scoring Pipeline
 *
 * scoreIngredient: Convex action that scores a single ingredient from the queue.
 * processIngredientQueueBatch: Internal action for batch processing.
 * scoreAllPendingIngredients: Public action to kick off batch processing.
 */

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import { validateIngredientScoringResponse } from "./lib/validator";
import {
  INGREDIENT_SCORING_SYSTEM_PROMPT,
  buildIngredientScoringMessage,
} from "./lib/ingredientScoringPrompt";
import { requireAdmin } from "./lib/auth";

const MODEL_PRIMARY = "claude-sonnet-4-5";
const MODEL_FALLBACK = "claude-opus-4-5";

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey });
}

/**
 * Core logic: score a single ingredient queue entry.
 * Does NOT check auth — callers are responsible for authorization.
 */
async function scoreIngredientCore(
  ctx: any,
  queueId: Id<"ingredient_queue">
): Promise<{ success: boolean; ingredientId?: string; error?: string }> {
  const anthropic = getAnthropicClient();

  // 1. Mark as scoring
  await ctx.runMutation(internal.ingredientQueue.updateIngredientQueueStatus, {
    queueId,
    status: "scoring",
  });

  // 2. Get queue entry
  const queueEntry = await ctx.runQuery(
    internal.ingredientQueue.getIngredientQueueEntry,
    { queueId }
  );
  if (!queueEntry) throw new Error("Queue entry not found");

  const ingredientName = queueEntry.canonicalName;

  // 3. Call Claude API with ingredient scoring prompt
  let scored = null;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const model = attempt === 1 ? MODEL_PRIMARY : MODEL_FALLBACK;
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        temperature: 0,
        system: INGREDIENT_SCORING_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildIngredientScoringMessage(ingredientName),
          },
        ],
      });

      if (response.stop_reason === "max_tokens") {
        throw new Error("Response truncated — max_tokens limit reached");
      }
      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");

      scored = validateIngredientScoringResponse(content.text);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 2) break;
    }
  }

  if (!scored) {
    await ctx.runMutation(internal.ingredientQueue.updateIngredientQueueStatus, {
      queueId,
      status: "failed",
      errorMessage: lastError,
    });
    return { success: false, error: lastError };
  }

  // 4. Write/update ingredient record with all scores.
  // Pass placeholderName so upsertIngredient can update the placeholder in-place
  // if Claude normalised the canonical name (preserves product_ingredients links).
  const ingredientId: Id<"ingredients"> = await ctx.runMutation(
    internal.ingredients.upsertIngredient,
    {
      canonicalName: scored.canonicalName,
      placeholderName: queueEntry.canonicalName,
      aliases: scored.aliases,
      harmEvidenceScore: scored.harmEvidenceScore,
      regulatoryScore: scored.regulatoryScore,
      avoidanceScore: scored.avoidanceScore,
      baseScore: scored.baseScore,
      tier: scored.tier,
      flagLabel: scored.flagLabel,
      ingredientFunction: scored.ingredientFunction,
      detailExplanation: scored.detailExplanation,
      evidenceSources: scored.evidenceSources as
        | Record<string, string>
        | undefined,
    }
  );

  // 5. Write condition modifiers for this ingredient
  for (const mod of scored.conditionModifiers) {
    await ctx.runMutation(internal.ingredients.upsertConditionModifier, {
      ingredientId,
      condition: mod.condition,
      modifierAmount: mod.modifierAmount,
      evidenceCitation: mod.evidenceCitation,
      evidenceQuality: mod.evidenceQuality,
    });
  }

  // 6. Re-fetch queue entry to capture any blockedProductIds added while the
  //    Claude API call was in-flight, then delete the entry — done entries are not retained.
  const freshQueueEntry = await ctx.runQuery(
    internal.ingredientQueue.getIngredientQueueEntry,
    { queueId }
  );
  const finalBlockedProductIds =
    freshQueueEntry?.blockedProductIds ?? queueEntry.blockedProductIds;

  await ctx.runMutation(internal.ingredientQueue.deleteIngredientQueueEntry, {
    queueId,
  });

  // 7. Auto-assembly: decrement pendingIngredientCount for all blocked products.
  //    If count reaches 0 → trigger full assembly.
  for (const productId of finalBlockedProductIds) {
    await ctx.runMutation(internal.assembly.decrementPendingAndAssemble, {
      productId,
    });
  }

  return { success: true, ingredientId };
}

/**
 * Public action: score a single ingredient from the queue (admin-only).
 */
export const scoreIngredient = action({
  args: { queueId: v.id("ingredient_queue") },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; ingredientId?: string; error?: string }> => {
    await requireAdmin(ctx);
    return scoreIngredientCore(ctx, args.queueId);
  },
});

/**
 * Internal action: process a batch of pending ingredient queue entries.
 */
export const processIngredientQueueBatch = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.runQuery(
      internal.ingredientQueue.getPendingIngredientBatch,
      { limit: 10 }
    );

    if (entries.length === 0) return;

    for (const entry of entries) {
      try {
        await scoreIngredientCore(ctx, entry._id);
      } catch (_err) {
        // scoreIngredientCore already marks failed; continue batch
      }
      // 500ms between calls to stay under API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Check if more pending entries remain
    const remaining = await ctx.runQuery(
      internal.ingredientQueue.getPendingIngredientBatch,
      { limit: 1 }
    );
    if (remaining.length > 0) {
      await ctx.scheduler.runAfter(
        1000,
        internal.ingredientScoring.processIngredientQueueBatch,
        {}
      );
    }
  },
});

/**
 * Public action: kick off batch processing of all pending ingredients (admin-only).
 */
export const scoreAllPendingIngredients = action({
  args: {},
  handler: async (ctx): Promise<{ started: boolean }> => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(
      0,
      internal.ingredientScoring.processIngredientQueueBatch,
      {}
    );
    return { started: true };
  },
});
