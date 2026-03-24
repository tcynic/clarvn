"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/admin");
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
      <div
        className="bg-white rounded-[var(--radius-xl)] shadow-sm border border-[var(--border)] p-8 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-[var(--font-serif)] text-[var(--ink)]">
            CleanList <span className="italic text-[var(--teal)]">Admin</span>
          </h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">Sign in to continue</p>
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
              placeholder="admin@example.com"
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
