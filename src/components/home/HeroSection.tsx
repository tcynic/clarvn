interface HeroSectionProps {
  userName?: string;
  isGuest: boolean;
}

export function HeroSection({ userName, isGuest }: HeroSectionProps) {
  const greeting = isGuest
    ? "Welcome"
    : userName
    ? `Welcome back, ${userName}`
    : "Welcome back";

  return (
    <div>
      <p className="text-sm text-[var(--ink-3)] mb-1">{greeting}</p>
      <h1 className="text-2xl font-semibold text-[var(--ink)] leading-snug">
        Find food that{" "}
        <em className="font-serif not-italic text-[var(--teal-dark)]">works</em>{" "}
        for you
      </h1>
      <p className="text-sm text-[var(--ink-3)] mt-2">
        Scan, search, and discover products that match your health profile.
      </p>
    </div>
  );
}
