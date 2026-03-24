type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const tierClass: Record<Tier, string> = {
  Clean: "b-clean",
  Watch: "b-watch",
  Caution: "b-caution",
  Avoid: "b-avoid",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={tierClass[tier]}>{tier}</span>;
}
