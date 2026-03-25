"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "./lib/auth";

const anthropic = new Anthropic();

// Admin action: use Claude to suggest likely brand names for an unknown-brand product.
export const suggestBrands = action({
  args: { productId: v.id("products") },
  handler: async (ctx, args): Promise<string[]> => {
    await requireAdmin(ctx);

    const product = await ctx.runQuery(api.products.getProductById, { id: args.productId });
    if (!product) throw new Error("Product not found");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      temperature: 0,
      system:
        'You are a consumer packaged goods database expert. Return ONLY a JSON array of strings, no other text.',
      messages: [
        {
          role: "user",
          content: `What are the most likely brand names for a food product called "${product.name}"? Return up to 5 brand name suggestions ordered by likelihood. If it could be a generic or store brand, include "Generic". Return ONLY a JSON array, e.g. ["Brand A", "Brand B"].`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "[]";

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
          .slice(0, 5);
      }
    } catch {
      // fall through
    }
    return [];
  },
});
