// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGuestProfile } from "./useGuestProfile";

const PROFILE_KEY = "clarvn_profile";
const DRAFT_KEY = "clarvn_onboarding_profile";

beforeEach(() => {
  localStorage.clear();
});

describe("useGuestProfile", () => {
  test("returns null when no profile data exists", () => {
    const { result } = renderHook(() => useGuestProfile());
    expect(result.current).toBeNull();
  });

  test("returns profile from finalized clarvn_profile", () => {
    const profile = {
      motivation: ["Weight management"],
      conditions: ["IBS"],
      sensitivities: ["Gluten"],
      dietaryRestrictions: ["Vegan"],
      lifeStage: "just_me",
      householdMembers: [],
      ingredientsToAvoid: ["msg"],
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    const { result } = renderHook(() => useGuestProfile());

    expect(result.current).not.toBeNull();
    expect(result.current!.conditions).toEqual(["IBS"]);
    expect(result.current!.sensitivities).toEqual(["Gluten"]);
    expect(result.current!.motivation).toEqual(["Weight management"]);
  });

  test("falls back to draft when no finalized profile", () => {
    const draft = {
      motivation: ["Just curious"],
      conditions: ["Diabetes"],
      sensitivities: [],
      dietaryRestrictions: [],
      lifeStage: "just_me",
      householdMembers: [],
      ingredientsToAvoid: [],
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

    const { result } = renderHook(() => useGuestProfile());

    expect(result.current).not.toBeNull();
    expect(result.current!.motivation).toEqual(["Just curious"]);
    expect(result.current!.conditions).toEqual(["Diabetes"]);
  });

  test("prefers finalized profile over draft", () => {
    const finalized = {
      motivation: ["Health"],
      conditions: ["IBS"],
      sensitivities: [],
      dietaryRestrictions: [],
      lifeStage: "just_me",
      householdMembers: [],
      ingredientsToAvoid: [],
    };
    const draft = {
      motivation: ["Draft motivation"],
      conditions: ["Different condition"],
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(finalized));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

    const { result } = renderHook(() => useGuestProfile());

    expect(result.current!.motivation).toEqual(["Health"]); // from finalized
    expect(result.current!.conditions).toEqual(["IBS"]); // from finalized
  });

  test("returns null for empty finalized profile (all arrays empty)", () => {
    const emptyProfile = {
      motivation: [],
      conditions: [],
      sensitivities: [],
      dietaryRestrictions: [],
      lifeStage: "",
      householdMembers: [],
      ingredientsToAvoid: [],
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(emptyProfile));

    const { result } = renderHook(() => useGuestProfile());

    // All arrays are empty — should fall through to draft (also empty), then null
    expect(result.current).toBeNull();
  });

  test("returns null for empty draft (no selections made)", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({}));

    const { result } = renderHook(() => useGuestProfile());

    expect(result.current).toBeNull();
  });
});
