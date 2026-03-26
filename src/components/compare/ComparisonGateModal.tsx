"use client";

import Link from "next/link";
import { GATE_COPY } from "@/lib/gateConstants";

interface ProductPreview {
  id: string;
  name: string;
  brand?: string;
  emoji?: string;
  baseScore?: number;
  tier?: string;
}

interface ComparisonGateModalProps {
  product1: ProductPreview;
  product2?: ProductPreview;
  onClose: () => void;
  isGuest: boolean;
}

const TIER_BG: Record<string, string> = {
  Clean:   "bg-[var(--tier-clean-light)] text-[var(--tier-clean)]",
  Watch:   "bg-[var(--tier-watch-light)] text-[var(--tier-watch)]",
  Caution: "bg-[var(--tier-caution-light)] text-[var(--tier-caution)]",
  Avoid:   "bg-[var(--tier-avoid-light)] text-[var(--tier-avoid)]",
};

function ProductPreviewCard({ product }: { product: ProductPreview }) {
  const tierStyle = product.tier ? TIER_BG[product.tier] ?? "" : "";
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="w-16 h-16 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-3xl">
        {product.emoji ?? "🛒"}
      </div>
      <div className="text-center">
        <p className="text-xs text-[var(--ink-3)] font-medium">{product.brand}</p>
        <p className="text-sm font-semibold text-[var(--ink)] leading-tight">{product.name}</p>
        {product.baseScore !== undefined && (
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tierStyle}`}>
            {product.baseScore.toFixed(1)} · {product.tier}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Gate 2: Comparison gate modal.
 * Shows both product thumbnails + base scores above the lock.
 * Used when a free user taps Compare.
 */
export function ComparisonGateModal({
  product1,
  product2,
  onClose,
  isGuest,
}: ComparisonGateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        {/* Close */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-4)] hover:text-[var(--ink)] text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Products preview — visible above the lock */}
        <div className="flex items-start gap-4 mb-4">
          <ProductPreviewCard product={product1} />
          {product2 && (
            <>
              <div className="flex items-center self-center text-[var(--ink-4)] text-sm font-bold">vs</div>
              <ProductPreviewCard product={product2} />
            </>
          )}
        </div>

        {/* Lock line */}
        <div className="border-t border-dashed border-[var(--border)] my-4 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-lg">🔒</span>
        </div>

        {/* Below lock: gate copy */}
        <p className="text-sm font-semibold text-[var(--ink)] text-center mb-1">
          {product2
            ? GATE_COPY.comparison(product1.name, product2.name)
            : `Compare ${product1.name} side-by-side — scores, match %, flagged ingredients, and certifications.`}
        </p>
        <p className="text-xs text-[var(--ink-3)] text-center mb-5">
          See a full side-by-side breakdown for up to 4 products at once.
        </p>

        {isGuest ? (
          <Link
            href="/login"
            className="block w-full py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold text-center hover:bg-[var(--teal-dark)] transition-colors"
            onClick={onClose}
          >
            Create free account
          </Link>
        ) : (
          <Link
            href="/upgrade"
            className="block w-full py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold text-center hover:bg-[var(--teal-dark)] transition-colors"
            onClick={onClose}
          >
            Start free trial to compare
          </Link>
        )}
        <button
          type="button"
          onClick={onClose}
          className="block w-full py-2 mt-2 text-[var(--ink-4)] text-xs text-center hover:text-[var(--ink)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
