"use node";
/**
 * Convex Scoring Actions
 *
 * Operation 2: scoreProduct — scores a single queue entry on demand
 * Operation 3: refreshCheck — re-evaluates all scored products in diff mode
 */

import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import {
  validateScoringResponse,
  validateDiffResponse,
} from "./lib/validator";
import {
  SCORING_SYSTEM_PROMPT,
  SCORING_DIFF_PROMPT,
  buildScoringUserMessage,
  buildDiffUserMessage,
} from "./lib/scoringPrompt";
import { requireAdmin } from "./lib/auth";

const MODEL_PRIMARY = "claude-sonnet-4-5";
const MODEL_FALLBACK = "claude-opus-4-5";

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey });
}

async function callClaude(
  anthropic: Anthropic,
  productName: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  if (response.stop_reason === "max_tokens") {
    throw new Error("Response truncated — max_tokens limit reached");
  }
  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
}

// Core scoring logic shared by scoreProduct and processQueueBatch.
// Does NOT check auth — callers are responsible for authorization.
async function scoreProductCore(
  ctx: ActionCtx,
  queueId: Id<"scoring_queue">
): Promise<{ success: boolean; productId?: string; error?: string }> {
  const anthropic = getAnthropicClient();

  // 1. Mark as scoring
  await ctx.runMutation(internal.scoringQueue.updateQueueStatus, {
    queueId,
    status: "scoring",
  });

  const queueEntry = await ctx.runQuery(
    internal.scoringQueue.getQueueEntry,
    { queueId }
  );
  if (!queueEntry) throw new Error("Queue entry not found");

  const productName = queueEntry.productName;

  // 2. Call Claude API (primary model, fallback on validation failure)
  let scored = null;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const model = attempt === 1 ? MODEL_PRIMARY : MODEL_FALLBACK;
    try {
      const raw = await callClaude(
        anthropic,
        productName,
        model,
        SCORING_SYSTEM_PROMPT,
        buildScoringUserMessage(productName)
      );
      scored = validateScoringResponse(raw);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 2) break;
    }
  }

  if (!scored) {
    await ctx.runMutation(internal.scoringQueue.updateQueueStatus, {
      queueId,
      status: "failed",
      errorMessage: lastError,
    });
    return { success: false, error: lastError };
  }

  // 3. Write product + ingredients + modifiers
  const productId: Id<"products"> = await ctx.runMutation(internal.products.writeProduct, {
    name: scored.name,
    brand: scored.brand,
    emoji: scored.emoji,
    baseScore: scored.baseScore,
    tier: scored.tier,
    scoreVersion: 1,
    scoredAt: Date.now(),
  });

  for (const ing of scored.ingredients) {
    const ingredientId = await ctx.runMutation(
      internal.ingredients.upsertIngredient,
      {
        canonicalName: ing.canonicalName,
        aliases: ing.aliases ?? [],
        harmEvidenceScore: ing.harmEvidenceScore,
        regulatoryScore: ing.regulatoryScore,
        avoidanceScore: ing.avoidanceScore,
        baseScore: ing.baseScore,
        tier: ing.tier,
        flagLabel: ing.flagLabel,
        evidenceSources: ing.evidenceSources as Record<string, string> | undefined,
      }
    );

    await ctx.runMutation(internal.ingredients.linkProductIngredient, {
      productId,
      ingredientId,
    });

    const modifiers = scored.conditionModifiers.filter(
      (m) => m.ingredientCanonicalName === ing.canonicalName
    );
    for (const mod of modifiers) {
      await ctx.runMutation(internal.ingredients.upsertConditionModifier, {
        ingredientId,
        condition: mod.condition,
        modifierAmount: mod.modifierAmount,
        evidenceCitation: mod.evidenceCitation,
        evidenceQuality: mod.evidenceQuality,
      });
    }
  }

  // 4. Mark done
  await ctx.runMutation(internal.scoringQueue.updateQueueStatus, {
    queueId,
    status: "done",
    productId,
  });

  // 5. Auto-queue alternatives
  for (const alt of scored.alternatives) {
    const existing = await ctx.runQuery(api.products.getProduct, { name: alt.name });
    if (!existing) {
      await ctx.runMutation(api.scoringQueue.addToQueue, {
        productName: alt.name,
        source: "alternative",
        priority: 2,
        sourceProductId: productId,
      });
    }
  }

  return { success: true, productId };
}

// --- Operation 2: Score a single product from the queue (admin-only) ---
export const scoreProduct = action({
  args: { queueId: v.id("scoring_queue") },
  handler: async (ctx, args): Promise<{ success: boolean; productId?: string; error?: string }> => {
    await requireAdmin(ctx);
    return scoreProductCore(ctx, args.queueId);
  },
});

