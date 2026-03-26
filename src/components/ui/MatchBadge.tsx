interface MatchBadgeProps {
  percentage: number; // 0–100
  className?: string;
}

export function MatchBadge({ percentage, className = "" }: MatchBadgeProps) {
  const tier =
    percentage >= 80 ? "high" : percentage >= 50 ? "medium" : "low";

  return (
    <span className={`match-badge ${tier} ${className}`}>
      {percentage}% match
    </span>
  );
}
