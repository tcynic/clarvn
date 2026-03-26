"use client";

import Link from "next/link";
import { GATE_COPY } from "@/lib/gateConstants";

interface SignupPromptCardProps {
  /** Optional custom message — defaults to the standard guest signup prompt */
  message?: string;
}

/**
 * Shown at gate locations for unauthenticated (guest) users.
 * Uses the same visual treatment as LockedProductCard but routes to signup.
 */
export function SignupPromptCard({ message }: SignupPromptCardProps) {
  return (
    <div className="product-card relative overflow-hidden select-none">
      {/* Blurred placeholder */}
      <div className="product-card-image opacity-20">
        <span>✨</span>
      </div>
      <div className="product-card-body opacity-20">
        <div className="h-3 bg-[var(--ink-4)] rounded w-3/4 mb-2" />
        <div className="h-3 bg-[var(--ink-4)] rounded w-1/2" />
      </div>

      {/* Signup overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm rounded-[var(--radius-lg)] p-4 text-center">
        <p className="text-xs font-semibold text-[var(--ink)] leading-snug mb-3">
          {message ?? GATE_COPY.guestSignup}
        </p>
        <Link
          href="/login"
          className="text-xs font-medium text-white bg-[var(--teal)] px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Create free account
        </Link>
      </div>
    </div>
  );
}
