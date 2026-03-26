"use client";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const TIER_BG: Record<string, string> = {
  Clean:   "bg-[var(--tier-clean-light)] text-[var(--tier-clean)]",
  Watch:   "bg-[var(--tier-watch-light)] text-[var(--tier-watch)]",
  Caution: "bg-[var(--tier-caution-light)] text-[var(--tier-caution)]",
  Avoid:   "bg-[var(--tier-avoid-light)] text-[var(--tier-avoid)]",
};

const TIER_DOT: Record<string, string> = {
  Clean:   "bg-[var(--tier-clean)]",
  Watch:   "bg-[var(--tier-watch)]",
  Caution: "bg-[var(--tier-caution)]",
  Avoid:   "bg-[var(--tier-avoid)]",
};

interface AnalysisResult {
  assembledScore: number;
  tier: string;
  ingredients: Array<{
    name: string;
    baseScore: number;
    tier: string;
    recognized: boolean;
    canonicalName?: string;
  }>;
  recognizedCount: number;
  estimatedCount: number;
  totalCount: number;
}

interface AnalyzeResultsProps {
  result: AnalysisResult;
}

export function AnalyzeResults({ result }: AnalyzeResultsProps) {
  const tierStyle = TIER_BG[result.tier] ?? "";

  const sorted = [...result.ingredients].sort((a, b) => b.baseScore - a.baseScore);

  return (
    <div className="space-y-4">
      {/* Score summary */}
      <div
        className={`rounded-2xl p-5 flex items-center justify-between ${tierStyle}`}
        data-testid="analyze-score-banner"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Assembled score
          </p>
          <p className="text-4xl font-bold mt-1">
            {result.assembledScore.toFixed(1)}
            <span className="text-lg font-semibold ml-2 opacity-80">· {result.tier}</span>
          </p>
          <p className="text-xs mt-1 opacity-70">
            {result.recognizedCount} recognized · {result.estimatedCount} AI-estimated
          </p>
        </div>
        <span className="text-5xl" aria-hidden="true">
          {result.tier === "Clean"
            ? "✅"
            : result.tier === "Watch"
            ? "⚠️"
            : result.tier === "Caution"
            ? "🟠"
            : "🔴"}
        </span>
      </div>

      {/* Ingredient breakdown */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3
          className="text-base font-semibold text-[var(--ink)] mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Ingredient breakdown
          <span className="ml-2 text-sm font-normal text-[var(--ink-4)]">
            ({result.totalCount})
          </span>
        </h3>

        <div className="space-y-1">
          {sorted.map((ing, i) => {
            const dotClass = TIER_DOT[ing.tier] ?? "bg-[var(--ink-4)]";
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-[var(--surface-2)] last:border-0"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
                <span className="flex-1 text-sm text-[var(--ink-2)]">
                  {ing.canonicalName ?? ing.name}
                </span>
                {!ing.recognized && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--ink-4)]">
                    estimated
                  </span>
                )}
                <span className="text-xs font-semibold text-[var(--ink-3)] w-8 text-right shrink-0">
                  {ing.baseScore.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
