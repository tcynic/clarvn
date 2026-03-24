"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile, type UserProfile } from "../../lib/personalScore";

const MOTIVATIONS = [
  "Manage my health conditions",
  "Eat cleaner for my family",
  "Avoid specific ingredients",
  "General curiosity",
  "Pregnancy / trying to conceive",
];

const CONDITIONS = [
  "ADHD",
  "IBS / Gut sensitivity",
  "Thyroid condition",
  "Eczema / skin",
  "Hormone-sensitive condition",
  "Cancer history",
  "Pregnancy",
  "None",
];

const SENSITIVITIES = [
  "Migraines",
  "Food allergies",
  "Gluten sensitivity",
  "Gut sensitivity",
  "Artificial dyes",
  "Preservatives",
  "None",
];

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  function toggle(opt: string) {
    if (opt === "None") {
      onChange(["None"]);
      return;
    }
    const without = selected.filter((s) => s !== "None");
    if (without.includes(opt)) {
      onChange(without.filter((s) => s !== opt));
    } else {
      onChange([...without, opt]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={active ? "pill" : "pill-neutral"}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [motivation, setMotivation] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [sensitivities, setSensitivities] = useState<string[]>([]);

  const steps = [
    {
      eyebrow: "Step 1 of 3",
      title: "What brings you to CleanList?",
      subtitle: "Select everything that applies.",
      content: (
        <MultiSelect
          options={MOTIVATIONS}
          selected={motivation}
          onChange={setMotivation}
        />
      ),
    },
    {
      eyebrow: "Step 2 of 3",
      title: "Any diagnosed conditions?",
      subtitle:
        "We'll surface ingredient flags specific to these conditions.",
      content: (
        <MultiSelect
          options={CONDITIONS}
          selected={conditions}
          onChange={setConditions}
        />
      ),
    },
    {
      eyebrow: "Step 3 of 3",
      title: "Any sensitivities?",
      subtitle: "Self-reported is fine — we apply appropriate weighting.",
      content: (
        <MultiSelect
          options={SENSITIVITIES}
          selected={sensitivities}
          onChange={setSensitivities}
        />
      ),
    },
  ];

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const profile: UserProfile = {
        motivation,
        conditions: conditions.filter((c) => c !== "None"),
        sensitivities: sensitivities.filter((s) => s !== "None"),
      };
      saveProfile(profile);
      router.push("/app");
    }
  }

  const current = steps[step];
  const canProceed = step === 0 ? motivation.length > 0 : true;

  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-8 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step
                  ? "w-8 bg-[var(--teal)]"
                  : "w-4 bg-[var(--surface-3)]"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-8">
          <p className="section-eyebrow mb-2">{current.eyebrow}</p>
          <h1
            className="text-2xl text-[var(--ink)] mb-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {current.title}
          </h1>
          <p className="text-sm text-[var(--ink-3)] mb-6">{current.subtitle}</p>

          {current.content}

          <div className="flex justify-between items-center mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-[var(--teal)] text-white font-medium text-sm px-6 py-2.5 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
            >
              {step < steps.length - 1 ? "Continue →" : "Start Scoring"}
            </button>
          </div>
        </div>

        {/* MVP disclosure */}
        <p className="text-xs text-[var(--ink-4)] text-center mt-4 max-w-sm mx-auto">
          Scores are AI-generated using peer-reviewed evidence and regulatory
          data. Independent expert review coming soon.
        </p>
      </div>
    </div>
  );
}
