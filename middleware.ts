import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Public path prefixes — no session required
const PUBLIC_PREFIXES = ["/login", "/api/auth"];

type AccessResult = "allow" | "redirect-login";

/**
 * Pure function — determines route access from pathname + roles.
 * Extracted for testability. No Next.js dependencies.
 */
export function resolveRouteAccess(
  pathname: string,
  roles: string[] | null
): AccessResult {
  const isPublic = PUBLIC_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isPublic) return "allow";

  if (!roles) return "redirect-login";

  if (pathname.startsWith("/admin")) {
    return roles.includes("ADMIN") ? "allow" : "redirect-login";
  }

  if (pathname.startsWith("/foster")) {
    return roles.includes("FOSTER") || roles.includes("ADMIN")
      ? "allow"
      : "redirect-login";
  }

  return "allow";
}

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  const roles = session?.user?.roles ?? null;
  const access = resolveRouteAccess(pathname, roles as string[] | null);

  if (access === "redirect-login") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
