/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { normalizeMotivation } from "../convex/lib/normalizeMotivation";

const modules = import.meta.glob("../convex/**/*.ts");

function withUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

// ============================================================
// normalizeMotivation (pure unit tests)
// ============================================================

describe("Epic 3 — normalizeMotivation", () => {
  test("undefined → empty array", () => {
    expect(normalizeMotivation(undefined)).toEqual([]);
  });

  test("empty string → empty array", () => {
    expect(normalizeMotivation("")).toEqual([]);
  });

  test("single value string → single-element array", () => {
    expect(normalizeMotivation("General health")).toEqual(["General health"]);
  });

  test("comma-separated string → trimmed array", () => {
    expect(normalizeMotivation("General health, Kids, Energy")).toEqual([
      "General health",
      "Kids",
      "Energy",
    ]);
  });

  test("string with extra whitespace is trimmed", () => {
    expect(normalizeMotivation("  Weight management ,  Gut health  ")).toEqual([
      "Weight management",
      "Gut health",
    ]);
  });

  test("array passthrough — no modification", () => {
    const arr = ["General health", "Kids"];
    expect(normalizeMotivation(arr)).toBe(arr);
  });

  test("empty array passthrough", () => {
    expect(normalizeMotivation([])).toEqual([]);
  });
});

// ============================================================
// createProfileFromOnboarding mutation
// ============================================================

describe("Epic 3 — createProfileFromOnboarding", () => {
  test("creates profile with all 7 fields", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    await asUser.mutation(api.userProfiles.createProfileFromOnboarding, {
      motivation: ["General health", "Gut health"],
      conditions: ["ADHD"],
      sensitivities: ["IBS / gut issues"],
      dietaryRestrictions: ["Gluten-free"],
      lifeStage: "just_me",
      householdMembers: [],
      ingredientsToAvoid: ["Red 40", "BHT"],
    });

    const profile = await asUser.query(api.userProfiles.getMyProfile, {});
    expect(profile).not.toBeNull();
    expect(profile!.motivation).toEqual(["General health", "Gut health"]);
    expect(profile!.conditions).toEqual(["ADHD"]);
    expect(profile!.sensitivities).toEqual(["IBS / gut issues"]);
    expect(profile!.dietaryRestrictions).toEqual(["Gluten-free"]);
    expect(profile!.lifeStage).toBe("just_me");
    expect(profile!.householdMembers).toEqual([]);
    expect(profile!.ingredientsToAvoid).toEqual(["Red 40", "BHT"]);
  });

  test("upserts on second call — does not create duplicates", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    await asUser.mutation(api.userProfiles.createProfileFromOnboarding, {
      motivation: ["General health"],
      conditions: [],
      sensitivities: [],
      dietaryRestrictions: [],
      lifeStage: "just_me",
      householdMembers: [],
      ingredientsToAvoid: [],
    });

    await asUser.mutation(api.userProfiles.createProfileFromOnboarding, {
      motivation: ["Weight management"],
      conditions: ["ADHD"],
      sensitivities: [],
      dietaryRestrictions: [],
      lifeStage: "just_me",
      householdMembers: [],
      ingredientsToAvoid: [],
    });

    const allProfiles = await t.run(async (ctx) =>
      ctx.db.query("user_profiles").collect()
    );
    expect(allProfiles).toHaveLength(1);
    expect(allProfiles[0].motivation).toEqual(["Weight management"]);
    expect(allProfiles[0].conditions).toEqual(["ADHD"]);
  });

  test("optional fields default correctly when omitted", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    await asUser.mutation(api.userProfiles.createProfileFromOnboarding, {
      motivation: ["General health"],
      conditions: [],
      sensitivities: [],
    });

    const profile = await asUser.query(api.userProfiles.getMyProfile, {});
    expect(profile!.dietaryRestrictions).toEqual([]);
    expect(profile!.lifeStage).toBe("just_me");
    expect(profile!.householdMembers).toEqual([]);
    expect(profile!.ingredientsToAvoid).toEqual([]);
  });

  test("throws when not authenticated", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.userProfiles.createProfileFromOnboarding, {
        motivation: [],
        conditions: [],
        sensitivities: [],
      })
    ).rejects.toThrow();
  });
});

// ============================================================
// getMyProfile — new field shapes + motivation normalisation
// ============================================================

