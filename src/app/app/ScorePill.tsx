"use client";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

interface ScorePillProps {
  score: number;
  tier: Tier;
  /** Show struck-through base score when personal score differs */
  baseScore?: number;
  /** sm=32px, md=40px (default), lg=56px */
  size?: "sm" | "md" | "lg";
  /** Use gradient background instead of solid color */
  gradient?: boolean;
}

const solidColors: Record<Tier, string> = {
  Clean: "var(--tier-clean)",
  Watch: "var(--tier-watch)",
  Caution: "var(--tier-caution)",
  Avoid: "var(--tier-avoid)",
};

const gradientColors: Record<Tier, string> = {
  Clean: "linear-gradient(135deg, #34D399 0%, #059669 100%)",
  Watch: "linear-gradient(135deg, #FCD34D 0%, #D97706 100%)",
  Caution: "linear-gradient(135deg, #FDBA74 0%, #EA580C 100%)",
  Avoid: "linear-gradient(135deg, #FCA5A5 0%, #DC2626 100%)",
};

const sizeClasses: Record<NonNullable<ScorePillProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
};

export function ScorePill({
  score,
  tier,
  baseScore,
  size = "md",
  gradient = false,
}: ScorePillProps) {
  const showBase =
    baseScore !== undefined && Math.abs(baseScore - score) >= 0.05;

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      {showBase && (
        <span
          className="text-[10px] text-[var(--ink-4)] line-through leading-none"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {baseScore!.toFixed(1)}
        </span>
      )}
      <span
        className={`inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 ${sizeClasses[size]}`}
        style={{
          background: gradient ? gradientColors[tier] : solidColors[tier],
          fontFamily: "var(--font-serif)",
        }}
      >
        {score.toFixed(1)}
      </span>
    </span>
  );
}
