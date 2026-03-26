"use client";

import Link from "next/link";

/**
 * Non-dismissable banner shown to unauthenticated (guest) users on every page.
 * Primary ambient conversion surface — links to sign-up.
 */
export function GuestBanner() {
  return (
    <div className="guest-banner">
      <span>You&apos;re exploring as a guest —</span>
      <Link
        href="/login?from=guest"
        className="font-semibold underline underline-offset-2 hover:text-[var(--teal-dark)]"
      >
        create a free account to save your profile
      </Link>
    </div>
  );
}
