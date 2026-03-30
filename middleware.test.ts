import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { resolveRouteAccess } from "./middleware";

describe("resolveRouteAccess", () => {
  it("allows public routes without a session", () => {
    expect(resolveRouteAccess("/login", null)).toBe("allow");
    expect(resolveRouteAccess("/api/auth/signin", null)).toBe("allow");
  });

  it("redirects to login when no session on protected route", () => {
    expect(resolveRouteAccess("/foster", null)).toBe("redirect-login");
    expect(resolveRouteAccess("/admin", null)).toBe("redirect-login");
  });

  it("allows FOSTER role on /foster", () => {
    expect(resolveRouteAccess("/foster", ["FOSTER"])).toBe("allow");
  });

  it("allows ADMIN role on /foster", () => {
    expect(resolveRouteAccess("/foster", ["ADMIN"])).toBe("allow");
  });

  it("denies VOLUNTEER role on /foster", () => {
    expect(resolveRouteAccess("/foster", ["VOLUNTEER"])).toBe("redirect-login");
  });

  it("allows ADMIN role on /admin", () => {
    expect(resolveRouteAccess("/admin", ["ADMIN"])).toBe("allow");
  });

  it("denies FOSTER role on /admin", () => {
    expect(resolveRouteAccess("/admin", ["FOSTER"])).toBe("redirect-login");
  });
});