// --- Operation 4: Batch-process all pending queue entries server-side ---
// Internal: processes one batch and schedules the next if more remain.
export const processQueueBatch = internalAction({
  args: {},
  handler: async (ctx, _args) => {
    const entries = await ctx.runQuery(internal.scoringQueue.getPendingBatch, {
      limit: 10,
    });

    if (entries.length === 0) {
      // No more work — mark batch as stopped
      await ctx.runMutation(internal.scoringQueue.setBatchState, {
        isRunning: false,
        shouldStop: false,
      });
      return;
    }

    for (const entry of entries) {
      try {
        await scoreProductCore(ctx, entry._id);
      } catch (_err) {
        // scoreProductCore already marks failed; continue batch
      }
      // 500ms between calls to stay under API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Check shouldStop flag and remaining pending entries
    const batchState = await ctx.runQuery(internal.scoringQueue.getBatchState, {});
    if (batchState?.shouldStop) {
      // Stop requested — mark as stopped
      await ctx.runMutation(internal.scoringQueue.setBatchState, {
        isRunning: false,
        shouldStop: false,
      });
      return;
    }

    const remaining = await ctx.runQuery(internal.scoringQueue.getPendingBatch, { limit: 1 });
    if (remaining.length > 0) {
      await ctx.scheduler.runAfter(1000, internal.scoring.processQueueBatch, {});
    } else {
      // No more pending — mark as stopped
      await ctx.runMutation(internal.scoringQueue.setBatchState, {
        isRunning: false,
        shouldStop: false,
      });
    }
  },
});

// Public: kick off batch processing (admin-only).
export const processAllPending = action({
  args: {},
  handler: async (ctx, _args): Promise<{ started: boolean }> => {
    await requireAdmin(ctx);
    
    // Guard against double-start
    const batchState = await ctx.runQuery(internal.scoringQueue.getBatchState, {});
    if (batchState?.isRunning) {
      return { started: false };
    }
    
    // Mark as running and start batch
    await ctx.runMutation(internal.scoringQueue.setBatchState, {
      isRunning: true,
      shouldStop: false,
    });
    await ctx.scheduler.runAfter(0, internal.scoring.processQueueBatch, {});
    return { started: true };
  },
});

// Public: request batch processing to stop (admin-only).
export const cancelBatch = action({
  args: {},
  handler: async (ctx, _args): Promise<{ cancelled: boolean }> => {
    await requireAdmin(ctx);
    const batchState = await ctx.runQuery(internal.scoringQueue.getBatchState, {});
    if (!batchState?.isRunning) {
      return { cancelled: false };
    }
    await ctx.runMutation(internal.scoringQueue.setBatchState, {
      isRunning: batchState.isRunning,
      shouldStop: true,
    });
    return { cancelled: true };
  },
});

// --- Operation 3: Refresh Check ---
export const refreshCheck = action({
  args: {
    productIds: v.optional(v.array(v.id("products"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // If no specific IDs, trigger a batch via scheduler
    if (!args.productIds) {
      await ctx.scheduler.runAfter(0, internal.scoring.refreshCheckBatch, {
        cursor: null,
      });
      return { started: true };
    }

    // Process a specific set of product IDs
    const anthropic = getAnthropicClient();
    const results = { unchanged: 0, updated: 0, failed: 0 };

    for (const productId of args.productIds) {
      const product = await ctx.runQuery(api.products.getProductById, {
        id: productId,
      });
      if (!product) continue;

      const lastScoredDate = new Date(product.scoredAt).toISOString().split("T")[0];

      try {
        const raw = await callClaude(
          anthropic,
          product.name,
          MODEL_PRIMARY,
          SCORING_DIFF_PROMPT,
          buildDiffUserMessage(
            product.name,
            product.baseScore,
            product.tier,
            lastScoredDate
          )
        );
        const diff = validateDiffResponse(raw);

        if (!diff.change) {
          await ctx.runMutation(internal.products.updateRefreshConfirmed, {
            productId,
          });
          results.unchanged++;
        } else {
          await ctx.runMutation(internal.products.applyRefresh, {
            productId,
            baseScore: diff.baseScore,
            tier: diff.tier,
            changeReason: diff.change_reason,
          });
          results.updated++;
        }
      } catch (err) {
        results.failed++;
      }
    }

    return results;
  },
});

// Internal action: batched refresh check via scheduler
export const refreshCheckBatch = internalAction({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.runQuery(internal.products.listScoredPage, {
      cursor: args.cursor,
    });

    if (page.productIds.length === 0) return;

    await ctx.runAction(api.scoring.refreshCheck, {
      productIds: page.productIds,
    });

    if (page.nextCursor) {
      await ctx.scheduler.runAfter(
        1000,
        internal.scoring.refreshCheckBatch,
        { cursor: page.nextCursor }
      );
    }
  },
});
