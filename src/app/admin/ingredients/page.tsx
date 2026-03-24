"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { TierBadge } from "../../../components/TierBadge";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";
const TIERS: Tier[] = ["Clean", "Watch", "Caution", "Avoid"];

export default function AdminIngredientsPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const [selectedId, setSelectedId] = useState<Id<"ingredients"> | null>(null);

  const ingredients = useQuery(api.ingredients.listIngredients, {});
  const detail = useQuery(
    api.ingredients.getIngredientDetail,
    selectedId ? { ingredientId: selectedId } : "skip"
  );

  const filtered = (ingredients ?? []).filter((ing) => {
    const matchesSearch =
      !search ||
      ing.canonicalName.toLowerCase().includes(search.toLowerCase()) ||
      ing.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    const matchesTier = !tierFilter || ing.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  // Only show scored ingredients (scoreVersion > 0)
  const scoredIngredients = filtered.filter(
    (ing) => (ing.scoreVersion ?? 0) > 0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-eyebrow">Section 03</p>
          <div className="flex items-baseline gap-3 mt-1">
            <h1
              className="text-2xl text-[var(--ink)]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Ingredient Browser
            </h1>
            <span className="text-sm text-[var(--ink-3)]">
              {scoredIngredients.length} scored
            </span>
          </div>
        </div>
      </div>

      {/* Search + tier filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients…"
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

      <div className="flex gap-4">
        {/* Ingredient list */}
        <div className="flex-1 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden">
          {!ingredients ? (
            <p className="text-sm text-[var(--ink-3)] text-center py-12">Loading…</p>
          ) : scoredIngredients.length === 0 ? (
            <p className="text-sm text-[var(--ink-3)] text-center py-12">No ingredients found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Ingredient
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Harm
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Regulatory
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Avoidance
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Score
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Tier
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoredIngredients
                  .sort((a, b) => b.baseScore - a.baseScore)
                  .map((ing, i) => (
                    <tr
                      key={ing._id}
                      onClick={() =>
                        setSelectedId(selectedId === ing._id ? null : ing._id)
                      }
                      className={`border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${
                        selectedId === ing._id
                          ? "bg-[var(--teal-light)]"
                          : i % 2 === 1
                          ? "bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                          : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--ink)]">
                          {ing.canonicalName}
                        </div>
                        {ing.flagLabel && (
                          <div className="text-xs text-[var(--ink-4)]">{ing.flagLabel}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-2)]">
                        {ing.harmEvidenceScore.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-2)]">
                        {ing.regulatoryScore.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-2)]">
                        {ing.avoidanceScore.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                        {ing.baseScore.toFixed(1)}
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge tier={ing.tier as Tier} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selectedId && detail && (
          <div className="w-80 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] p-4 shrink-0 self-start">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold text-[var(--ink)] text-sm">
                  {detail.canonicalName}
                </h2>
                {detail.flagLabel && (
                  <p className="text-xs text-[var(--ink-4)]">{detail.flagLabel}</p>
                )}
              </div>
              <TierBadge tier={detail.tier as Tier} />
            </div>

            {/* Score breakdown */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-3xl font-bold"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: `var(--tier-${detail.tier.toLowerCase()})`,
                }}
              >
                {detail.baseScore.toFixed(1)}
              </span>
              <div className="text-xs text-[var(--ink-3)]">
                <div>Harm: {detail.harmEvidenceScore.toFixed(1)}</div>
                <div>Regulatory: {detail.regulatoryScore.toFixed(1)}</div>
                <div>Avoidance: {detail.avoidanceScore.toFixed(1)}</div>
              </div>
            </div>

            {/* Aliases */}
            {detail.aliases.length > 0 && (
              <div className="border-t border-[var(--border)] pt-3 mb-3">
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1">
                  Aliases
                </p>
                <p className="text-xs text-[var(--ink-2)]">
                  {detail.aliases.join(", ")}
                </p>
              </div>
            )}

            {/* Condition Modifiers */}
            {detail.modifiers.length > 0 && (
              <div className="border-t border-[var(--border)] pt-3 mb-3">
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">
                  Condition Modifiers
                </p>
                <ul className="flex flex-col gap-1.5">
                  {detail.modifiers.map((mod) => (
                    <li key={mod._id} className="text-xs">
                      <span className="font-medium text-[var(--tier-caution)]">
                        +{mod.modifierAmount} {mod.condition}
                      </span>
                      {mod.evidenceQuality && (
                        <span className="text-[var(--ink-4)] ml-1">({mod.evidenceQuality})</span>
                      )}
                      <p className="text-[var(--ink-3)] mt-0.5 line-clamp-2">
                        {mod.evidenceCitation}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Linked Products */}
            {detail.linkedProducts.length > 0 && (
              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">
                  Used in {detail.linkedProducts.length} product{detail.linkedProducts.length !== 1 ? "s" : ""}
                </p>
                <ul className="flex flex-col gap-1">
                  {detail.linkedProducts.map((p) => (
                    <li key={p._id} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--ink-2)] truncate">{p.name}</span>
                      {p.tier ? (
                        <TierBadge tier={p.tier as Tier} />
                      ) : (
                        <span className="text-[var(--ink-4)]">Pending</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Evidence Sources */}
            {detail.evidenceSources && (
              <div className="border-t border-[var(--border)] pt-3 mt-3">
                <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1">
                  Evidence
                </p>
                <div className="text-xs text-[var(--ink-3)]">
                  {Object.entries(detail.evidenceSources as Record<string, string>).map(
                    ([key, val]) => (
                      <p key={key} className="mb-0.5">
                        <span className="font-medium">{key}:</span> {val}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
