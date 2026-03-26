"use client";

import { useRouter } from "next/navigation";

const ACTIONS = [
  {
    emoji: "🔬",
    title: "Analyze ingredients",
    description: "Paste an ingredient list",
    href: "/analyze",
  },
  {
    emoji: "⚖️",
    title: "Compare products",
    description: "Side-by-side scores",
    href: "/compare",
  },
  {
    emoji: "🔄",
    title: "Find safer swaps",
    description: "Better alternatives",
    href: "/explore?mode=swaps",
  },
  {
    emoji: "🏠",
    title: "Pantry health score",
    description: "How's your pantry doing?",
    href: "/pantry",
  },
];

export function QuickActionsGrid() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ACTIONS.map((action) => (
        <button
          key={action.title}
          type="button"
          onClick={() => router.push(action.href)}
          className="widget-card text-left hover:border-[var(--teal-pale)] transition-colors"
        >
          <span className="text-2xl block mb-2">{action.emoji}</span>
          <p className="font-medium text-[var(--ink)] text-sm leading-snug">
            {action.title}
          </p>
          <p className="text-xs text-[var(--ink-3)] mt-0.5">{action.description}</p>
        </button>
      ))}
    </div>
  );
}
