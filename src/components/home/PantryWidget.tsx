"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Widget } from "@/components/ui/Widget";

interface PantryWidgetProps {
  isAuthenticated: boolean;
}

export function PantryWidget({ isAuthenticated }: PantryWidgetProps) {
  const stats = useQuery(
    api.pantry.getPantryStats,
    isAuthenticated ? {} : "skip"
  );

  const action = (
    <Link
      href="/pantry"
      className="text-xs font-medium text-[var(--teal-dark)] hover:text-[var(--teal)] transition-colors"
    >
      View all →
    </Link>
  );

  return (
    <Widget title="Your pantry" action={action}>
      {!isAuthenticated ? (
        <p className="text-xs text-[var(--ink-3)]">
          Sign in to track your pantry.
        </p>
      ) : stats === undefined ? (
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-[var(--surface-2)] rounded w-1/2" />
          <div className="h-3 bg-[var(--surface-2)] rounded w-1/3" />
        </div>
      ) : stats === null || stats.totalItems === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">No items yet — add products to your pantry.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-[var(--ink)]">
            {stats.totalItems}
            <span className="text-sm font-normal text-[var(--ink-3)] ml-1">items</span>
          </p>
          <div className="flex gap-3 text-xs text-[var(--ink-3)]">
            {stats.tierBreakdown.Clean > 0 && (
              <span className="text-green-700">✓ {stats.tierBreakdown.Clean} Clean</span>
            )}
            {stats.tierBreakdown.Watch > 0 && (
              <span className="text-yellow-700">⚠ {stats.tierBreakdown.Watch} Watch</span>
            )}
            {stats.tierBreakdown.Caution > 0 && (
              <span className="text-orange-700">! {stats.tierBreakdown.Caution} Caution</span>
            )}
            {stats.tierBreakdown.Avoid > 0 && (
              <span className="text-red-700">✕ {stats.tierBreakdown.Avoid} Avoid</span>
            )}
          </div>
          {stats.averageScore !== null && (
            <p className="text-xs text-[var(--ink-3)]">
              Avg score: {stats.averageScore.toFixed(1)}
            </p>
          )}
        </div>
      )}
    </Widget>
  );
}
