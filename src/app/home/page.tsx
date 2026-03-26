"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NavBar } from "@/components/ui/NavBar";
import { GuestBanner } from "@/components/ui/GuestBanner";
import { TrialEndedModal } from "@/components/ui/TrialEndedModal";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { saveProfile } from "@/lib/personalScore";
import { HeroSection } from "@/components/home/HeroSection";
import { SearchCard } from "@/components/home/SearchCard";
import { QuickActionsGrid } from "@/components/home/QuickActionsGrid";
import { ProductMatchSection } from "@/components/home/ProductMatchSection";
import { ContentSection } from "@/components/home/ContentSection";
import { CheckinWidget } from "@/components/home/CheckinWidget";
import { PantryWidget } from "@/components/home/PantryWidget";
import { ProfileWidget } from "@/components/home/ProfileWidget";

/**
 * /home — Epic 4 Home Dashboard.
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

  const subscriptionStatus = useQuery(
    api.userProfiles.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );

  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
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

  const startTrial = useMutation(api.users.startTrial);

  const isGuest = !isAuthenticated;
  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysRemaining = subscriptionStatus?.daysRemaining ?? null;
  const subStatus = subscriptionStatus?.subscriptionStatus ?? null;

  const { hasSeenScoreDelta } = usePremiumGate({ isAuthenticated, isPremium, subscriptionStatus: subStatus });

  // Resolve active profile (Convex takes priority over localStorage)
  const activeProfile = convexProfile
    ? {
        conditions: convexProfile.conditions ?? [],
        sensitivities: convexProfile.sensitivities ?? [],
        dietaryRestrictions: convexProfile.dietaryRestrictions ?? [],
        ingredientsToAvoid: convexProfile.ingredientsToAvoid ?? [],
      }
    : guestProfile
    ? {
        conditions: guestProfile.conditions ?? [],
        sensitivities: guestProfile.sensitivities ?? [],
        dietaryRestrictions: guestProfile.dietaryRestrictions ?? [],
        ingredientsToAvoid: guestProfile.ingredientsToAvoid ?? [],
      }
    : null;

  const conditionCount =
    (activeProfile?.conditions.length ?? 0) +
    (activeProfile?.sensitivities.length ?? 0);

  // Extract user display name from profile or auth
  const userName = convexProfile
    ? (convexProfile as { name?: string }).name
    : undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <TrialEndedModal subscriptionStatus={subStatus} />
      <NavBar
        userName={userName}
        activeConditionCount={conditionCount}
        isAdmin={isAdmin ?? false}
        isPremium={isPremium}
        daysRemaining={daysRemaining}
        subscriptionStatus={subStatus}
        onStartTrial={isAuthenticated ? () => startTrial({}) : undefined}
      />

      {isGuest && <GuestBanner />}

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main column */}
          <div className="space-y-8">
            <HeroSection userName={userName} isGuest={isGuest} />
            <SearchCard />
            <QuickActionsGrid />
            {activeProfile && (
              <ProductMatchSection
                isAuthenticated={isAuthenticated}
                isPremium={isPremium}
                isGuest={isGuest}
                hasSeenScoreDelta={hasSeenScoreDelta}
                profileOverride={isGuest ? activeProfile : undefined}
                conditionCount={conditionCount}
              />
            )}
            <ContentSection />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <CheckinWidget isAuthenticated={isAuthenticated} />
            <PantryWidget isAuthenticated={isAuthenticated} />
            {activeProfile && (
              <ProfileWidget
                conditions={activeProfile.conditions}
                sensitivities={activeProfile.sensitivities}
                dietaryRestrictions={activeProfile.dietaryRestrictions}
                isGuest={isGuest}
              />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
