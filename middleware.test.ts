import { describe, it, expect } from "vitest";
import { resolveRouteAccess } from "./middleware";

describe("resolveRouteAccess", () => {
  it("allows public routes without a session", () => {
    expect(resolveRouteAccess("/login", false)).toBe("allow");
    expect(resolveRouteAccess("/api/auth/signin", false)).toBe("allow");
    expect(resolveRouteAccess("/_next/static/chunk.js", false)).toBe("allow");
  });

  it("redirects to login when no session on /foster", () => {
    expect(resolveRouteAccess("/foster", false)).toBe("redirect-login");
  });

  it("redirects to login when no session on /admin", () => {
    expect(resolveRouteAccess("/admin", false)).toBe("redirect-login");
  });

  it("allows /foster with a session", () => {
    expect(resolveRouteAccess("/foster", true)).toBe("allow");
  });

  it("allows /admin with a session", () => {
    expect(resolveRouteAccess("/admin", true)).toBe("allow");
  });

  it("allows unprotected routes without a session", () => {
    expect(resolveRouteAccess("/", false)).toBe("allow");
    expect(resolveRouteAccess("/about", false)).toBe("allow");
  });
});
