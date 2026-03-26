type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

export interface ModifierData {
  ingredientId: string;
  condition: string;
  modifierAmount: number;
  evidenceCitation: string;
  evidenceQuality?: string;
  status: string;
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

export function getTierFromScore(score: number): Tier {
  if (score < 4.0) return "Clean";
  if (score < 6.0) return "Watch";
  if (score < 8.0) return "Caution";
  return "Avoid";
}

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

export interface UserProfile {
  motivation: string[];
  conditions: string[];
  sensitivities: string[];
  dietaryRestrictions: string[];
  lifeStage: string; // "just_me" | "household" | ""
  householdMembers: { role: string; ageRange?: string }[];
  ingredientsToAvoid: string[];
}

const PROFILE_KEY = "clarvn_profile";

const DEFAULT_PROFILE: UserProfile = {
  motivation: [],
  conditions: [],
  sensitivities: [],
  dietaryRestrictions: [],
  lifeStage: "",
  householdMembers: [],
  ingredientsToAvoid: [],
};

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle profiles saved before new fields were added
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
