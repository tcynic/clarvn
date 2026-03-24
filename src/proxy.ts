import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const isAdminSubdomain =
    hostname.startsWith("admin.") || hostname === "admin.localhost";
  const { pathname } = request.nextUrl;

  if (isAdminSubdomain) {
    // Internal Next.js / API routes pass through untouched
    if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // Paths that already include /admin prefix pass through as-is.
    // This handles internal redirects from the admin layout (e.g. /admin/login).
    if (pathname.startsWith("/admin")) {
      return NextResponse.next();
    }

    // Rewrite the subdomain root and other paths to the /admin filesystem tree.
    // / → /admin, /login → /admin/login, /products → /admin/products, etc.
    const url = request.nextUrl.clone();
    url.pathname = "/admin" + (pathname === "/" ? "" : pathname);
    return NextResponse.rewrite(url);
  }

  // On the main domain, block direct /admin/* access — redirect to home.
  if (pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all paths except static files and images
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
