"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TierBadge } from "../../components/TierBadge";
import { ScorePill } from "./ScorePill";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";
const TIERS: Tier[] = ["Clean", "Watch", "Caution", "Avoid"];

interface BrowsePanelProps {
  onAdd: (name: string) => void;
  listNames: Set<string>;
  selectedName: string | null;
  onSelect: (name: string | null) => void;
}

export function BrowsePanel({ onAdd, listNames, selectedName, onSelect }: BrowsePanelProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    setRequestStatus(null);
  }, [search]);

  const products = useQuery(api.products.listProducts, { status: "scored" });
  const addToQueue = useMutation(api.scoringQueue.addToQueue);

  const filtered = (products ?? []).filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesTier = !tierFilter || p.tier === tierFilter;
    if (tierFilter && !p.tier) return false;
    return matchesSearch && matchesTier;
  });

  return (
    <div>
      {/* Search + tier filters */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 min-w-40 border border-[var(--border)] rounded-[var(--radius-lg)] px-3 py-2 text-sm text-[var(--ink)] bg-white outline-none focus:border-[var(--teal)] transition-colors"
        />
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setTierFilter(null)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] transition-colors ${
              !tierFilter
                ? "bg-[var(--teal)] text-white"
                : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
            }`}
          >
            All
          </button>
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t === tierFilter ? null : t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] transition-colors ${
                tierFilter === t
                  ? "bg-[var(--teal)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="flex flex-col gap-2 max-h-[calc(100vh-240px)] overflow-y-auto">
        {!products ? (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--ink-3)]">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--ink-3)] mb-3">No products found.</p>
            {search.trim() && (
              <>
                <button
                  onClick={async () => {
                    setRequestStatus("Requesting…");
                    try {
                      await addToQueue({ productName: search.trim(), source: "user_request", priority: 5 });
                      setRequestStatus("Requested!");
                    } catch {
                      setRequestStatus("Request failed.");
                    }
                  }}
                  disabled={requestStatus === "Requesting…" || requestStatus === "Requested!"}
                  className="text-sm bg-[var(--teal)] text-white font-medium px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
                >
                  Request &ldquo;{search.trim()}&rdquo;
                </button>
                {requestStatus && (
                  <p className="text-xs text-[var(--ink-3)] mt-2">{requestStatus}</p>
                )}
              </>
            )}
          </div>
        ) : (
          filtered.map((p) => {
            const tier = (p.tier ?? "Clean") as Tier;
            const inList = listNames.has(p.name);
            const isSelected = selectedName === p.name;
            return (
              <button
                key={p._id}
                onClick={() => onSelect(isSelected ? null : p.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border text-left transition-colors ${
                  isSelected
                    ? "border-[var(--teal)] bg-[var(--teal-light)]"
                    : "border-[var(--border)] bg-white hover:bg-[var(--surface)]"
                }`}
              >
                {p.baseScore != null && p.tier ? (
                  <ScorePill score={p.baseScore} tier={tier} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                    <span className="text-xs text-[var(--ink-3)]">…</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">
                      {p.emoji} {p.name}
                    </p>
                    {p.tier && <TierBadge tier={tier} />}
                  </div>
                  <p className="text-xs text-[var(--ink-3)]">{p.brand}</p>
                </div>
                {inList ? (
                  <span
                    className="b-teal shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Added ✓
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd(p.name);
                    }}
                    className="text-xs bg-[var(--teal)] text-white font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors shrink-0"
                  >
                    + Add
                  </button>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
