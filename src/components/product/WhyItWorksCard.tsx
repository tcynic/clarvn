"use client";

import Link from "next/link";

interface WhyItWorksCardProps {
  matchedFlags: string[];
  totalFlags: number;
  hasProfile: boolean;
}

export function WhyItWorksCard({ matchedFlags, totalFlags, hasProfile }: WhyItWorksCardProps) {
  if (!hasProfile) {
    return (
      <section
        className="bg-white rounded-2xl shadow-sm p-6"
        data-testid="why-it-works"
      >
        <h2
          className="text-lg font-bold text-[var(--ink)] mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Why this works for you
        </h2>
        <p className="text-sm text-[var(--ink-3)] mb-3">
          Complete your profile to see personalised insights about this product.
        </p>
        <Link
          href="/onboarding"
          className="text-sm font-semibold text-[var(--teal-dark)] hover:text-[var(--teal)] transition-colors"
        >
          Complete your profile →
        </Link>
      </section>
    );
  }

  const matched = matchedFlags.length;

  return (
    <section
      className="bg-white rounded-2xl shadow-sm p-6"
      data-testid="why-it-works"
    >
      <h2
        className="text-lg font-bold text-[var(--ink)] mb-3"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Why this works for you
      </h2>

      {totalFlags === 0 ? (
        <p className="text-sm text-[var(--ink-4)]">
          Add conditions or sensitivities to your profile to see personalised insights.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-[var(--teal-dark)]">{matched}</span>
            <span className="text-sm text-[var(--ink-3)]">
              of {totalFlags} profile flags met
            </span>
          </div>

          {matched > 0 ? (
            <div className="space-y-1">
              {matchedFlags.map((flag) => (
                <div key={flag} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--tier-clean-light)] flex items-center justify-center shrink-0">
                    <span className="text-[var(--tier-clean)] text-[9px] font-bold">✓</span>
                  </span>
                  <span className="text-sm text-[var(--ink-2)] capitalize">{flag}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-4)]">
              No profile flags directly addressed by this product&apos;s ingredients.
            </p>
          )}
        </>
      )}
    </section>
  );
}
