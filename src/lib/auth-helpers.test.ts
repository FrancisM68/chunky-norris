import { describe, it, expect, vi } from "vitest";
import { authorizeCredentials } from "./auth-helpers";

const mockFindUnique = vi.fn();

const mockDb = {
  volunteer: {
    findUnique: mockFindUnique,
  },
} as any;

describe("authorizeCredentials", () => {
  it("returns null when volunteer not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await authorizeCredentials(
      { email: "unknown@dar.ie", password: "secret" },
      mockDb
    );

    expect(result).toBeNull();
  });

  it("returns null when volunteer has no passwordHash", async () => {
    mockFindUnique.mockResolvedValue({
      id: "vol_1",
      roles: ["ADMIN"],
      passwordHash: null,
    });

    const result = await authorizeCredentials(
      { email: "lisa@dar.ie", password: "secret" },
      mockDb
    );

    expect(result).toBeNull();
  });

  it("returns null when password does not match", async () => {
    // bcrypt hash of "correct-password"
    mockFindUnique.mockResolvedValue({
      id: "vol_1",
      roles: ["ADMIN"],
      passwordHash:
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6o7tGbsBCi",
    });

    const result = await authorizeCredentials(
      { email: "lisa@dar.ie", password: "wrong-password" },
      mockDb
    );

    expect(result).toBeNull();
  });

  it("returns user object when credentials are valid", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password", 12);

    mockFindUnique.mockResolvedValue({
      id: "vol_1",
      roles: ["ADMIN"],
      passwordHash: hash,
    });

    const result = await authorizeCredentials(
      { email: "lisa@dar.ie", password: "correct-password" },
      mockDb
    );

    expect(result).toEqual({ id: "vol_1", roles: ["ADMIN"] });
  });
});
