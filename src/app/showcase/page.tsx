"use client";

/**
 * Component showcase — dev-only page to verify all UI primitives render correctly.
 * Visit /showcase in the browser. Not linked from the main nav.
 */

import { useState } from "react";
import { ScorePill } from "../../components/product/ScorePill";
import { Widget } from "../../components/ui/Widget";
import { ProductCard } from "../../components/ui/ProductCard";
import { MatchBadge } from "../../components/ui/MatchBadge";
import { FilterPill } from "../../components/ui/FilterPill";
import { NavBar } from "../../components/ui/NavBar";

const TIERS = ["Clean", "Watch", "Caution", "Avoid"] as const;

export default function ShowcasePage() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [pantryState, setPantryState] = useState<Record<string, boolean>>({});

  const filters = ["All", "Snacks", "Dairy", "Beverages", "Frozen"];

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* NavBar */}
      <NavBar
        userName="Alex"
        activeConditionCount={3}
        isAdmin={true}
        isPremium={true}
        daysRemaining={5}
      />

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">

        {/* Header */}
        <div>
          <p className="section-eyebrow mb-2">Design System</p>
          <h1 className="text-2xl font-bold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
            Component Showcase
          </h1>
          <p className="text-[var(--ink-3)] text-sm mt-1">All UI primitives for the Clarvn v3.4 redesign.</p>
        </div>

        {/* ScorePill */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-4">ScorePill</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[var(--ink-4)] mb-2">Solid (default)</p>
              <div className="flex flex-wrap gap-4 items-center">
                {TIERS.map((tier) => (
                  <ScorePill key={tier} score={tier === "Clean" ? 2.1 : tier === "Watch" ? 5.4 : tier === "Caution" ? 7.2 : 8.9} tier={tier} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--ink-4)] mb-2">Gradient</p>
              <div className="flex flex-wrap gap-4 items-center">
                {TIERS.map((tier) => (
                  <ScorePill key={tier} score={tier === "Clean" ? 2.1 : tier === "Watch" ? 5.4 : tier === "Caution" ? 7.2 : 8.9} tier={tier} gradient />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--ink-4)] mb-2">Sizes + base score overlay</p>
              <div className="flex flex-wrap gap-4 items-end">
                <ScorePill score={3.2} tier="Clean" size="sm" baseScore={5.8} gradient />
                <ScorePill score={3.2} tier="Clean" size="md" baseScore={5.8} gradient />
                <ScorePill score={3.2} tier="Clean" size="lg" baseScore={5.8} gradient />
              </div>
            </div>
          </div>
        </section>

        {/* MatchBadge */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-4">MatchBadge</h2>
          <div className="flex flex-wrap gap-3">
            <MatchBadge percentage={95} />
            <MatchBadge percentage={72} />
            <MatchBadge percentage={40} />
            <MatchBadge percentage={15} />
          </div>
        </section>

        {/* FilterPill */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-4">FilterPill</h2>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <FilterPill
                key={f}
                label={f}
                active={activeFilter === f}
                onClick={() => setActiveFilter(f)}
              />
            ))}
          </div>
        </section>

        {/* Widget */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-4">Widget</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Widget title="Check-in" eyebrow="Today">
              <div className="flex gap-3 text-2xl">
                {["😣", "😕", "😐", "😊", "😄"].map((e, i) => (
                  <button key={i} className="hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
            </Widget>
            <Widget title="Pantry" eyebrow="Your stash" action={<span className="text-xs text-[var(--teal)]">View all →</span>}>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>12</p>
                <p className="text-sm text-[var(--ink-3)]">products tracked</p>
                <div className="flex gap-1 mt-2">
                  <span className="b-clean">8 Clean</span>
                  <span className="b-watch">3 Watch</span>
                  <span className="b-avoid">1 Avoid</span>
                </div>
              </div>
            </Widget>
            <Widget title="Profile" eyebrow="Active flags">
              <div className="flex flex-wrap gap-1">
                {["Gluten-free", "Dairy-free", "No Red 40"].map((flag) => (
                  <span key={flag} className="pill-neutral text-xs">{flag}</span>
                ))}
                <span className="pill text-xs">+2 more</span>
              </div>
            </Widget>
          </div>
        </section>

        {/* ProductCard */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-4">ProductCard</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <ProductCard
                key={tier}
                name={`Example ${tier} Product`}
                brand="Brand Co."
                emoji={tier === "Clean" ? "🥦" : tier === "Watch" ? "🧃" : tier === "Caution" ? "🍪" : "🌭"}
                baseScore={tier === "Clean" ? 2.1 : tier === "Watch" ? 5.4 : tier === "Caution" ? 7.2 : 8.9}
                tier={tier}
                price={4.99}
                matchPercentage={tier === "Clean" ? 94 : tier === "Watch" ? 72 : 35}
                inPantry={pantryState[tier] ?? false}
                onTogglePantry={() =>
                  setPantryState((prev) => ({ ...prev, [tier]: !prev[tier] }))
                }
              />
            ))}
          </div>
        </section>

        {/* Tier badges */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-4">Tier Badges</h2>
          <div className="flex flex-wrap gap-2">
            <span className="b-clean">Clean</span>
            <span className="b-watch">Watch</span>
            <span className="b-caution">Caution</span>
            <span className="b-avoid">Avoid</span>
            <span className="b-teal">Premium</span>
            <span className="b-gray">Archived</span>
            <span className="b-purple">Admin</span>
            <span className="b-blue">New</span>
          </div>
        </section>

        {/* Callouts */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-4">Callouts</h2>
          <div className="space-y-2">
            <div className="callout teal"><span>🌿</span> <span>This product matches your dietary profile.</span></div>
            <div className="callout amber"><span>⚠️</span> <span>Contains Red 40, flagged for your ADHD profile.</span></div>
            <div className="callout red"><span>🚫</span> <span>High avoidance score for your conditions.</span></div>
          </div>
        </section>

      </div>
    </div>
  );
}
