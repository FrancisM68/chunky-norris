import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockFindUniqueAnimal = vi.fn();
const mockFindManyLogs = vi.fn();
vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    animal: { findUnique: mockFindUniqueAnimal },
    treatmentLog: { findMany: mockFindManyLogs },
  })),
}));

import { GET } from "./route";

const BASE_URL = "http://localhost/api/admin/animals/animal-1/treatments";
const CONTEXT = { params: Promise.resolve({ id: "animal-1" }) };

function makeGet(): NextRequest {
  return new NextRequest(BASE_URL, { method: "GET" });
}
function adminSession() {
  return { user: { name: "Lisa", email: "lisa@dar.ie", volunteerId: "v1", roles: ["ADMIN"] } };
}
function fosterSession() {
  return { user: { name: "Jane", email: "jane@dar.ie", volunteerId: "v2", roles: ["FOSTER"] } };
}

const SAMPLE_LOG = {
  id: "log-1",
  animalId: "animal-1",
  administeredById: "v1",
  medicationType: "DEWORMING",
  medicationName: "Milbemax",
  medicationNameFreeText: null,
  dosageAmount: 1,
  dosageUnit: "TABLET",
  batchNumber: null,
  administeredAt: new Date("2026-03-01T10:00:00Z"),
  animalWeightKg: 3.2,
  medicationDisposal: "ADMINISTERED_IN_FULL",
  treatmentReason: "Routine worming",
  notes: null,
  createdAt: new Date("2026-03-01T10:05:00Z"),
  updatedAt: new Date("2026-03-01T10:05:00Z"),
  administeredBy: { id: "v1", firstName: "Lisa", lastName: "Martinez" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/animals/[id]/treatments", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin session", async () => {
    mockAuth.mockResolvedValue(fosterSession());
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when animal does not exist", async () => {
    mockAuth.mockResolvedValue(adminSession());
    mockFindUniqueAnimal.mockResolvedValue(null);
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("returns empty array when animal has no treatment logs", async () => {
    mockAuth.mockResolvedValue(adminSession());
    mockFindUniqueAnimal.mockResolvedValue({ id: "animal-1" });
    mockFindManyLogs.mockResolvedValue([]);
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns treatment logs with administeredBy volunteer name", async () => {
    mockAuth.mockResolvedValue(adminSession());
    mockFindUniqueAnimal.mockResolvedValue({ id: "animal-1" });
    mockFindManyLogs.mockResolvedValue([SAMPLE_LOG]);
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("log-1");
    expect(body[0].medicationName).toBe("Milbemax");
    expect(body[0].administeredBy.firstName).toBe("Lisa");
    expect(body[0].administeredBy.lastName).toBe("Martinez");
  });

  it("returns 500 when database throws", async () => {
    mockAuth.mockResolvedValue(adminSession());
    mockFindUniqueAnimal.mockResolvedValue({ id: "animal-1" });
    mockFindManyLogs.mockRejectedValue(new Error("DB connection lost"));
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch treatment logs");
    expect(body.detail).toBe("DB connection lost");
  });

  it("queries logs ordered by administeredAt descending", async () => {
    mockAuth.mockResolvedValue(adminSession());
    mockFindUniqueAnimal.mockResolvedValue({ id: "animal-1" });
    mockFindManyLogs.mockResolvedValue([]);
    await GET(makeGet(), CONTEXT);
    expect(mockFindManyLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { animalId: "animal-1" },
        orderBy: { administeredAt: "desc" },
      })
    );
  });
});
