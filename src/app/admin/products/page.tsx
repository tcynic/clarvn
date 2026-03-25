"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
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
  const [dedupStatus, setDedupStatus] = useState<string | null>(null);
  const [researchStatus, setResearchStatus] = useState<string | null>(null);
  const [unknownBrandOnly, setUnknownBrandOnly] = useState(false);
  const [brandInputs, setBrandInputs] = useState<string[]>([""]);
  const [setBrandStatus, setSetBrandStatus] = useState<string | null>(null);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [suggestingBrands, setSuggestingBrands] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    setBrandInputs([""]);
    setSetBrandStatus(null);
    setBrandSuggestions([]);
    setSuggestingBrands(false);
    setSelectedSuggestions(new Set());
  }, [selected?._id]);

  const products = useQuery(api.products.listProducts, { status: "scored" });
  const productCount = useQuery(api.products.countProducts, { status: "scored" });
  const ingredients = useQuery(
    api.ingredients.getIngredientsByProduct,
    selected ? { productId: selected._id } : "skip"
  );

  const refreshCheck = useAction(api.scoring.refreshCheck);
  const reassembleStuck = useAction(api.scoring.reassembleStuckProducts);
  const requeueUnscored = useAction(api.scoring.requeueUnscoredIngredients);
  const deduplicateProducts = useMutation(api.deduplication.deduplicateProducts);
  const addToQueue = useMutation(api.scoringQueue.addToQueue);
  const scoreProduct = useAction(api.scoring.scoreProduct);
  const setBrand = useMutation(api.products.setBrand);
  const suggestBrandsAction = useAction(api.brandSuggestions.suggestBrands);

  const filtered = (products ?? []).filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesTier = !tierFilter || p.tier === tierFilter;
    const matchesAssembly = !assemblyFilter || p.assemblyStatus === assemblyFilter;
    const matchesUnknown = !unknownBrandOnly || p.brand === "Unknown";
    if (tierFilter && !p.tier) return false;
    return matchesSearch && matchesTier && matchesAssembly && matchesUnknown;
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

  async function handleResearch() {
    const name = search.trim();
    if (!name) return;
    setResearchStatus("Scoring…");
    try {
      const queueId = await addToQueue({ productName: name, source: "admin_add", priority: 1 });
      await scoreProduct({ queueId });
      setResearchStatus("Done.");
      const match = (products ?? []).find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      if (match) setSelected(match);
    } catch {
      setResearchStatus("Research failed.");
    }
  }

  async function handleSetBrand(overrideBrands?: string[]) {
    if (!selected) return;
    const brands = overrideBrands ?? brandInputs.map((b) => b.trim()).filter(Boolean);
    if (brands.length === 0) return;
    setSetBrandStatus("Saving…");
    try {
      await setBrand({ productId: selected._id, brands });
      setSetBrandStatus(null);
      setBrandInputs([""]);
      setSelected(null);
    } catch {
      setSetBrandStatus("Failed to save brand.");
    }
  }

  async function handleSuggestBrands() {
    if (!selected) return;
    setSuggestingBrands(true);
    setBrandSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const suggestions = await suggestBrandsAction({ productId: selected._id });
      setBrandSuggestions(suggestions);
    } catch {
      // silently fall back to manual entry
    } finally {
      setSuggestingBrands(false);
    }
  }

  function toggleSuggestion(brand: string) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  }

  async function handleDedup() {
    setDedupStatus("Deduplicating…");
    try {
      const result = await deduplicateProducts({});
      setDedupStatus(
        result.resolved > 0
          ? `Resolved ${result.resolved} duplicate(s).`
          : "No duplicates found."
      );
    } catch {
      setDedupStatus("Deduplication failed.");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="section-eyebrow">Section 02</p>
        <div className="flex items-baseline gap-3 mt-1 mb-4">
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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRequeue}
            className="text-sm bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Requeue Unscored
          </button>
          <button
            onClick={handleReassemble}
            className="text-sm bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Reassemble Stuck
          </button>
          <button
            onClick={handleRefreshCheck}
            className="text-sm bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Run Refresh Check
          </button>
          <button
            onClick={handleDedup}
            className="text-sm bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Deduplicate
          </button>
          {(requeueStatus || reassembleStatus || refreshStatus || dedupStatus) && (
            <span className="text-xs text-[var(--ink-3)]">
              {dedupStatus ?? refreshStatus ?? reassembleStatus ?? requeueStatus}
            </span>
          )}
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
        {search.trim() && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleResearch}
              disabled={researchStatus === "Scoring…"}
              className="text-sm bg-[var(--teal)] text-white font-medium px-3 py-2 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Research &ldquo;{search.trim()}&rdquo;
            </button>
            {researchStatus && (
              <span className="text-xs text-[var(--ink-3)]">{researchStatus}</span>
            )}
          </div>
        )}
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

      {/* Assembly status filter + Unknown brand toggle */}
      <div className="flex gap-2 mb-4 flex-wrap">
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
        <button
          onClick={() => setUnknownBrandOnly((v) => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] transition-colors ${
            unknownBrandOnly
              ? "bg-[var(--ink)] text-white"
              : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
          }`}
        >
          Unknown Brand
        </button>
      </div>

      <div className="flex gap-4">
        {/* Product list */}
        <div className="flex-1 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
          {!products ? (
            <p className="text-sm text-[var(--ink-3)] text-center py-12">
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--ink-3)]">
                {search.trim() ? `No products found for "${search}".` : "No products found."}
              </p>
            </div>
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

            {selected.brand === "Unknown" && (
              <div className="border-t border-[var(--border)] pt-3 mb-3">
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">
                  Assign Brand
                </p>

                {/* Suggest brands */}
                <button
                  onClick={handleSuggestBrands}
                  disabled={suggestingBrands}
                  className="text-xs bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50 mb-2"
                >
                  {suggestingBrands ? "Suggesting…" : "Suggest brands"}
                </button>

                {/* Suggestion chips */}
                {brandSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {brandSuggestions.map((brand) => {
                      const isSelected = selectedSuggestions.has(brand);
                      return (
                        <button
                          key={brand}
                          onClick={() => toggleSuggestion(brand)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                            isSelected
                              ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                              : "bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border)] hover:border-[var(--teal)]"
                          }`}
                        >
                          {brand}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Apply selected suggestions */}
                {selectedSuggestions.size > 0 && (
                  <button
                    onClick={() => handleSetBrand([...selectedSuggestions])}
                    className="w-full text-xs bg-[var(--teal)] text-white font-medium px-3 py-1 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors mb-3"
                  >
                    Apply {selectedSuggestions.size} selected
                  </button>
                )}

                {/* Manual entry fallback */}
                <div className="flex flex-col gap-1.5">
                  {brandInputs.map((val, i) => (
                    <input
                      key={i}
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const next = [...brandInputs];
                        next[i] = e.target.value;
                        setBrandInputs(next);
                      }}
                      placeholder={`Brand ${i + 1}`}
                      className="border border-[var(--border)] rounded-[var(--radius)] px-2 py-1 text-xs text-[var(--ink)] outline-none focus:border-[var(--teal)] transition-colors"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {brandInputs.length < 5 && (
                    <button
                      onClick={() => setBrandInputs([...brandInputs, ""])}
                      className="text-xs text-[var(--teal)] hover:underline"
                    >
                      + Add brand
                    </button>
                  )}
                  <button
                    onClick={() => handleSetBrand()}
                    disabled={brandInputs.every((b) => !b.trim())}
                    className="ml-auto text-xs bg-[var(--teal)] text-white font-medium px-3 py-1 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
                {setBrandStatus && (
                  <p className="text-xs text-[var(--ink-3)] mt-1">{setBrandStatus}</p>
                )}
              </div>
            )}

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
