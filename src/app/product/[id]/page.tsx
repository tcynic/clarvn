"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { NavBar } from "@/components/ui/NavBar";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { ProductHero } from "@/components/product/ProductHero";
import { ComparisonGateModal } from "@/components/compare/ComparisonGateModal";
import { ScoreCard } from "@/components/product/ScoreCard";
import { RetailersCard } from "@/components/product/RetailersCard";
import { ClaimsGrid } from "@/components/product/ClaimsGrid";
import { IngredientList } from "@/components/product/IngredientList";
import { WhyItWorksCard } from "@/components/product/WhyItWorksCard";
import { AlternativesSection } from "@/components/product/AlternativesSection";
import { PantrySidebarCard } from "@/components/product/PantrySidebarCard";
import { useGuestProfile } from "@/hooks/useGuestProfile";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const guestProfile = useGuestProfile();

  const productId = id as Id<"products">;
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Product data
  const product = useQuery(api.products.getProductById, { id: productId });
  const claims = useQuery(api.products.getProductClaims, { productId });
  const ingredients = useQuery(api.ingredients.getIngredientsByProduct, { productId });

  // Pantry state
  const inPantry = useQuery(
    api.pantry.isInPantry,
    isAuthenticated ? { productId } : "skip"
  );
  const addToPantry = useMutation(api.pantry.addToPantry);
  const removeFromPantry = useMutation(api.pantry.removeFromPantry);

  // Ingredient modifiers (skip until ingredients loaded)
  const ingredientIds = ingredients
    ? (ingredients.filter(Boolean).map((i) => i!._id) as Id<"ingredients">[])
    : undefined;
  const modifiers = useQuery(
    api.ingredients.getModifiersByIngredients,
    ingredientIds !== undefined ? { ingredientIds } : "skip"
  );

  // Match details (authenticated only — guest path computed client-side)
  const serverMatchDetails = useQuery(
    api.products.getMatchDetailsForProduct,
    isAuthenticated ? { productId } : "skip"
  );

  // Alternatives
  const alternatives = useQuery(api.scoringQueue.getAlternativesForProduct, { productId });

  // Subscription status (for NavBar)
  const subscriptionStatus = useQuery(
    api.userProfiles.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );
  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
    isAuthenticated ? {} : "skip"
  );

  // --- Loading / not-found states ---
  if (product === undefined) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <NavBar />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">Product not found</h1>
          <Link href="/home" className="text-sm text-[var(--teal-dark)] hover:text-[var(--teal)]">
            ← Back to Home
          </Link>
        </main>
      </div>
    );
  }

  const tier = product.tier as Tier | undefined;
  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysRemaining = subscriptionStatus?.daysRemaining ?? null;
  const subStatus = subscriptionStatus?.subscriptionStatus ?? null;

  const { isGuest, markScoreDelta } = usePremiumGate({
    isAuthenticated,
    isPremium,
    subscriptionStatus: subStatus,
  });

  // Compute personal score client-side from condition modifiers
  const personalScore: number | undefined = (() => {
    if (!isAuthenticated || !ingredients || !modifiers || product.baseScore === undefined) return undefined;
    const allConditions = [
      ...(serverMatchDetails?.matchedFlags ?? []).map((f: string) => f.toLowerCase()),
    ];
    if (allConditions.length === 0) return undefined;
    let totalModifier = 0;
    for (const mod of modifiers) {
      if (mod.status !== "active") continue;
      if (allConditions.includes(mod.condition.toLowerCase())) {
        totalModifier += (mod as { modifierAmount?: number }).modifierAmount ?? 0;
      }
    }
    return Math.max(0, Math.min(10, product.baseScore + totalModifier));
  })();

  // Resolve user conditions for ingredient flagging
  // Auth path: use server match details; guest path: use localStorage profile
  const activeProfile = isAuthenticated ? null : guestProfile;
  const userConditions = new Set<string>([
    ...(activeProfile?.conditions ?? []).map((c: string) => c.toLowerCase()),
    ...(activeProfile?.sensitivities ?? []).map((s: string) => s.toLowerCase()),
  ]);

  // For WhyItWorksCard: prefer server match details for auth users
  const matchedFlags = serverMatchDetails?.matchedFlags ?? [];
  const totalFlags = serverMatchDetails?.totalFlags ?? 0;
  const hasProfile = isAuthenticated
    ? serverMatchDetails !== null && serverMatchDetails !== undefined
    : guestProfile !== null;

  // Breadcrumb items
  const crumbs = [
    { label: "Home", href: "/home" },
    product.category
      ? { label: product.category.replace(/_/g, " "), href: `/explore?category=${product.category}` }
      : null,
    product.subcategory
      ? { label: product.subcategory.replace(/_/g, " "), href: `/explore?category=${product.category}&subcategory=${product.subcategory}` }
      : null,
    { label: product.name, href: null },
  ].filter(Boolean) as Array<{ label: string; href: string | null }>;

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar
        isPremium={isPremium}
        daysRemaining={daysRemaining}
        subscriptionStatus={subStatus}
        isAdmin={isAdmin ?? false}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-[var(--ink-4)] mb-5 flex-wrap">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[var(--surface-3)]">›</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-[var(--ink-2)] capitalize transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--ink-3)] truncate max-w-[180px]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* 2-column layout on desktop */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left column (main content) ── */}
          <div className="flex-1 min-w-0 space-y-6">
            <ProductHero
              product={product}
              inPantry={inPantry}
              onPantryToggle={() => {
                if (inPantry) {
                  removeFromPantry({ productId });
                } else {
                  addToPantry({ productId });
                }
              }}
              isAuthenticated={isAuthenticated}
              productId={id}
              onCompareClick={!isPremium ? () => setCompareModalOpen(true) : undefined}
            />

            {claims && <ClaimsGrid claims={claims} />}

            {ingredients && (
              <IngredientList
                ingredients={ingredients}
                modifiers={modifiers ?? []}
                userConditions={userConditions}
                isPremium={isPremium}
                isAuthenticated={isAuthenticated}
                isGuest={isGuest}
                baseScore={product.baseScore}
                personalScore={personalScore}
                onScoreDeltaDetected={markScoreDelta}
              />
            )}

            <WhyItWorksCard
              matchedFlags={matchedFlags}
              totalFlags={totalFlags}
              hasProfile={hasProfile}
            />

            {alternatives !== undefined && (
              <AlternativesSection
                alternatives={alternatives}
                currentProductTier={tier}
                isPremium={isPremium}
              />
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="lg:w-72 shrink-0 space-y-4">
            {tier && product.baseScore !== undefined && (
              <ScoreCard score={product.baseScore} tier={tier} />
            )}

            <PantrySidebarCard
              inPantry={inPantry}
              onAdd={() => addToPantry({ productId })}
              onRemove={() => removeFromPantry({ productId })}
              isAuthenticated={isAuthenticated}
            />

            <RetailersCard retailers={product.retailers} />
          </div>
        </div>
      </main>

      {compareModalOpen && (
        <ComparisonGateModal
          product1={{
            id,
            name: product.name,
            brand: product.brand,
            emoji: product.emoji,
            baseScore: product.baseScore,
            tier: tier,
          }}
          onClose={() => setCompareModalOpen(false)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}
