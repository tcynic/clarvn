"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingChipScreen } from "@/components/onboarding/OnboardingChipScreen";
import { HouseholdScreen } from "@/components/onboarding/HouseholdScreen";
import { ValuePreviewScreen } from "@/components/onboarding/ValuePreviewScreen";
import {
  type OnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  loadOnboardingStep,
  saveOnboardingStep,
  draftToProfile,
  clearOnboardingData,
} from "@/lib/onboardingStorage";
import { saveProfile } from "@/lib/personalScore";
import {
  MOTIVATION_CHIPS,
  CONDITIONS_CHIPS,
  CONDITIONS_EXCLUSIVE,
  SENSITIVITIES_CHIPS,
  SENSITIVITIES_EXCLUSIVE,
  DIETARY_CHIPS,
  DIETARY_EXCLUSIVE,
  INGREDIENTS_TO_FLAG_CHIPS,
} from "@/lib/onboardingChips";
import type { HouseholdMember } from "@/lib/onboardingStorage";

const TOTAL_STEPS = 7; // 6 chip screens + 1 preview (step index 6)

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount for resumption support
  useEffect(() => {
    const savedDraft = loadOnboardingDraft();
    const savedStep = loadOnboardingStep();
    setDraft(savedDraft);
    setStep(savedStep);
    setMounted(true);
  }, []);

  function updateDraft(patch: Partial<OnboardingDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    saveOnboardingDraft(next);
  }

  function advance(patch?: Partial<OnboardingDraft>) {
    const next = patch ? { ...draft, ...patch } : draft;
    setDraft(next);
    saveOnboardingDraft(next);
    const nextStep = step + 1;
    setStep(nextStep);
    saveOnboardingStep(nextStep);
  }

  function goBack() {
    const prevStep = Math.max(0, step - 1);
    setStep(prevStep);
    saveOnboardingStep(prevStep);
  }

  // Toggle logic for regular multi-select chips
  function toggleChip(
    field: keyof Pick<
      OnboardingDraft,
      "motivation" | "conditions" | "sensitivities" | "dietaryRestrictions" | "ingredientsToAvoid"
    >,
    value: string,
    exclusiveValue?: string
  ) {
    const current = (draft[field] as string[]) ?? [];

    let next: string[];
    if (value === exclusiveValue) {
      // Selecting the exclusive chip clears all others
      next = current.includes(value) ? [] : [value];
    } else {
      // Selecting a regular chip deselects the exclusive chip
      const withoutExclusive = current.filter((v) => v !== exclusiveValue);
      next = withoutExclusive.includes(value)
        ? withoutExclusive.filter((v) => v !== value)
        : [...withoutExclusive, value];
    }

    updateDraft({ [field]: next });
  }

  function handleCreateAccount() {
    router.push("/login?from=onboarding");
  }

  function handleExploreAsGuest() {
    // Save draft as finalized profile to clarvn_profile; leave draft keys intact for auth conversion
    saveProfile(draftToProfile(draft));
    router.push("/home");
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col">
      <div className="flex-1 flex items-start justify-center py-8">
        {/* Step 0 — Motivation */}
        {step === 0 && (
          <OnboardingChipScreen
            stepNumber={1}
            title="What brings you to Clarvn?"
            chips={MOTIVATION_CHIPS}
            selectedValues={draft.motivation ?? []}
            onToggle={(v) => toggleChip("motivation", v)}
            onNext={() => advance()}
          />
        )}

        {/* Step 1 — Conditions */}
        {step === 1 && (
          <OnboardingChipScreen
            stepNumber={2}
            title="Do any of these apply to you?"
            chips={CONDITIONS_CHIPS}
            selectedValues={draft.conditions ?? []}
            onToggle={(v) => toggleChip("conditions", v, CONDITIONS_EXCLUSIVE)}
            exclusiveChip={CONDITIONS_EXCLUSIVE}
            onNext={() => advance()}
            onBack={goBack}
          />
        )}

        {/* Step 2 — Sensitivities */}
        {step === 2 && (
          <OnboardingChipScreen
            stepNumber={3}
            title="Any sensitivities?"
            chips={SENSITIVITIES_CHIPS}
            selectedValues={draft.sensitivities ?? []}
            onToggle={(v) =>
              toggleChip("sensitivities", v, SENSITIVITIES_EXCLUSIVE)
            }
            exclusiveChip={SENSITIVITIES_EXCLUSIVE}
            onNext={() => advance()}
            onBack={goBack}
          />
        )}

        {/* Step 3 — Dietary Restrictions */}
        {step === 3 && (
          <OnboardingChipScreen
            stepNumber={4}
            title="Any dietary restrictions?"
            chips={DIETARY_CHIPS}
            selectedValues={draft.dietaryRestrictions ?? []}
            onToggle={(v) =>
              toggleChip("dietaryRestrictions", v, DIETARY_EXCLUSIVE)
            }
            exclusiveChip={DIETARY_EXCLUSIVE}
            onNext={() => advance()}
            onBack={goBack}
          />
        )}

        {/* Step 4 — Household */}
        {step === 4 && (
          <HouseholdScreen
            lifeStage={draft.lifeStage ?? ""}
            householdMembers={(draft.householdMembers ?? []) as HouseholdMember[]}
            onLifeStageChange={(stage) => updateDraft({ lifeStage: stage })}
            onMembersChange={(members) =>
              updateDraft({ householdMembers: members })
            }
            onNext={() => advance()}
            onBack={goBack}
          />
        )}

        {/* Step 5 — Ingredients to Flag */}
        {step === 5 && (
          <OnboardingChipScreen
            stepNumber={6}
            title="Any specific ingredients to flag?"
            subtitle="We'll highlight these on every product."
            chips={INGREDIENTS_TO_FLAG_CHIPS}
            selectedValues={draft.ingredientsToAvoid ?? []}
            onToggle={(v) => toggleChip("ingredientsToAvoid", v)}
            allowSkip
            onSkip={() => advance({ ingredientsToAvoid: [] })}
            onNext={() => advance()}
            onBack={goBack}
          />
        )}

        {/* Step 6 — Value Preview */}
        {step === 6 && (
          <ValuePreviewScreen
            draft={draft}
            onCreateAccount={handleCreateAccount}
            onExploreAsGuest={handleExploreAsGuest}
          />
        )}
      </div>
    </div>
  );
}
