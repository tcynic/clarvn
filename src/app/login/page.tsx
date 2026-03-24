"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect already-authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/app");
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: mode });
      router.push("/app");
    } catch {
      setError(
        mode === "signIn"
          ? "Invalid email or password."
          : "Could not create account. That email may already be in use."
      );
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface)] px-4">
      <div className="bg-white rounded-[var(--radius-xl)] shadow-sm border border-[var(--border)] p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block">
            <span
              className="text-2xl text-[var(--ink)]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              clar<span className="text-[var(--teal)] italic">vn</span>
            </span>
          </Link>
          <p className="text-sm text-[var(--ink-3)] mt-2">
            {mode === "signIn" ? "Welcome back" : "Create your free account"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-[var(--surface-2)] rounded-[var(--radius)] p-0.5 mb-6">
          <button
            type="button"
            onClick={() => { setMode("signIn"); setError(""); }}
            className={`flex-1 text-sm font-medium py-2 rounded-[calc(var(--radius)-2px)] transition-colors ${
              mode === "signIn"
                ? "bg-white text-[var(--ink)] shadow-sm"
                : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signUp"); setError(""); }}
            className={`flex-1 text-sm font-medium py-2 rounded-[calc(var(--radius)-2px)] transition-colors ${
              mode === "signUp"
                ? "bg-white text-[var(--ink)] shadow-sm"
                : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--tier-avoid)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--teal)] text-white font-medium text-sm rounded-[var(--radius)] px-4 py-2.5 hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-60"
          >
            {loading
              ? "…"
              : mode === "signIn"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>
      </div>

      <p className="text-xs text-[var(--ink-4)] mt-6 text-center max-w-xs">
        Scores are AI-generated from peer-reviewed evidence. Not a substitute for medical advice.
      </p>
    </div>
  );
}
