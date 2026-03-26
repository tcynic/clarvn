"use client";

interface RetailersCardProps {
  retailers?: string[];
}

export function RetailersCard({ retailers }: RetailersCardProps) {
  return (
    <div className="widget-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] mb-3">
        Where to buy
      </p>
      {retailers && retailers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {retailers.map((r) => (
            <span
              key={r}
              className="px-3 py-1 rounded-full bg-[var(--surface)] text-sm text-[var(--ink-2)] font-medium"
            >
              {r}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-4)]">Check your local store</p>
      )}
    </div>
  );
}
