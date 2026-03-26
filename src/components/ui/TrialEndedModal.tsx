"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "clarvn_trial_ended_shown";

interface TrialEndedModalProps {
  subscriptionStatus: string | null | undefined;
}

/**
 * One-time modal shown when a user's free trial has ended.
 * Uses localStorage to ensure it only displays once.
 */
export function TrialEndedModal({ subscriptionStatus }: TrialEndedModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (subscriptionStatus !== "canceled") return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, [subscriptionStatus]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
        <p className="text-3xl mb-3">⏱️</p>
        <h2
          className="text-xl font-bold text-[var(--ink)] mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Your free trial has ended
        </h2>
        <p className="text-sm text-[var(--ink-3)] mb-1">
          Your profile, pantry, and check-in data are safe.
        </p>
        <p className="text-sm text-[var(--ink-3)] mb-6">
          Upgrade to keep unlimited explore, full ingredient detail, product
          comparison, and your pantry health score.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/upgrade"
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
          >
            See upgrade options
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl bg-[var(--surface)] text-[var(--ink-3)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
          >
            Continue with free
          </button>
        </div>
      </div>
    </div>
  );
}
