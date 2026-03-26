import type { UserProfile } from "./personalScore";

const DRAFT_KEY = "clarvn_onboarding_profile";
const STEP_KEY = "clarvn_onboarding_step";

export interface HouseholdMember {
  role: string;
  ageRange?: string;
}

/** Accumulated onboarding selections — all fields optional as they fill in step by step. */
export interface OnboardingDraft {
  motivation?: string[];
  conditions?: string[];
  sensitivities?: string[];
  dietaryRestrictions?: string[];
  lifeStage?: string;
  householdMembers?: HouseholdMember[];
  ingredientsToAvoid?: string[];
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadOnboardingDraft(): OnboardingDraft {
  return safeGet<OnboardingDraft>(DRAFT_KEY, {});
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadOnboardingStep(): number {
  return safeGet<number>(STEP_KEY, 0);
}

export function saveOnboardingStep(step: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STEP_KEY, JSON.stringify(step));
}

export function clearOnboardingData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(STEP_KEY);
}

/** Returns true if an in-progress onboarding draft exists in localStorage. */
export function hasOnboardingDraft(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return false;
  try {
    const draft = JSON.parse(raw) as OnboardingDraft;
    // Consider it a real draft only if at least one field has been filled in
    return Object.values(draft).some(
      (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))
    );
  } catch {
    return false;
  }
}

/** Converts a completed draft to the canonical UserProfile shape used throughout the app. */
export function draftToProfile(draft: OnboardingDraft): UserProfile {
  return {
    motivation: draft.motivation ?? [],
    conditions: draft.conditions ?? [],
    sensitivities: draft.sensitivities ?? [],
    dietaryRestrictions: draft.dietaryRestrictions ?? [],
    lifeStage: draft.lifeStage ?? "just_me",
    householdMembers: draft.householdMembers ?? [],
    ingredientsToAvoid: draft.ingredientsToAvoid ?? [],
  };
}
