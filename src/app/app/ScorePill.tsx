"use client";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

export function ScorePill({ score, tier }: { score: number; tier: Tier }) {
  const colors: Record<Tier, string> = {
    Clean: "var(--tier-clean)",
    Watch: "var(--tier-watch)",
    Caution: "var(--tier-caution)",
    Avoid: "var(--tier-avoid)",
  };
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-sm shrink-0"
      style={{ background: colors[tier], fontFamily: "var(--font-serif)" }}
    >
      {score.toFixed(1)}
    </span>
  );
}
