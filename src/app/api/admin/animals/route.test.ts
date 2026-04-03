import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock auth — default: no session (unauthenticated)
// ---------------------------------------------------------------------------
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// ---------------------------------------------------------------------------
// Mock tenant client
// ---------------------------------------------------------------------------
const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    animal: { findMany: mockFindMany, create: mockCreate },
  })),
}));

// ---------------------------------------------------------------------------
// Import the handler AFTER mocks are registered
// ---------------------------------------------------------------------------
import { GET, POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost/api/admin/animals";

function makeRequest(search?: string): NextRequest {
  const url = search ? `${BASE_URL}?${search}` : BASE_URL;
  return new NextRequest(url, { method: "GET" });
}

function adminSession() {
  return {
    user: {
      name: "Lisa Martinez",
      email: "lisa@dar.ie",
      volunteerId: "vol-1",
      roles: ["ADMIN"],
    },
  };
}

function fosterSession() {
  return {
    user: {
      name: "Jane Foster",
      email: "jane@dar.ie",
      volunteerId: "vol-2",
      roles: ["FOSTER"],
    },
  };
}

const SAMPLE_ANIMALS = [
  {
    id: "animal-1",
    officialName: "Moneymore Kitten1 - Onyx",
    nickname: "Onyx",
    species: "CAT",
    status: "IN_CARE",
    breed: "DSH",
    gender: "MALE_NEUTERED",
    intakeDate: new Date("2026-02-15"),
    departureDate: null,
    fosterAssignments: [],
  },
  {
    id: "animal-2",
    officialName: "Drogheda Pup3 - Biscuit",
    nickname: "Biscuit",
    species: "DOG",
    status: "FOSTERED",
    breed: "Labrador Mix",
    gender: "FEMALE_INTACT",
    intakeDate: new Date("2026-01-10"),
    departureDate: null,
    fosterAssignments: [
      {
        foster: { firstName: "Jane", lastName: "Foster" },
      },
    ],
  },
  {
    id: "animal-3",
    officialName: "Laytown Cat2 - Shadow",
    nickname: "Shadow",
    species: "CAT",
    status: "ADOPTED",
    breed: "DLH",
    gender: "FEMALE_NEUTERED",
    intakeDate: new Date("2025-11-01"),
    departureDate: new Date("2026-01-20"),
    fosterAssignments: [],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /api/admin/animals", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindMany.mockReset();
    mockCreate.mockReset();
  });

  it("returns 401 when no session exists", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Unauthorized/);
  });

  it("returns 403 when session role is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(fosterSession());

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Forbidden/);
  });

  it("returns in_care animals by default (scope=in_care)", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([SAMPLE_ANIMALS[0], SAMPLE_ANIMALS[1]]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);

    // Verify the Prisma query used the in_care filter
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toEqual({ in: ["IN_CARE", "FOSTERED"] });
  });

  it("returns all animals when scope=all", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce(SAMPLE_ANIMALS);

    const res = await GET(makeRequest("scope=all"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(3);

    // Verify no status filter was applied
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBeUndefined();
  });

  it("filters by animal name when q= is provided", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([SAMPLE_ANIMALS[0]]);

    const res = await GET(makeRequest("q=Onyx"));
    expect(res.status).toBe(200);

    // Verify the Prisma query included an OR condition for names
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          officialName: { contains: "Onyx", mode: "insensitive" },
        }),
        expect.objectContaining({
          nickname: { contains: "Onyx", mode: "insensitive" },
        }),
      ])
    );
  });

  it("filters by foster name when q= is provided", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([SAMPLE_ANIMALS[1]]);

    const res = await GET(makeRequest("q=Jane"));
    expect(res.status).toBe(200);

    // Verify the Prisma query included a foster name condition in the OR
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fosterAssignments: {
            some: {
              isActive: true,
              foster: {
                OR: [
                  { firstName: { contains: "Jane", mode: "insensitive" } },
                  { lastName: { contains: "Jane", mode: "insensitive" } },
                ],
              },
            },
          },
        }),
      ])
    );
  });

  it("filters by full foster name 'First Last' when q= contains a space", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([SAMPLE_ANIMALS[1]]);

    const res = await GET(makeRequest("q=Jane+Foster"));
    expect(res.status).toBe(200);

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fosterAssignments: {
            some: {
              isActive: true,
              foster: {
                AND: [
                  {
                    OR: [
                      { firstName: { contains: "Jane", mode: "insensitive" } },
                      { lastName: { contains: "Jane", mode: "insensitive" } },
                    ],
                  },
                  {
                    OR: [
                      { firstName: { contains: "Foster", mode: "insensitive" } },
                      { lastName: { contains: "Foster", mode: "insensitive" } },
                    ],
                  },
                ],
              },
            },
          },
        }),
      ])
    );
  });

  it("calculates daysInCare for each animal in the response", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([SAMPLE_ANIMALS[2]]);

    const res = await GET(makeRequest("scope=all"));
    expect(res.status).toBe(200);
    const json = await res.json();

    // Shadow: intake 2025-11-01, departure 2026-01-20 = 80 days
    expect(json[0].daysInCare).toBe(80);
  });

  it("returns 500 when the database query throws", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to fetch/);
  });
});

describe("POST /api/admin/animals", () => {
  const VALID_BODY = {
    officialName: "Moneymore Kitten2 - Luna",
    species: "CAT",
    gender: "FEMALE_INTACT",
    intakeDate: "2026-04-01",
    intakeSource: "STRAY",
    strayLocation: "Moneymore Estate",
    status: "IN_CARE",
  };

  function makePost(body: object): NextRequest {
    return new NextRequest(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => { mockAuth.mockReset(); mockCreate.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(fosterSession());
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 422 when required fields are missing", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    const res = await POST(makePost({ officialName: "" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fields.officialName).toBeDefined();
  });

  it("returns 422 when terminal status missing departureDate and disposalMethod", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    const res = await POST(makePost({ ...VALID_BODY, status: "ADOPTED" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fields.departureDate).toBeDefined();
    expect(json.fields.disposalMethod).toBeDefined();
  });

  it("returns 201 with animal id on valid create", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockCreate.mockResolvedValueOnce({ id: "new-animal-id" });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("new-animal-id");
  });
});
