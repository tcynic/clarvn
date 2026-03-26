"use client";

import { useEffect, useState } from "react";

const SCORE_DELTA_KEY = "clarvn_seen_score_delta";

export type GateAction = "none" | "upgrade" | "signup" | "suppress";

interface PremiumGateResult {
  isGuest: boolean;
  isPremium: boolean;
  subscriptionStatus: string | null;
  hasSeenScoreDelta: boolean;
  /** Mark that the user has seen a product where personal score differs from base. */
  markScoreDelta: () => void;
  /**
   * Returns the appropriate action for a gate:
   * - "none":     user is premium — no gate needed
   * - "upgrade":  authenticated free user — show premium gate
   * - "signup":   guest user — show signup prompt
   * - "suppress": precondition not met (score delta gates 1/2/4) — hide gate entirely
   */
  gateAction: (opts?: { requiresDelta?: boolean }) => GateAction;
}

interface UsePremiumGateOptions {
  isAuthenticated: boolean;
  isPremium: boolean;
  subscriptionStatus?: string | null;
}

export function usePremiumGate({
  isAuthenticated,
  isPremium,
  subscriptionStatus = null,
}: UsePremiumGateOptions): PremiumGateResult {
  const [hasSeenScoreDelta, setHasSeenScoreDelta] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SCORE_DELTA_KEY)) {
      setHasSeenScoreDelta(true);
    }
  }, []);

  function markScoreDelta() {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SCORE_DELTA_KEY, "1");
    setHasSeenScoreDelta(true);
  }

  function gateAction(opts?: { requiresDelta?: boolean }): GateAction {
    if (isPremium) return "none";
    if (!isAuthenticated) return "signup";
    // Score delta precondition: suppress gates 1/2/4 until user has seen a delta
    if (opts?.requiresDelta && !hasSeenScoreDelta) return "suppress";
    return "upgrade";
  }

  return {
    isGuest: !isAuthenticated,
    isPremium,
    subscriptionStatus,
    hasSeenScoreDelta,
    markScoreDelta,
    gateAction,
  };
}
