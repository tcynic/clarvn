"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavBarProps {
  userName?: string;
  activeConditionCount?: number;
  isAdmin?: boolean;
  isPremium?: boolean;
  daysRemaining?: number | null;
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
  onProfileClick,
  onSignOut,
}: NavBarProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-[var(--border)] px-6 py-0 sticky top-0 z-40">
      {/* Trial banner */}
      {isPremium && daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 14 && (
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
          {!isPremium && (
            <Link
              href="/upgrade"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal)] text-white hover:bg-[var(--teal-dark)] transition-colors"
            >
              Start free trial
            </Link>
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
  );
}
