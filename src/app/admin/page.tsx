"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const PRIORITY_LABEL: Record<number, string> = {
  1: "User",
  2: "Seed",
  3: "Admin",
};

export default function AdminIngredientQueuePage() {
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "scoring" | "done" | "failed" | undefined
  >(undefined);

  const entries = useQuery(api.ingredientQueue.listIngredientQueue, {
    status: statusFilter,
  });

  const scoreIngredient = useAction(api.ingredientScoring.scoreIngredient);
  const scoreAllPending = useAction(api.ingredientScoring.scoreAllPendingIngredients);

  async function handleScoreNow(queueId: Id<"ingredient_queue">) {
    setScoringIds((prev) => new Set(prev).add(queueId));
    try {
      await scoreIngredient({ queueId });
    } finally {
      setScoringIds((prev) => {
        const next = new Set(prev);
        next.delete(queueId);
        return next;
      });
    }
  }

  async function handleScoreAllPending() {
    setBatchRunning(true);
    try {
      await scoreAllPending({});
    } finally {
      setBatchRunning(false);
    }
  }

  const items = entries ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-eyebrow">Section 01</p>
          <h1
            className="text-2xl text-[var(--ink)] mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Ingredient Queue
          </h1>
        </div>

        {/* Batch controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleScoreAllPending}
            disabled={batchRunning}
            className="bg-[var(--ink)] text-white text-sm font-medium px-3 py-1.5 rounded-[var(--radius)] hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {batchRunning ? "Processing…" : "Score All Pending"}
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([undefined, "pending", "scoring", "failed", "done"] as const).map((s) => (
          <button
            key={String(s)}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] transition-colors ${
              statusFilter === s
                ? "bg-[var(--teal)] text-white"
                : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
            }`}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      {/* Queue table */}
      <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ink-3)] text-center py-12">
            {entries === undefined ? "Loading…" : "Queue is empty."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Ingredient
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Blocked Products
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Priority
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((entry, i) => {
                const isScoring = scoringIds.has(entry._id);
                const blockedCount = entry.blockedProductIds.length;
                return (
                  <tr
                    key={entry._id}
                    className={`border-b border-[var(--border)] last:border-0 ${
                      i % 2 === 1 ? "bg-[var(--surface)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">
                      {entry.canonicalName}
                    </td>
                    <td className="px-4 py-3">
                      {blockedCount > 0 ? (
                        <span className="b-watch">
                          Blocks {blockedCount} product{blockedCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-[var(--ink-4)]">{entry.requestCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="b-gray">
                        {PRIORITY_LABEL[entry.priority] ?? `P${entry.priority}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === "scoring" || isScoring ? (
                        <span className="b-watch">Scoring…</span>
                      ) : entry.status === "failed" ? (
                        <div>
                          <span className="b-avoid">Failed</span>
                          {entry.errorMessage && (
                            <p className="text-xs text-[var(--ink-3)] mt-1 max-w-xs truncate">
                              {entry.errorMessage}
                            </p>
                          )}
                        </div>
                      ) : entry.status === "done" ? (
                        <span className="b-clean">Done</span>
                      ) : (
                        <span className="b-gray">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(entry.status === "pending" ||
                        entry.status === "failed") && (
                        <button
                          onClick={() => handleScoreNow(entry._id)}
                          disabled={isScoring || batchRunning}
                          className="text-xs bg-[var(--teal-light)] text-[var(--teal-dark)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--teal-pale)] transition-colors disabled:opacity-50"
                        >
                          {isScoring
                            ? "Scoring…"
                            : entry.status === "failed"
                            ? "Retry"
                            : "Score Now"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
