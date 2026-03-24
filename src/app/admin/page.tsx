"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { TierBadge } from "../../components/TierBadge";

const SOURCE_BADGE: Record<string, string> = {
  user_request: "b-teal",
  admin_add: "b-blue",
  alternative: "b-gray",
};

const SOURCE_LABEL: Record<string, string> = {
  user_request: "User",
  admin_add: "Admin",
  alternative: "Alt",
};

export default function AdminQueuePage() {
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [scoreNextN, setScoreNextN] = useState(10);
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "scoring" | "done" | "failed" | undefined
  >(undefined);

  const queueResult = useQuery(api.scoringQueue.listQueue, {
    status: statusFilter,
    paginationOpts: { numItems: 20, cursor: null },
  });

  const addToQueue = useMutation(api.scoringQueue.addToQueue);
  const scoreProduct = useAction(api.scoring.scoreProduct);
  const processAllPending = useAction(api.scoring.processAllPending);
  const [batchAllStatus, setBatchAllStatus] = useState<string | null>(null);

  async function handleAddToQueue(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddLoading(true);
    try {
      await addToQueue({
        productName: addName.trim(),
        source: "admin_add",
        priority: 3,
      });
      setAddName("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleScoreNow(queueId: Id<"scoring_queue">) {
    setScoringIds((prev) => new Set(prev).add(queueId));
    try {
      await scoreProduct({ queueId });
    } finally {
      setScoringIds((prev) => {
        const next = new Set(prev);
        next.delete(queueId);
        return next;
      });
    }
  }

  async function handleProcessAllPending() {
    setBatchAllStatus("Starting…");
    try {
      await processAllPending({});
      setBatchAllStatus("Batch queued — processing in background. Refresh queue to monitor progress.");
    } catch (err) {
      setBatchAllStatus("Failed to start batch.");
    }
  }

  async function handleScoreNextN() {
    if (!queueResult?.page) return;
    setBatchRunning(true);
    const pending = queueResult.page
      .filter((e) => e.status === "pending" || e.status === "failed")
      .slice(0, scoreNextN);

    for (const entry of pending) {
      await handleScoreNow(entry._id);
    }
    setBatchRunning(false);
  }

  const entries = queueResult?.page ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-eyebrow">Section 01</p>
          <h1
            className="text-2xl text-[var(--ink)] mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Scoring Queue
          </h1>
        </div>

        {/* Batch controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {batchAllStatus && (
            <span className="text-xs text-[var(--ink-3)] max-w-xs">{batchAllStatus}</span>
          )}
          <button
            onClick={handleProcessAllPending}
            className="bg-[var(--ink)] text-white text-sm font-medium px-3 py-1.5 rounded-[var(--radius)] hover:opacity-80 transition-opacity"
          >
            Process All Pending
          </button>
          {/* Score Next N */}
          <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            value={scoreNextN}
            onChange={(e) => setScoreNextN(Number(e.target.value))}
            className="w-16 border border-[var(--border)] rounded-[var(--radius)] px-2 py-1.5 text-sm text-center"
          />
          <button
            onClick={handleScoreNextN}
            disabled={batchRunning || entries.length === 0}
            className="bg-[var(--teal)] text-white text-sm font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
          >
            {batchRunning ? "Scoring…" : `Score Next ${scoreNextN}`}
          </button>
          </div>
        </div>
      </div>

      {/* Add to Queue */}
      <form
        onSubmit={handleAddToQueue}
        className="flex gap-2 mb-6"
      >
        <input
          type="text"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="Add product to queue…"
          className="flex-1 border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)] transition-colors"
        />
        <button
          type="submit"
          disabled={addLoading || !addName.trim()}
          className="bg-[var(--ink)] text-white text-sm font-medium px-4 py-2 rounded-[var(--radius)] hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {addLoading ? "Adding…" : "Add"}
        </button>
      </form>

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
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--ink-3)] text-center py-12">
            {queueResult === undefined ? "Loading…" : "Queue is empty."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Product
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Source
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Requests
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const isScoring = scoringIds.has(entry._id);
                return (
                  <tr
                    key={entry._id}
                    className={`border-b border-[var(--border)] last:border-0 ${
                      i % 2 === 1 ? "bg-[var(--surface)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">
                      {entry.productName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={SOURCE_BADGE[entry.source] ?? "b-gray"}>
                        {SOURCE_LABEL[entry.source] ?? entry.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-3)]">
                      {entry.requestCount}
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
                          onClick={() =>
                            handleScoreNow(entry._id)
                          }
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
