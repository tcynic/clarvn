interface ContentCardProps {
  title: string;
  category: string;
  emoji?: string;
  slug: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  "label-literacy": "Label Literacy",
  "additives": "Additives",
  "certifications": "Certifications",
};

export function ContentCard({ title, category, emoji, slug }: ContentCardProps) {
  return (
    <div className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border)] bg-white hover:shadow-sm transition-shadow cursor-default">
      {/* Gradient header */}
      <div className="h-20 bg-gradient-to-br from-[var(--teal-light)] to-[var(--teal-pale)] flex items-center justify-center">
        <span className="text-3xl">{emoji ?? "📄"}</span>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="section-eyebrow mb-1">
          {CATEGORY_LABELS[category] ?? category}
        </p>
        <p className="text-sm font-medium text-[var(--ink)] leading-snug">{title}</p>
      </div>
    </div>
  );
}
