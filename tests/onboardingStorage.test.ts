import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
  loadOnboardingStep,
  saveOnboardingStep,
  clearOnboardingData,
  hasOnboardingDraft,
  draftToProfile,
} from "../src/lib/onboardingStorage";

// ---------------------------------------------------------------------------
// localStorage mock (Node env has no window/localStorage)
// ---------------------------------------------------------------------------

function makeLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    _store: store,
  };
}

let mockStorage: ReturnType<typeof makeLocalStorageMock>;

beforeEach(() => {
  mockStorage = makeLocalStorageMock();
  vi.stubGlobal("window", { localStorage: mockStorage });
  vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Draft read / write
// ---------------------------------------------------------------------------

describe("onboardingStorage — draft", () => {
  test("loadOnboardingDraft returns {} when nothing saved", () => {
    expect(loadOnboardingDraft()).toEqual({});
  });

  test("saveOnboardingDraft then loadOnboardingDraft round-trips", () => {
    const draft = {
      motivation: ["General health"],
      conditions: ["ADHD"],
    };
    saveOnboardingDraft(draft);
    expect(loadOnboardingDraft()).toEqual(draft);
  });

  test("saves and restores all optional fields", () => {
    const draft = {
      motivation: ["Gut health"],
      conditions: ["ADHD"],
      sensitivities: ["IBS / gut issues"],
      dietaryRestrictions: ["Gluten-free"],
      lifeStage: "household",
      householdMembers: [{ role: "partner" }, { role: "child", ageRange: "3-12" }],
      ingredientsToAvoid: ["Red 40", "BHT"],
    };
    saveOnboardingDraft(draft);
    expect(loadOnboardingDraft()).toEqual(draft);
  });

  test("overwrites existing draft on second save", () => {
    saveOnboardingDraft({ motivation: ["General health"] });
    saveOnboardingDraft({ motivation: ["Weight management"] });
    expect(loadOnboardingDraft()).toEqual({ motivation: ["Weight management"] });
  });
});

// ---------------------------------------------------------------------------
// Step read / write
// ---------------------------------------------------------------------------

describe("onboardingStorage — step", () => {
  test("loadOnboardingStep returns 0 when nothing saved", () => {
    expect(loadOnboardingStep()).toBe(0);
  });

  test("saveOnboardingStep then loadOnboardingStep round-trips", () => {
    saveOnboardingStep(3);
    expect(loadOnboardingStep()).toBe(3);
  });

  test("overwrites existing step", () => {
    saveOnboardingStep(2);
    saveOnboardingStep(5);
    expect(loadOnboardingStep()).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// clearOnboardingData
// ---------------------------------------------------------------------------

describe("onboardingStorage — clearOnboardingData", () => {
  test("removes both draft and step keys", () => {
    saveOnboardingDraft({ motivation: ["General health"] });
    saveOnboardingStep(3);
    clearOnboardingData();
    expect(loadOnboardingDraft()).toEqual({});
    expect(loadOnboardingStep()).toBe(0);
  });

  test("is idempotent — safe to call when nothing is stored", () => {
    expect(() => clearOnboardingData()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// hasOnboardingDraft
// ---------------------------------------------------------------------------

describe("onboardingStorage — hasOnboardingDraft", () => {
  test("returns false when nothing saved", () => {
    expect(hasOnboardingDraft()).toBe(false);
  });

  test("returns false for empty draft (no selections made)", () => {
    saveOnboardingDraft({});
    expect(hasOnboardingDraft()).toBe(false);
  });

  test("returns false for draft with only empty arrays", () => {
    saveOnboardingDraft({ motivation: [], conditions: [], sensitivities: [] });
    expect(hasOnboardingDraft()).toBe(false);
  });

  test("returns true when at least one chip is selected", () => {
    saveOnboardingDraft({ motivation: ["General health"] });
    expect(hasOnboardingDraft()).toBe(true);
  });

  test("returns true when only a lifeStage is set", () => {
    saveOnboardingDraft({ lifeStage: "just_me" });
    expect(hasOnboardingDraft()).toBe(true);
  });

  test("returns false after clearOnboardingData", () => {
    saveOnboardingDraft({ motivation: ["General health"] });
    clearOnboardingData();
    expect(hasOnboardingDraft()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// draftToProfile
// ---------------------------------------------------------------------------

describe("onboardingStorage — draftToProfile", () => {
  test("empty draft produces all-defaults profile", () => {
    const profile = draftToProfile({});
    expect(profile).toEqual({
      motivation: [],
      conditions: [],
      sensitivities: [],
      dietaryRestrictions: [],
      lifeStage: "just_me",
      householdMembers: [],
      ingredientsToAvoid: [],
    });
  });

  test("populated draft maps all fields correctly", () => {
    const profile = draftToProfile({
      motivation: ["Gut health"],
      conditions: ["ADHD"],
      sensitivities: ["IBS / gut issues"],
      dietaryRestrictions: ["Gluten-free"],
      lifeStage: "household",
      householdMembers: [{ role: "partner" }],
      ingredientsToAvoid: ["Red 40"],
    });
    expect(profile.motivation).toEqual(["Gut health"]);
    expect(profile.conditions).toEqual(["ADHD"]);
    expect(profile.sensitivities).toEqual(["IBS / gut issues"]);
    expect(profile.dietaryRestrictions).toEqual(["Gluten-free"]);
    expect(profile.lifeStage).toBe("household");
    expect(profile.householdMembers).toEqual([{ role: "partner" }]);
    expect(profile.ingredientsToAvoid).toEqual(["Red 40"]);
  });

  test("partial draft fills missing fields with defaults", () => {
    const profile = draftToProfile({ motivation: ["Energy"], conditions: ["ADHD"] });
    expect(profile.sensitivities).toEqual([]);
    expect(profile.dietaryRestrictions).toEqual([]);
    expect(profile.lifeStage).toBe("just_me");
    expect(profile.householdMembers).toEqual([]);
    expect(profile.ingredientsToAvoid).toEqual([]);
  });
});
