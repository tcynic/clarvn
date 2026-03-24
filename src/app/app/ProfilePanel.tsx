"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { saveProfile, type UserProfile } from "../../lib/personalScore";

export function ProfilePanel({
  profile,
  onChange,
  onClose,
  onSignOut,
}: {
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const CONDITIONS = ["ADHD","IBS / Gut sensitivity","Thyroid condition","Eczema / skin","Hormone-sensitive condition","Cancer history","Pregnancy"];
  const SENSITIVITIES = ["Migraines","Food allergies","Gluten sensitivity","Gut sensitivity","Artificial dyes","Preservatives"];

  const updateProfile = useMutation(api.userProfiles.createOrUpdateProfile);

  function toggle(type: "conditions" | "sensitivities", val: string) {
    const next = profile[type].includes(val)
      ? profile[type].filter((v) => v !== val)
      : [...profile[type], val];
    const updated = { ...profile, [type]: next };
    onChange(updated);
    saveProfile(updated);
    updateProfile({
      motivation: updated.motivation.join(", "),
      conditions: updated.conditions,
      sensitivities: updated.sensitivities,
    }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>Your Profile</h2>
          <button onClick={onClose} className="text-[var(--ink-3)] text-xl">×</button>
        </div>
        <div className="mb-4">
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Conditions</p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} onClick={() => toggle("conditions", c)}
                className={profile.conditions.includes(c) ? "pill" : "pill-neutral"}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Sensitivities</p>
          <div className="flex flex-wrap gap-2">
            {SENSITIVITIES.map((s) => (
              <button key={s} onClick={() => toggle("sensitivities", s)}
                className={profile.sensitivities.includes(s) ? "pill" : "pill-neutral"}>{s}</button>
            ))}
          </div>
        </div>
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
