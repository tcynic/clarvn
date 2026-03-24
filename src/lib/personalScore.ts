type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

export interface UserProfile {
  motivation: string[];
  conditions: string[];
  sensitivities: string[];
}

export interface ModifierData {
  ingredientId: string;
  condition: string;
  modifierAmount: number;
  evidenceCitation: string;
  evidenceQuality?: string;
  status: string;
}

export function getTierFromScore(score: number): Tier {
  // Transitional bands (3.1–3.9, 5.1–5.9, 7.1–7.9) display with the lower tier label.
  // Per worked example: 7.7 = Caution. Boundaries are therefore <4, <6, <8.
  if (score < 4.0) return "Clean";
  if (score < 6.0) return "Watch";
  if (score < 8.0) return "Caution";
  return "Avoid";
}

export interface PersonalScoreResult {
  baseScore: number;
  personalScore: number;
  tier: Tier;
  personalTier: Tier;
  appliedModifiers: Array<{
    condition: string;
    ingredientId: string;
    modifierAmount: number;
    evidenceCitation: string;
  }>;
}

/**
 * Calculate a user's personal score for a product.
 *
 * Health data (profile) never leaves the device — this runs entirely client-side.
 * Personal Score = Base Score + Σ(applicable profile modifiers), capped at 10.0
 */
export function getPersonalScore(
  baseScore: number,
  modifiers: ModifierData[],
  profile: UserProfile
): PersonalScoreResult {
  const activeConditions = new Set([
    ...profile.conditions.map((c) => c.toLowerCase()),
    ...profile.sensitivities.map((s) => s.toLowerCase()),
  ]);

  const appliedModifiers: PersonalScoreResult["appliedModifiers"] = [];

  let totalModifier = 0;

  for (const mod of modifiers) {
    if (mod.status !== "active") continue;
    if (activeConditions.has(mod.condition.toLowerCase())) {
      totalModifier += mod.modifierAmount;
      appliedModifiers.push({
        condition: mod.condition,
        ingredientId: mod.ingredientId,
        modifierAmount: mod.modifierAmount,
        evidenceCitation: mod.evidenceCitation,
      });
    }
  }

  const personalScore = Math.min(10.0, baseScore + totalModifier);

  return {
    baseScore,
    personalScore,
    tier: getTierFromScore(baseScore),
    personalTier: getTierFromScore(personalScore),
    appliedModifiers,
  };
}

// localStorage helpers
const PROFILE_KEY = "clarvn_profile";

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") {
    return { motivation: [], conditions: [], sensitivities: [] };
  }
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { motivation: [], conditions: [], sensitivities: [] };
    return JSON.parse(raw) as UserProfile;
  } catch {
    return { motivation: [], conditions: [], sensitivities: [] };
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PROFILE_KEY) !== null;
}
