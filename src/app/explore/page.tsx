"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/NavBar";
import { Suspense } from "react";

function ExploreContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const mode = searchParams.get("mode") ?? "";

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="section-eyebrow mb-2">Coming in Epic 6</p>
        <h1 className="text-2xl font-semibold text-[var(--ink)] mb-3">Explore</h1>
        {q && (
          <p className="text-sm text-[var(--ink-3)] mb-2">
            Search: <span className="font-medium text-[var(--ink)]">{q}</span>
          </p>
        )}
        {mode && (
          <p className="text-sm text-[var(--ink-3)] mb-2">
            Mode: <span className="font-medium text-[var(--ink)]">{mode}</span>
          </p>
        )}
        <p className="text-sm text-[var(--ink-3)] mt-4 mb-8">
          Full product search and discovery will be available in a future release.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/home"
            className="text-sm font-medium text-[var(--teal-dark)] hover:text-[var(--teal)] transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/app"
            className="text-sm font-medium text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
          >
            Shopping List
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
