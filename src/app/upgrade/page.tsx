"use client";

import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { NavBar } from "@/components/ui/NavBar";

const FREE_FEATURES = [
  'Up to 3 "For You" matches on home',
  "6 explore results (score-ranked)",
  "Product score + tier badge",
  "Match % on viewed products",
  "Ingredient flag count + basic list",
  "Paste-ingredients: 3 analyses/day",
  "Pantry: save up to 10 products",
  "Wellness check-ins (unlimited)",
  "Generic alternatives (score-ranked)",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Unlimited explore, sorted by match %",
  "Full ingredient detail + profile notes",
  "Product comparison (2–4 side-by-side)",
  "Advanced filters: free-from, price range, match %",
  "Unlimited pantry + pantry health score",
  "Personalized alternatives (match % ranked)",
  "Paste-ingredients: unlimited analyses",
  "Priority scoring queue",
];

const FAMILY_FEATURES = [
  "Everything in Premium",
  "Up to 6 household profiles",
  "Per-profile match % + conditions",
  "Kids-specific scoring (dyes, nitrates, sugars)",
  "Teen (13–17) and Baby scoring ranges",
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0 mt-0.5">
      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function UpgradePage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const subscriptionStatus = useQuery(
    api.userProfiles.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );
  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
    isAuthenticated ? {} : "skip"
  );
  const startTrial = useMutation(api.users.startTrial);

  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysRemaining = subscriptionStatus?.daysRemaining ?? null;
  const subStatus = subscriptionStatus?.subscriptionStatus ?? null;
  const trialUsed = subStatus === "canceled";

  async function handleStartTrial() {
    try {
      await startTrial({});
      router.push("/home");
    } catch {
      // Trial already started or user is already premium — redirect home
      router.push("/home");
    }
  }

  function PremiumCTA() {
    if (isPremium && subStatus === "trialing") {
      return (
        <div className="text-center">
          <p className="text-sm text-[var(--teal-dark)] font-medium mb-2">
            {daysRemaining !== null ? `${daysRemaining} days left in your trial` : "Trial active"}
          </p>
          <Link
            href="/home"
            className="block w-full py-3 rounded-xl bg-[var(--surface-2)] text-[var(--ink-3)] text-sm font-semibold"
          >
            Currently trialing
          </Link>
        </div>
      );
    }
    if (isPremium) {
      return (
        <Link
          href="/home"
          className="block w-full py-3 rounded-xl bg-[var(--surface-2)] text-[var(--ink-3)] text-sm font-semibold text-center"
        >
          Current plan
        </Link>
      );
    }
    if (trialUsed) {
      return (
        <div className="space-y-2">
          <button
            type="button"
            className="block w-full py-3 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
          >
            Upgrade — $39 / year
          </button>
          <p className="text-center text-xs text-[var(--ink-4)]">
            or $9.99 / month
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleStartTrial}
          className="block w-full py-3 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
        >
          {isAuthenticated ? "Start 14-day free trial" : "Get started — it's free"}
        </button>
        {!isAuthenticated && (
          <p className="text-center text-xs text-[var(--ink-4)]">
            Create an account to begin your trial
          </p>
        )}
        {isAuthenticated && (
          <p className="text-center text-xs text-[var(--ink-4)]">
            No credit card required · then $39 / year
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar
        isPremium={isPremium}
        daysRemaining={daysRemaining}
        subscriptionStatus={subStatus}
        isAdmin={isAdmin ?? false}
        onStartTrial={isAuthenticated && !isPremium && !trialUsed ? handleStartTrial : undefined}
      />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold text-[var(--ink)] mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Choose your plan
          </h1>
          <p className="text-[var(--ink-3)] text-base">
            Start free — upgrade when you're ready for more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free */}
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-4)] mb-1">Free</p>
              <p className="text-3xl font-bold text-[var(--ink)]">$0</p>
              <p className="text-xs text-[var(--ink-4)] mt-0.5">forever</p>
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[var(--ink-3)]">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
            {!isPremium ? (
              <div className="py-3 rounded-xl bg-[var(--surface-2)] text-[var(--ink-4)] text-sm font-medium text-center">
                Current plan
              </div>
            ) : (
              <Link
                href="/home"
                className="block py-3 rounded-xl bg-[var(--surface-2)] text-[var(--ink-4)] text-sm font-medium text-center hover:bg-[var(--surface)] transition-colors"
              >
                Continue with Free
              </Link>
            )}
          </div>

          {/* Premium — recommended */}
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col ring-2 ring-[var(--teal)] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[var(--teal)] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                Recommended · Save 67%
              </span>
            </div>
            <div className="mb-4 mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--teal-dark)] mb-1">Premium</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-[var(--ink)]">$39</p>
                <p className="text-sm text-[var(--ink-3)] mb-1">/ year</p>
              </div>
              <p className="text-xs text-[var(--ink-4)] mt-0.5">$3.25 / month · or $9.99 / month</p>
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[var(--ink-2)]">
                  <span className="text-[var(--teal)] mt-0.5">
                    <CheckIcon />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <PremiumCTA />
          </div>

          {/* Family — coming soon */}
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col relative overflow-hidden opacity-75">
            <div className="absolute top-4 right-4">
              <span className="bg-[var(--surface-2)] text-[var(--ink-4)] text-xs font-semibold px-2.5 py-1 rounded-full">
                Coming soon
              </span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-4)] mb-1">Family</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-[var(--ink)]">$69</p>
                <p className="text-sm text-[var(--ink-3)] mb-1">/ year</p>
              </div>
              <p className="text-xs text-[var(--ink-4)] mt-0.5">$5.75 / month</p>
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {FAMILY_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[var(--ink-3)]">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
            <div className="py-3 rounded-xl bg-[var(--surface-2)] text-[var(--ink-4)] text-sm font-medium text-center">
              Coming soon
            </div>
          </div>
        </div>

        {/* Pricing FAQ note */}
        <p className="text-center text-xs text-[var(--ink-4)] mt-8">
          All plans include a 14-day free trial of Premium · No credit card required to start
        </p>
      </main>
    </div>
  );
}
