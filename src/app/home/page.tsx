"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GuestBanner } from "@/components/ui/GuestBanner";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import { saveProfile } from "@/lib/personalScore";

/**
 * /home — Epic 4 Home Dashboard stub.
 *
 * Access rules:
 * - Authenticated users: load profile from Convex, no banner.
 * - Guests with localStorage profile: show content + GuestBanner.
 * - No profile at all: redirect to /onboarding.
 */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const guestProfile = useGuestProfile();

  const convexProfile = useQuery(
    api.userProfiles.getMyProfile,
    isAuthenticated ? {} : "skip"
  );

  // Sync Convex profile to localStorage for fast reads
  useEffect(() => {
    if (!convexProfile) return;
    saveProfile({
      motivation: convexProfile.motivation ?? [],
      conditions: convexProfile.conditions ?? [],
      sensitivities: convexProfile.sensitivities ?? [],
      dietaryRestrictions: convexProfile.dietaryRestrictions ?? [],
      lifeStage: convexProfile.lifeStage ?? "",
      householdMembers: convexProfile.householdMembers ?? [],
      ingredientsToAvoid: convexProfile.ingredientsToAvoid ?? [],
    });
  }, [convexProfile]);

  // Auth check: if not authed and no guest profile, redirect to onboarding
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && guestProfile === null) {
      // guestProfile starts as null before hydration — wait one tick
      // for the hook to hydrate from localStorage before deciding
      const timer = setTimeout(() => {
        const stillNull = guestProfile === null;
        if (!isAuthenticated && stillNull) {
          router.push("/onboarding");
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, guestProfile, router]);

  // Authenticated users: redirect to onboarding if no profile yet
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (convexProfile === undefined) return; // still loading
    if (convexProfile === null) {
      router.push("/onboarding");
    }
  }, [isAuthenticated, isLoading, convexProfile, router]);

  const activeProfile = convexProfile
    ? {
        conditions: convexProfile.conditions ?? [],
        sensitivities: convexProfile.sensitivities ?? [],
      }
    : guestProfile;

  const isGuest = !isAuthenticated;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {isGuest && <GuestBanner />}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--ink)]">
            clar<span className="text-[var(--teal-mid)] italic">vn</span>
          </h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">
            {isGuest ? "Exploring as guest" : "Home"}
          </p>
        </header>

        {/* Epic 4 content placeholder */}
        <div className="widget-card text-center py-16">
          <p className="text-[var(--ink-3)] text-sm">
            Home dashboard coming in Epic 4.
          </p>
          {activeProfile && (
            <p className="text-xs text-[var(--ink-4)] mt-2">
              Profile active: {(activeProfile.conditions ?? []).length} conditions,{" "}
              {(activeProfile.sensitivities ?? []).length} sensitivities
            </p>
          )}
          <div className="mt-6">
            <a
              href="/app"
              className="inline-block text-sm font-medium text-[var(--teal-dark)] underline underline-offset-2"
            >
              Browse products →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
