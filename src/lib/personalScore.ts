export interface UserProfile {
  motivation: string[];
  conditions: string[];
  sensitivities: string[];
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

