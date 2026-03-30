import { NextRequest, NextResponse } from "next/server";

// Public path prefixes — always allowed
const PUBLIC_PREFIXES = ["/login", "/api/auth", "/_next", "/favicon.ico"];

// Protected path prefixes — require a session cookie
const PROTECTED_PREFIXES = ["/foster", "/admin"];

export type AccessResult = "allow" | "redirect-login";

/**
 * Pure function — determines route access from pathname + cookie presence.
 * Extracted for testability.
 */
export function resolveRouteAccess(
  pathname: string,
  hasSession: boolean
): AccessResult {
  const isPublic = PUBLIC_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isPublic) return "allow";

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!isProtected) return "allow";

  return hasSession ? "allow" : "redirect-login";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth.js v5 sets one of these cookie names depending on environment
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  const access = resolveRouteAccess(pathname, hasSession);

  if (access === "redirect-login") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
