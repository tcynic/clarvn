"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function MobileNavIcon({ label }: { label: string }) {
  if (label === "Home") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M7.5 18v-5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (label === "Explore") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M13.5 6.5l-2.25 4.5-4.5 2.25 2.25-4.5 4.5-2.25Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // Pantry — grid
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface NavBarProps {
  userName?: string;
  activeConditionCount?: number;
  isAdmin?: boolean;
  isPremium?: boolean;
  daysRemaining?: number | null;
  subscriptionStatus?: string | null;
  onStartTrial?: () => void;
  onProfileClick?: () => void;
  onSignOut?: () => void;
}

const navLinks = [
  { href: "/home", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/pantry", label: "Pantry" },
];

export function NavBar({
  userName,
  activeConditionCount = 0,
  isAdmin = false,
  isPremium = false,
  daysRemaining,
  subscriptionStatus,
  onStartTrial,
  onProfileClick,
  onSignOut,
}: NavBarProps) {
  const pathname = usePathname();

  return (
    <>
    <header className="bg-white border-b border-[var(--border)] px-6 py-0 sticky top-0 z-40">
      {/* Past-due payment banner — shows when subscription is past_due, never hard-locks features */}
      {subscriptionStatus === "past_due" && (
        <div className="text-center text-xs py-1.5 font-medium bg-amber-50 text-amber-700">
          Your payment method needs updating ·{" "}
          <Link href="/upgrade" className="underline">
            Update payment method
          </Link>
        </div>
      )}

      {/* Trial countdown banner — shown when trialing and ≤14 days remain */}
      {subscriptionStatus !== "past_due" && isPremium && daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 14 && (
        <div
          className={`text-center text-xs py-1.5 font-medium ${
            daysRemaining <= 2
              ? "bg-amber-50 text-amber-700"
              : "bg-[var(--teal-light)] text-[var(--teal-dark)]"
          }`}
        >
          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left in your free trial ·{" "}
          <Link href="/upgrade" className="underline">
            Add payment method
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-1 shrink-0">
          <span
            className="text-xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            clar
          </span>
          <span
            className="text-xl text-[var(--teal)] italic"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            vn
          </span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--teal-light)] text-[var(--teal-dark)]"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!isPremium && subscriptionStatus !== "canceled" && (
            onStartTrial ? (
              <button
                type="button"
                onClick={onStartTrial}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] transition-colors"
              >
                Start free trial
              </button>
            ) : (
              <Link
                href="/upgrade"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] transition-colors"
              >
                Start free trial
              </Link>
            )
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs text-[var(--ink-4)] hover:text-[var(--ink)] transition-colors"
            >
              Admin
            </Link>
          )}

          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors text-sm"
            >
              <span className="w-6 h-6 rounded-full bg-[var(--teal-light)] text-[var(--teal-dark)] flex items-center justify-center text-xs font-bold">
                {userName?.[0]?.toUpperCase() ?? "U"}
              </span>
              {activeConditionCount > 0 && (
                <span className="text-xs text-[var(--teal-dark)] font-medium">
                  {activeConditionCount} flags
                </span>
              )}
            </button>
          )}

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-xs text-[var(--ink-4)] hover:text-[var(--ink)] transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>

    {/* Mobile bottom tab bar — visible below md breakpoint, hidden on desktop */}
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--border)] flex md:hidden z-40">
      {navLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              active ? "text-[var(--teal)]" : "text-[var(--ink-4)]"
            }`}
          >
            <MobileNavIcon label={link.label} />
            {link.label}
          </Link>
        );
      })}
    </nav>
    </>
  );
}
