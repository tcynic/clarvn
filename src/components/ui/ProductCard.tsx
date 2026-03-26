import { MatchBadge } from "./MatchBadge";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

interface ProductCardProps {
  name: string;
  brand: string;
  emoji?: string;
  imageUrl?: string;
  baseScore?: number;
  tier?: Tier;
  price?: number;
  averageRating?: number;
  matchPercentage?: number;
  inPantry?: boolean;
  onSelect?: () => void;
  onTogglePantry?: () => void;
}

const tierPillClass: Record<Tier, string> = {
  Clean: "score-pill-clean",
  Watch: "score-pill-watch",
  Caution: "score-pill-caution",
  Avoid: "score-pill-avoid",
};

export function ProductCard({
  name,
  brand,
  emoji,
  imageUrl,
  baseScore,
  tier,
  price,
  averageRating,
  matchPercentage,
  inPantry = false,
  onSelect,
  onTogglePantry,
}: ProductCardProps) {
  return (
    <div className="product-card cursor-pointer" onClick={onSelect}>
      {/* Image / emoji area */}
      <div className="product-card-image">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{emoji ?? "🛒"}</span>
        )}
      </div>

      {/* Body */}
      <div className="product-card-body">
        {/* Top row: match badge + save button */}
        <div className="flex items-start justify-between gap-2">
          {matchPercentage !== undefined && (
            <MatchBadge percentage={matchPercentage} />
          )}
          {onTogglePantry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePantry();
              }}
              className="text-[var(--ink-4)] hover:text-[var(--teal)] transition-colors ml-auto"
              aria-label={inPantry ? "Remove from pantry" : "Save to pantry"}
            >
              {inPantry ? "♥" : "♡"}
            </button>
          )}
        </div>

        {/* Brand + name */}
        <div>
          <p className="text-xs text-[var(--ink-4)] uppercase tracking-wide">{brand}</p>
          <p className="font-medium text-[var(--ink)] text-sm leading-snug">{name}</p>
        </div>

        {/* Score + price row */}
        <div className="flex items-center justify-between mt-auto pt-2">
          {baseScore !== undefined && tier && (
            <span
              className={`score-pill-${tier.toLowerCase()} inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold`}
            >
              {baseScore.toFixed(1)} · {tier}
            </span>
          )}
          {price !== undefined && (
            <span className="text-sm text-[var(--ink-3)]">${price.toFixed(2)}</span>
          )}
        </div>

        {/* Rating */}
        {averageRating !== undefined && (
          <p className="text-xs text-[var(--ink-4)]">★ {averageRating.toFixed(1)}</p>
        )}
      </div>
    </div>
  );
}
