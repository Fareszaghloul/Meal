import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that do not require authentication
// Accounts are created by an administrator; sign-in is the only public page.
const PUBLIC_PATHS = ["/login"];

// Static asset prefixes that should bypass auth and header rewriting
const STATIC_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/robots.txt",
  "/icons",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("mealprep_session");
  const hasSession = Boolean(sessionCookie && sessionCookie.value.trim().length > 0);

  // Check if it's an API route: let API routes handle their own auth checks and return JSON
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const isPublicAuthPage = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

  // Redirect unauthenticated users trying to access protected pages
  if (!hasSession && !isPublicAuthPage) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages to home
  if (hasSession && isPublicAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), browsing-topics=()"
  );

  // CSP: camera and workers permitted for barcode scanner / OCR
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images.unsplash.com https://*.spoonacular.com https://*.openfoodfacts.org https://*.mcdonalds.com.jo https://*.fatsecret.com",
    "connect-src 'self' https://world.openfoodfacts.org https://api.nal.usda.gov https://platform.fatsecret.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
