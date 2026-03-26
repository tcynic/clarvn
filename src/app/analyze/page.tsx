"use client";

import { useState } from "react";
import { useConvexAuth, useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NavBar } from "@/components/ui/NavBar";
import { AnalyzeResults } from "@/components/analyze/AnalyzeResults";
import { SaveAsProductForm } from "@/components/analyze/SaveAsProductForm";

const FREE_DAILY_LIMIT = 3;

type AnalysisResult = {
  assembledScore: number;
  tier: string;
  ingredients: Array<{
    name: string;
    baseScore: number;
    tier: string;
    recognized: boolean;
    canonicalName?: string;
  }>;
  recognizedCount: number;
  estimatedCount: number;
  totalCount: number;
};

export default function AnalyzePage() {
  const { isAuthenticated } = useConvexAuth();

  const subscriptionStatus = useQuery(
    api.userProfiles.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );
  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
    isAuthenticated ? {} : "skip"
  );
  const dailyUsage = useQuery(
    api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage,
    isAuthenticated ? {} : "skip"
  );

  const analyzeAction = useAction(api.analyzeIngredients.analyzeIngredientList);
  const startTrial = useMutation(api.users.startTrial);

  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysRemaining = subscriptionStatus?.daysRemaining ?? null;
  const subStatus = subscriptionStatus?.subscriptionStatus ?? null;

  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const usageCount = dailyUsage?.count ?? 0;
  const atDailyLimit = !isPremium && usageCount >= FREE_DAILY_LIMIT;

  async function handleAnalyze() {
    if (!rawText.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await analyzeAction({ rawText }) as AnalysisResult;
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar
        isPremium={isPremium}
        daysRemaining={daysRemaining}
        subscriptionStatus={subStatus}
        isAdmin={isAdmin ?? false}
        onStartTrial={isAuthenticated ? () => startTrial({}) : undefined}
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1
            className="text-2xl font-semibold text-[var(--ink)] mb-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Analyze Ingredients
          </h1>
          <p className="text-sm text-[var(--ink-3)]">
            Paste an ingredient list from any food or supplement label.
          </p>
        </div>

        {/* Usage counter for free users */}
        {isAuthenticated && !isPremium && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                atDailyLimit
                  ? "bg-amber-100 text-amber-700"
                  : "bg-[var(--surface-2)] text-[var(--ink-3)]"
              }`}
            >
              {usageCount} / {FREE_DAILY_LIMIT} analyses used today
            </span>
            {atDailyLimit && (
              <a
                href="/upgrade"
                className="text-xs text-[var(--teal-dark)] underline font-medium"
              >
                Upgrade for unlimited
              </a>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. Water, Sugar, High Fructose Corn Syrup, Citric Acid, Natural Flavors..."
            rows={6}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--surface-3)] bg-[var(--surface)] text-sm text-[var(--ink)] placeholder-[var(--ink-4)] focus:outline-none focus:border-[var(--teal)] transition-colors resize-none"
            disabled={atDailyLimit || isLoading}
          />

          {error && (
            <p className="text-sm text-[var(--tier-avoid)]">{error}</p>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!rawText.trim() || isLoading || atDailyLimit}
            className="w-full py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? "Analyzing…" : "Analyze"}
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-[var(--ink-4)] text-center">
              <a href="/login" className="text-[var(--teal-dark)] underline">
                Sign in
              </a>{" "}
              to save your analyses and track your daily usage.
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            <AnalyzeResults result={result} />
            {isAuthenticated && (
              <SaveAsProductForm
                baseScore={result.assembledScore}
                tier={result.tier}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