describe("Epic 3 — getMyProfile new fields", () => {
  test("returns household members correctly", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    await asUser.mutation(api.userProfiles.createProfileFromOnboarding, {
      motivation: [],
      conditions: [],
      sensitivities: [],
      lifeStage: "household",
      householdMembers: [
        { role: "partner" },
        { role: "child", ageRange: "3-12" },
      ],
      dietaryRestrictions: [],
      ingredientsToAvoid: [],
    });

    const profile = await asUser.query(api.userProfiles.getMyProfile, {});
    expect(profile!.lifeStage).toBe("household");
    expect(profile!.householdMembers).toHaveLength(2);
    expect(profile!.householdMembers![0]).toEqual({ role: "partner" });
    expect(profile!.householdMembers![1]).toEqual({
      role: "child",
      ageRange: "3-12",
    });
  });

  test("string motivation in DB is normalised to array on read", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));

    // Simulate a legacy row with string motivation
    await t.run(async (ctx) => {
      ctx.db.insert("user_profiles", {
        userId: String(userId),
        motivation: "General health, Weight management" as unknown as string[],
        conditions: [],
        sensitivities: [],
      });
    });

    const asUser = withUser(t, userId);
    const profile = await asUser.query(api.userProfiles.getMyProfile, {});
    expect(profile!.motivation).toEqual(["General health", "Weight management"]);
  });

  test("returns null when no profile exists", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    const profile = await asUser.query(api.userProfiles.getMyProfile, {});
    expect(profile).toBeNull();
  });
});

// ============================================================
// backfillMotivation migration
// ============================================================

describe("Epic 3 — backfillMotivation", () => {
  test("converts string motivation to single-element array", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));

    await t.run(async (ctx) => {
      ctx.db.insert("user_profiles", {
        userId: String(userId),
        motivation: "General health" as unknown as string[],
        conditions: [],
        sensitivities: [],
      });
    });

    const result = await t.mutation(internal.migrations.backfillMotivation.run, {});
    expect(result.converted).toBe(1);
    expect(result.done).toBe(true);

    const profiles = await t.run(async (ctx) =>
      ctx.db.query("user_profiles").collect()
    );
    expect(profiles[0].motivation).toEqual(["General health"]);
  });

  test("converts comma-separated string to multi-element array", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));

    await t.run(async (ctx) => {
      ctx.db.insert("user_profiles", {
        userId: String(userId),
        motivation: "General health, Kids, Energy" as unknown as string[],
        conditions: [],
        sensitivities: [],
      });
    });

    await t.mutation(internal.migrations.backfillMotivation.run, {});

    const profiles = await t.run(async (ctx) =>
      ctx.db.query("user_profiles").collect()
    );
    expect(profiles[0].motivation).toEqual(["General health", "Kids", "Energy"]);
  });

  test("skips rows where motivation is already an array", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));

    await t.run(async (ctx) => {
      ctx.db.insert("user_profiles", {
        userId: String(userId),
        motivation: ["General health"],
        conditions: [],
        sensitivities: [],
      });
    });

    const result = await t.mutation(internal.migrations.backfillMotivation.run, {});
    expect(result.converted).toBe(0);

    const profiles = await t.run(async (ctx) =>
      ctx.db.query("user_profiles").collect()
    );
    expect(profiles[0].motivation).toEqual(["General health"]);
  });

  test("converts only string rows in a mixed dataset", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      ctx.db.insert("user_profiles", {
        userId: "user1",
        motivation: "Weight management" as unknown as string[],
        conditions: [],
        sensitivities: [],
      });
      ctx.db.insert("user_profiles", {
        userId: "user2",
        motivation: ["Gut health"],
        conditions: [],
        sensitivities: [],
      });
      ctx.db.insert("user_profiles", {
        userId: "user3",
        motivation: "Kids, Energy" as unknown as string[],
        conditions: [],
        sensitivities: [],
      });
    });

    const result = await t.mutation(internal.migrations.backfillMotivation.run, {});
    expect(result.converted).toBe(2);

    const profiles = await t.run(async (ctx) =>
      ctx.db.query("user_profiles").collect()
    );
    const byUserId = Object.fromEntries(profiles.map((p) => [p.userId, p.motivation]));
    expect(byUserId["user1"]).toEqual(["Weight management"]);
    expect(byUserId["user2"]).toEqual(["Gut health"]);
    expect(byUserId["user3"]).toEqual(["Kids", "Energy"]);
  });

  test("returns done=false and schedules continuation when more rows remain", async () => {
    const t = convexTest(schema, modules);

    // Insert 101 profiles (batch size is 100)
    await t.run(async (ctx) => {
      for (let i = 0; i < 101; i++) {
        ctx.db.insert("user_profiles", {
          userId: `user${i}`,
          motivation: `Goal ${i}` as unknown as string[],
          conditions: [],
          sensitivities: [],
        });
      }
    });

    const result = await t.mutation(internal.migrations.backfillMotivation.run, {});
    expect(result.converted).toBe(100);
    expect(result.done).toBe(false);
  });
});
