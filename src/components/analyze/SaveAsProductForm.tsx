"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

interface SaveAsProductFormProps {
  baseScore: number;
  tier: string;
}

export function SaveAsProductForm({ baseScore, tier }: SaveAsProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProduct = useMutation(api.analyzeIngredientsHelpers.saveProductFromAnalysis);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const productId = await saveProduct({
        name: name.trim(),
        brand: brand.trim() || "Unknown Brand",
        baseScore,
        tier: tier as Tier,
      });
      router.push(`/product/${productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3
        className="text-base font-semibold text-[var(--ink)] mb-3"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Save as product
      </h3>
      <form onSubmit={handleSave} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name *"
          required
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--surface-3)] bg-[var(--surface)] text-sm text-[var(--ink)] placeholder-[var(--ink-4)] focus:outline-none focus:border-[var(--teal)] transition-colors"
        />
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Brand (optional)"
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--surface-3)] bg-[var(--surface)] text-sm text-[var(--ink)] placeholder-[var(--ink-4)] focus:outline-none focus:border-[var(--teal)] transition-colors"
        />
        {error && <p className="text-xs text-[var(--tier-avoid)]">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save & view product →"}
        </button>
      </form>
    </div>
  );
}
