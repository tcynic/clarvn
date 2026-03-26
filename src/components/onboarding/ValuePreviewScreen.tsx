"use client";

import { useRouter } from "next/navigation";
import type { OnboardingDraft } from "@/lib/onboardingStorage";

interface Section {
  label: string;
  items: string[];
}

interface ValuePreviewScreenProps {
  draft: OnboardingDraft;
  onCreateAccount: () => void;
  onExploreAsGuest: () => void;
}

function buildSections(draft: OnboardingDraft): Section[] {
  const sections: Section[] = [];

  if (draft.conditions?.length) {
    sections.push({ label: "Conditions", items: draft.conditions });
  }
  if (draft.sensitivities?.length) {
    sections.push({ label: "Sensitivities", items: draft.sensitivities });
  }
  if (draft.dietaryRestrictions?.length) {
    sections.push({ label: "Dietary", items: draft.dietaryRestrictions });
  }
  if (draft.householdMembers?.length) {
    sections.push({
      label: "Household",
      items: draft.householdMembers.map((m) => m.role),
    });
  }
  if (draft.ingredientsToAvoid?.length) {
    sections.push({
      label: "Ingredients to flag",
      items: draft.ingredientsToAvoid,
    });
  }
  if (draft.motivation?.length) {
    sections.push({ label: "Goals", items: draft.motivation });
  }

  return sections;
}

function countActiveFlags(draft: OnboardingDraft): number {
  return (
    (draft.conditions?.length ?? 0) +
    (draft.sensitivities?.length ?? 0) +
    (draft.dietaryRestrictions?.length ?? 0) +
    (draft.householdMembers?.length ?? 0) +
    (draft.ingredientsToAvoid?.length ?? 0)
  );
}

export function ValuePreviewScreen({
  draft,
  onCreateAccount,
  onExploreAsGuest,
}: ValuePreviewScreenProps) {
  const sections = buildSections(draft);
  const flagCount = countActiveFlags(draft);

  return (
    <div className="onboarding-container">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="section-eyebrow mb-2">Your profile is ready</p>
        <h1 className="onboarding-title">
          {flagCount > 0
            ? `${flagCount} active flag${flagCount === 1 ? "" : "s"} personalised`
            : "Profile complete"}
        </h1>
        <p className="text-sm text-[var(--ink-3)] mt-2">
          We&apos;ll highlight ingredients that matter to you on every product.
        </p>
      </div>

      {/* Preview sections */}
      {sections.length > 0 && (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-5 mb-8 space-y-4">
          {sections.map((section) => {
            const shown = section.items.slice(0, 4);
            const overflow = section.items.length - shown.length;
            return (
              <div key={section.label}>
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">
                  {section.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {shown.map((item) => (
                    <span key={item} className="pill-neutral text-xs">
                      {item}
                    </span>
                  ))}
                  {overflow > 0 && (
                    <span className="pill-neutral text-xs">+{overflow} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onCreateAccount}
          className="w-full bg-[var(--teal)] text-white font-medium text-sm px-5 py-3.5 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors"
        >
          Create your free account
        </button>
        <button
          type="button"
          onClick={onExploreAsGuest}
          className="w-full text-sm font-medium text-[var(--ink-3)] py-3 rounded-[var(--radius)] hover:text-[var(--ink)] transition-colors"
        >
          Explore without an account
        </button>
      </div>

      <p className="text-xs text-[var(--ink-4)] text-center mt-4">
        Creating an account starts your free 14-day Premium trial. No credit
        card required.
      </p>
    </div>
  );
}
