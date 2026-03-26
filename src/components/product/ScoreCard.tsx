"use client";

import Link from "next/link";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const GRADIENTS: Record<Tier, string> = {
  Clean:   "from-[#059669] to-[#10b981]",
  Watch:   "from-[#D97706] to-[#f59e0b]",
  Caution: "from-[#EA580C] to-[#fb923c]",
  Avoid:   "from-[#DC2626] to-[#ef4444]",
};

interface ScoreCardProps {
  score: number;
  tier: Tier;
}

export function ScoreCard({ score, tier }: ScoreCardProps) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${GRADIENTS[tier]} p-6 text-white`}
      data-testid="score-card"
      data-tier={tier}
    >
      <p className="text-xs uppercase tracking-widest font-medium opacity-80 mb-1">
        Clarvn Score
      </p>
      <p
        className="text-5xl font-bold leading-none mb-1"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {score.toFixed(1)}
      </p>
      <p className="text-lg font-semibold opacity-90 mb-4">{tier}</p>
      <Link
        href="#ingredient-list"
        className="text-xs font-medium opacity-80 hover:opacity-100 underline underline-offset-2 transition-opacity"
      >
        See breakdown ›
      </Link>
    </div>
  );
}
