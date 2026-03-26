"use client";

import { useEffect, useState } from "react";
import {
  loadOnboardingDraft,
  draftToProfile,
} from "@/lib/onboardingStorage";
import { loadProfile, type UserProfile } from "@/lib/personalScore";

/**
 * Returns the active user profile regardless of auth state.
 *
 * Priority:
 * 1. If a finalized `clarvn_profile` exists in localStorage (set after guest
 *    browses or after auth sync), return that.
 * 2. If an in-progress `clarvn_onboarding_profile` draft exists, convert and
 *    return it — this covers the case where a guest navigates to /home
 *    immediately after the value preview.
 * 3. Otherwise return null (no profile — redirect to /onboarding).
 */
export function useGuestProfile(): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const finalized = loadProfile();
    const hasFinalized =
      finalized.conditions.length > 0 ||
      finalized.sensitivities.length > 0 ||
      finalized.motivation.length > 0 ||
      finalized.dietaryRestrictions.length > 0 ||
      finalized.ingredientsToAvoid.length > 0;

    if (hasFinalized) {
      setProfile(finalized);
      return;
    }

    const draft = loadOnboardingDraft();
    const hasDraft = Object.values(draft).some((v) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v)
    );

    if (hasDraft) {
      setProfile(draftToProfile(draft));
      return;
    }

    setProfile(null);
  }, []);

  return profile;
}
