"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Top nav */}
      <nav className="bg-[var(--ink)] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-sm">
            CleanList <span className="text-[var(--teal-mid)] italic">Admin</span>
          </span>
          <div className="flex gap-4 text-sm">
            <Link
              href="/admin"
              className="text-white/70 hover:text-white transition-colors"
            >
              Queue
            </Link>
            <Link
              href="/admin/products"
              className="text-white/70 hover:text-white transition-colors"
            >
              Products
            </Link>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </nav>

      {/* Page content */}
      <main className="max-w-[860px] mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
