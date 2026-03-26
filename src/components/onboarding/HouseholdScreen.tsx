"use client";

import { useState } from "react";
import { HOUSEHOLD_ROLES, type HouseholdRole } from "@/lib/onboardingChips";
import type { HouseholdMember } from "@/lib/onboardingStorage";

interface HouseholdScreenProps {
  lifeStage: string;
  householdMembers: HouseholdMember[];
  onLifeStageChange: (stage: string) => void;
  onMembersChange: (members: HouseholdMember[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function HouseholdScreen({
  lifeStage,
  householdMembers,
  onLifeStageChange,
  onMembersChange,
  onNext,
  onBack,
}: HouseholdScreenProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const progress = (5 / 6) * 100;

  function handleToggle(mode: "just_me" | "household") {
    onLifeStageChange(mode);
    if (mode === "just_me") {
      onMembersChange([]);
      setPickerOpen(false);
    }
  }

  function addMember(role: HouseholdRole) {
    onMembersChange([
      ...householdMembers,
      { role: role.role, ageRange: role.ageRange },
    ]);
    setPickerOpen(false);
  }

  function removeMember(index: number) {
    onMembersChange(householdMembers.filter((_, i) => i !== index));
  }

  function getMemberLabel(member: HouseholdMember): string {
    const found = HOUSEHOLD_ROLES.find((r) => r.role === member.role);
    return found?.label ?? member.role;
  }

  const canContinue = Boolean(lifeStage);

  return (
    <div className="onboarding-container">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-[var(--ink-3)] font-medium">
            Step 5 of 6
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Heading */}
      <h1 className="onboarding-title">Who are you shopping for?</h1>
      <div className="mb-5" />

      {/* Toggle cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => handleToggle("just_me")}
          className={`p-4 rounded-[var(--radius-lg)] border-2 text-left transition-colors ${
            lifeStage === "just_me"
              ? "border-[var(--teal)] bg-[var(--teal-light)]"
              : "border-[var(--border)] bg-white hover:border-[var(--teal-pale)]"
          }`}
        >
          <div className="text-2xl mb-1">🧑</div>
          <div className="font-medium text-sm text-[var(--ink)]">Just me</div>
        </button>
        <button
          type="button"
          onClick={() => handleToggle("household")}
          className={`p-4 rounded-[var(--radius-lg)] border-2 text-left transition-colors ${
            lifeStage === "household"
              ? "border-[var(--teal)] bg-[var(--teal-light)]"
              : "border-[var(--border)] bg-white hover:border-[var(--teal-pale)]"
          }`}
        >
          <div className="text-2xl mb-1">👨‍👩‍👧</div>
          <div className="font-medium text-sm text-[var(--ink)]">
            My household
          </div>
        </button>
      </div>

      {/* Member picker (shown when "household" selected) */}
      {lifeStage === "household" && (
        <div className="mb-6">
          {/* Added members */}
          {householdMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {householdMembers.map((member, i) => (
                <span key={i} className="pill flex items-center gap-1.5">
                  {getMemberLabel(member)}
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="text-[var(--teal-dark)] hover:text-[var(--ink)] leading-none"
                    aria-label={`Remove ${getMemberLabel(member)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add member button / picker */}
          {pickerOpen ? (
            <div>
              <p className="text-xs font-medium text-[var(--ink-3)] mb-2 uppercase tracking-wide">
                Select a member to add
              </p>
              <div className="flex flex-wrap gap-2">
                {HOUSEHOLD_ROLES.map((role) => (
                  <button
                    key={role.role}
                    type="button"
                    onClick={() => addMember(role)}
                    className="onboarding-chip"
                  >
                    {role.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="mt-3 text-xs text-[var(--ink-3)] hover:text-[var(--ink)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-sm font-medium text-[var(--teal-dark)] hover:text-[var(--teal)] flex items-center gap-1"
            >
              <span className="text-lg leading-none">+</span> Add a household member
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="w-full bg-[var(--teal)] text-white font-medium text-sm px-5 py-3 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm font-medium text-[var(--ink-3)] py-2.5 rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
