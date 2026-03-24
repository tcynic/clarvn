"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey });
}

/**
 * Parse free-text onboarding answers with an LLM and save the resulting profile.
 * answers[0] = response to "what brings you here"
 * answers[1] = response to conditions question
 * answers[2] = response to sensitivities question
 */
export const parseAndSaveProfile = action({
  args: {
    answers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const anthropic = getAnthropicClient();

    const prompt = `You are extracting a health profile from a user's onboarding conversation.

The user answered three questions:
1. "What brings you to CleanList?" → "${args.answers[0]}"
2. "Do you have any diagnosed health conditions?" → "${args.answers[1]}"
3. "Any sensitivities or things you personally react to?" → "${args.answers[2]}"

Extract and return a JSON object with exactly these fields:
- motivation: string (a brief summary of why they're using the app, max 100 chars)
- conditions: string[] (health conditions mentioned — include suspected or unconfirmed ones too, e.g. "might have IBS" → ["IBS"]; normalize names, e.g. "pre-diabetic" → "pre-diabetes"; empty array if none)
- sensitivities: string[] (any substance the user mentions reacting to, even casually, e.g. "I get headaches after wine" → ["wine"]; empty array if none)

Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: {
      motivation: string;
      conditions: string[];
      sensitivities: string[];
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback: save raw answers if parsing fails
      parsed = {
        motivation: args.answers[0].slice(0, 100),
        conditions: [],
        sensitivities: [],
      };
    }

    await ctx.runMutation(internal.userProfiles.createOrUpdateProfileInternal, {
      motivation: parsed.motivation ?? "",
      conditions: parsed.conditions ?? [],
      sensitivities: parsed.sensitivities ?? [],
    });
  },
});
