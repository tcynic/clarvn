"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL && typeof window !== "undefined") {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Run `convex dev` and ensure .env.local is populated."
  );
}

// Use a placeholder during SSR/prerendering when the env var may not be available.
// The client is only used on the browser side.
const convex = new ConvexReactClient(CONVEX_URL ?? "https://placeholder.convex.cloud");

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>
  );
}
