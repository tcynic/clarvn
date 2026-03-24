"use client";

import { type UserProfile } from "../../lib/personalScore";

export function ProfilePanel({
  profile,
  onClose,
  onSignOut,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const hasConditions = profile.conditions.length > 0;
  const hasSensitivities = profile.sensitivities.length > 0;
  const hasMotivation = profile.motivation.length > 0;
  const isEmpty = !hasConditions && !hasSensitivities && !hasMotivation;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>Your Profile</h2>
          <button onClick={onClose} className="text-[var(--ink-3)] text-xl">×</button>
        </div>

        {isEmpty ? (
          <p className="text-sm text-[var(--ink-3)]">No profile information yet.</p>
        ) : (
          <div className="space-y-4">
            {hasMotivation && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Why you&apos;re here</p>
                <div className="flex flex-wrap gap-2">
                  {profile.motivation.map((m) => (
                    <span key={m} className="pill">{m}</span>
                  ))}
                </div>
              </div>
            )}
            {hasConditions && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {profile.conditions.map((c) => (
                    <span key={c} className="pill">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {hasSensitivities && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Sensitivities</p>
                <div className="flex flex-wrap gap-2">
                  {profile.sensitivities.map((s) => (
                    <span key={s} className="pill">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-[var(--border)] mt-4 pt-4">
          <button
            onClick={onSignOut}
            className="text-xs text-[var(--ink-3)] hover:text-[var(--tier-avoid)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
