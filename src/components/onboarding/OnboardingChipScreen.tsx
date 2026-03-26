"use client";

interface OnboardingChipScreenProps {
  stepNumber: number; // 1–6
  title: string;
  subtitle?: string;
  chips: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  /** If provided, this chip acts as an exclusive "None" option. */
  exclusiveChip?: string;
  allowSkip?: boolean;
  onSkip?: () => void;
  onNext: () => void;
  onBack?: () => void;
}

export function OnboardingChipScreen({
  stepNumber,
  title,
  subtitle,
  chips,
  selectedValues,
  onToggle,
  exclusiveChip,
  allowSkip,
  onSkip,
  onNext,
  onBack,
}: OnboardingChipScreenProps) {
  const progress = (stepNumber / 6) * 100;
  const allChips = exclusiveChip ? [...chips, exclusiveChip] : chips;
  const canContinue = selectedValues.length > 0 || allowSkip;

  function handleToggle(chip: string) {
    onToggle(chip);
  }

  return (
    <div className="onboarding-container">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-[var(--ink-3)] font-medium">
            Step {stepNumber} of 6
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Heading */}
      <h1 className="onboarding-title">{title}</h1>
      {subtitle && (
        <p className="text-sm text-[var(--ink-3)] mt-1 mb-5">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-5" />}

      {/* Chip grid */}
      <div className="flex flex-wrap gap-2 mb-8">
        {allChips.map((chip) => {
          const isExclusive = chip === exclusiveChip;
          const isSelected = selectedValues.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => handleToggle(chip)}
              className={`onboarding-chip ${isSelected ? "active" : ""} ${isExclusive ? "exclusive" : ""}`}
            >
              {chip}
            </button>
          );
        })}
      </div>

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
        <div className="flex gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 text-sm font-medium text-[var(--ink-3)] py-2.5 rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Back
            </button>
          )}
          {allowSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 text-sm font-medium text-[var(--ink-3)] py-2.5 rounded-[var(--radius)] hover:text-[var(--ink)] transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
