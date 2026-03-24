"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { TierBadge } from "../../../components/TierBadge";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";
const TIERS: Tier[] = ["Clean", "Watch", "Caution", "Avoid"];
type AssemblyStatus = "complete" | "partial" | "pending_ingredients";
const ASSEMBLY_STATUSES: { value: AssemblyStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "complete", label: "Complete" },
  { value: "partial", label: "Partial" },
  { value: "pending_ingredients", label: "Pending" },
];

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  open_food_facts: { label: "OFF", cls: "b-teal" },
  ai_extraction: { label: "AI", cls: "b-blue" },
  manual: { label: "Manual", cls: "b-gray" },
};

const ASSEMBLY_BADGE: Record<string, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "b-clean" },
  partial: { label: "Partial", cls: "b-watch" },
  pending_ingredients: { label: "Pending", cls: "b-gray" },
};

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const [assemblyFilter, setAssemblyFilter] = useState<AssemblyStatus | null>(null);
  const [selected, setSelected] = useState<Doc<"products"> | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [reassembleStatus, setReassembleStatus] = useState<string | null>(null);
  const [requeueStatus, setRequeueStatus] = useState<string | null>(null);

  const products = useQuery(api.products.listProducts, { status: "scored" });
  const productCount = useQuery(api.products.countProducts, { status: "scored" });
  const ingredients = useQuery(
    api.ingredients.getIngredientsByProduct,
    selected ? { productId: selected._id } : "skip"
  );

  const refreshCheck = useAction(api.scoring.refreshCheck);
  const reassembleStuck = useAction(api.scoring.reassembleStuckProducts);
  const requeueUnscored = useAction(api.scoring.requeueUnscoredIngredients);

  const filtered = (products ?? []).filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesTier = !tierFilter || p.tier === tierFilter;
    const matchesAssembly = !assemblyFilter || p.assemblyStatus === assemblyFilter;
    if (tierFilter && !p.tier) return false;
    return matchesSearch && matchesTier && matchesAssembly;
  });

  async function handleRequeue() {
    setRequeueStatus("Requeueing…");
    try {
      const result = await requeueUnscored({});
      setRequeueStatus(
        result.requeued > 0
          ? `Requeued ${result.requeued} ingredient(s) across ${result.productsAffected} product(s). Scoring started.`
          : "Nothing to requeue."
      );
    } catch {
      setRequeueStatus("Requeue failed.");
    }
  }

  async function handleReassemble() {
    setReassembleStatus("Reassembling…");
    try {
      const result = await reassembleStuck({});
      setReassembleStatus(`Done — ${result.reassembled} product(s) reassembled.`);
    } catch {
      setReassembleStatus("Reassembly failed.");
    }
  }

  async function handleRefreshCheck() {
    setRefreshStatus("Running refresh check…");
    try {
      const result = await refreshCheck({});
      if ("started" in result && result.started) {
        setRefreshStatus("Refresh check started (batching in background).");
      }
    } catch (err) {
      setRefreshStatus("Refresh check failed.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-eyebrow">Section 02</p>
          <div className="flex items-baseline gap-3 mt-1">
            <h1
              className="text-2xl text-[var(--ink)]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Product Browser
            </h1>
            <span className="text-sm text-[var(--ink-3)]">
              {productCount !== undefined ? productCount : "—"} scored
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {requeueStatus && (
            <span className="text-xs text-[var(--ink-3)]">{requeueStatus}</span>
          )}
          <button
            onClick={handleRequeue}
            className="text-sm bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Requeue Unscored
          </button>
          {reassembleStatus && (
            <span className="text-xs text-[var(--ink-3)]">{reassembleStatus}</span>
          )}
          <button
            onClick={handleReassemble}
            className="text-sm bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Reassemble Stuck
          </button>
          {refreshStatus && (
            <span className="text-xs text-[var(--ink-3)]">{refreshStatus}</span>
          )}
          <button
            onClick={handleRefreshCheck}
            className="text-sm bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Run Refresh Check
          </button>
        </div>
      </div>

      {/* Search + tier filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 min-w-48 border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)] transition-colors"
        />
        <div className="flex gap-1">
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

      {/* Assembly status filter */}
      <div className="flex gap-2 mb-4">
        {ASSEMBLY_STATUSES.map((s) => (
          <button
            key={String(s.value)}
            onClick={() => setAssemblyFilter(s.value)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] transition-colors ${
              assemblyFilter === s.value
                ? "bg-[var(--ink)] text-white"
                : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Product list */}
        <div className="flex-1 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
          {!products ? (
            <p className="text-sm text-[var(--ink-3)] text-center py-12">
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--ink-3)] text-center py-12">
              No products found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Product
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Score
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Tier
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Assembly
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const asm = p.assemblyStatus
                    ? ASSEMBLY_BADGE[p.assemblyStatus]
                    : null;
                  const src = p.ingredientSource
                    ? SOURCE_BADGE[p.ingredientSource]
                    : null;
                  return (
                    <tr
                      key={p._id}
                      onClick={() =>
                        setSelected(selected?._id === p._id ? null : p)
                      }
                      className={`border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${
                        selected?._id === p._id
                          ? "bg-[var(--teal-light)]"
                          : i % 2 === 1
                          ? "bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                          : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--ink)]">
                          {p.emoji} {p.name}
                        </div>
                        <div className="text-xs text-[var(--ink-3)]">{p.brand}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                        {p.baseScore != null ? p.baseScore.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {p.tier ? <TierBadge tier={p.tier as Tier} /> : <span className="text-xs text-[var(--ink-3)]">Pending</span>}
                      </td>
                      <td className="px-4 py-3">
                        {asm ? (
                          <span className={asm.cls}>{asm.label}</span>
                        ) : (
                          <span className="text-xs text-[var(--ink-4)]">—</span>
                        )}
                        {p.pendingIngredientCount != null && p.pendingIngredientCount > 0 && (
                          <span className="text-xs text-[var(--ink-4)] ml-1">
                            ({p.pendingIngredientCount} pending)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {src ? (
                          <span className={src.cls}>{src.label}</span>
                        ) : (
                          <span className="text-xs text-[var(--ink-4)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4 shrink-0 self-start">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold text-[var(--ink)] text-sm">
                  {selected.emoji} {selected.name}
                </h2>
                <p className="text-xs text-[var(--ink-3)]">{selected.brand}</p>
              </div>
              {selected.tier ? <TierBadge tier={selected.tier as Tier} /> : <span className="text-xs text-[var(--ink-3)]">Pending</span>}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-3xl font-bold"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: selected.tier ? `var(--tier-${selected.tier.toLowerCase()})` : "var(--ink-3)",
                }}
              >
                {selected.baseScore != null ? selected.baseScore.toFixed(1) : "—"}
              </span>
              <div className="text-xs text-[var(--ink-3)]">
                <div>v{selected.scoreVersion}</div>
                <div>
                  {new Date(selected.scoredAt).toLocaleDateString()}
                </div>
                {selected.assemblyStatus && (
                  <div className="mt-1">
                    <span className={ASSEMBLY_BADGE[selected.assemblyStatus]?.cls ?? "b-gray"}>
                      {ASSEMBLY_BADGE[selected.assemblyStatus]?.label ?? selected.assemblyStatus}
                    </span>
                  </div>
                )}
                {selected.ingredientSource && (
                  <div className="mt-1">
                    <span className={SOURCE_BADGE[selected.ingredientSource]?.cls ?? "b-gray"}>
                      {SOURCE_BADGE[selected.ingredientSource]?.label ?? selected.ingredientSource}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">
                Ingredients
              </p>
              {!ingredients ? (
                <p className="text-xs text-[var(--ink-3)]">Loading…</p>
              ) : ingredients.length === 0 ? (
                <p className="text-xs text-[var(--ink-3)]">None on record.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {(ingredients as Doc<"ingredients">[])
                    .sort((a, b) => b.baseScore - a.baseScore)
                    .map((ing) => {
                      const isScored = (ing.scoreVersion ?? 0) > 0;
                      return (
                        <li
                          key={ing._id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className={isScored ? "text-[var(--ink-2)]" : "text-[var(--ink-4)] italic"}>
                            {ing.canonicalName}
                          </span>
                          {isScored ? (
                            <TierBadge tier={ing.tier as Tier} />
                          ) : (
                            <span className="text-xs text-[var(--ink-4)]">Pending</span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
