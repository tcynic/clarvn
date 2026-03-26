"use client";

import {
  FREE_FROM_OPTIONS,
  CERTIFICATION_OPTIONS,
} from "@/lib/exploreConstants";

interface ClaimsGridProps {
  claims: Array<{ claim: string; verified: boolean; source?: string }>;
}

const ALL_CLAIMS = [
  ...FREE_FROM_OPTIONS.map((o) => ({ label: o.label, key: o.claim, group: "Free-from" })),
  ...CERTIFICATION_OPTIONS.map((o) => ({ label: o.label, key: o.claim, group: "Certifications" })),
];

export function ClaimsGrid({ claims }: ClaimsGridProps) {
  const presentClaims = new Set(claims.map((c) => c.claim));

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6" data-testid="claims-grid">
      <h2
        className="text-lg font-bold text-[var(--ink)] mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        What&apos;s inside
      </h2>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {ALL_CLAIMS.map(({ label, key }) => {
          const present = presentClaims.has(key);
          return (
            <div key={key} className="flex items-center gap-2 py-1">
              {present ? (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--tier-clean-light)] flex items-center justify-center">
                  <span className="text-[var(--tier-clean)] text-xs font-bold">✓</span>
                </span>
              ) : (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                  <span className="text-[var(--ink-4)] text-xs">✗</span>
                </span>
              )}
              <span
                className={`text-sm ${
                  present ? "text-[var(--ink-2)] font-medium" : "text-[var(--ink-4)]"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
