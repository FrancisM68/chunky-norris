import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

// ---------------------------------------------------------------------------
// Mock tenant client
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn((slug: string) => {
    if (slug === "invalid-slug!") throw new Error(`Invalid rescue slug "${slug}"`);
    if (slug === "unknown") throw new Error(`Unknown rescue slug "unknown"`);
    return {
      treatmentLog: {
        create: mockCreate,
        findMany: mockFindMany,
      },
    };
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost/api/treatment-logs";

function makeRequest(
  method: "GET" | "POST",
  {
    slug,
    body,
    search,
  }: { slug?: string; body?: unknown; search?: string } = {}
): NextRequest {
  const url = search ? `${BASE_URL}?${search}` : BASE_URL;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (slug !== undefined) headers["x-rescue-slug"] = slug;

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const VALID_PAYLOAD = {
  animalId: "animal-1",
  medicationType: "DEWORMING",
  medicationName: "Milbemax",
  dosageAmount: 1,
  dosageUnit: "TABLET",
  administeredAt: "2026-03-27T10:00:00.000Z",
  administeredById: "volunteer-1",
  animalWeightKg: 4.2,
  medicationDisposal: "ADMINISTERED_IN_FULL",
};

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------
describe("POST /api/treatment-logs", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns 400 when x-rescue-slug header is missing", async () => {
    const res = await POST(makeRequest("POST", { body: VALID_PAYLOAD }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/x-rescue-slug/);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest(BASE_URL, {
      method: "POST",
      headers: { "x-rescue-slug": "dar", "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/);
  });

  it("returns 400 listing all missing P0 fields when body is empty", async () => {
    const res = await POST(makeRequest("POST", { slug: "dar", body: {} }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/compliance/i);
    expect(json.missingFields).toEqual(
      expect.arrayContaining([
        "animalId",
        "medicationType",
        "medicationName",
        "dosageAmount",
        "dosageUnit",
        "administeredAt",
        "administeredById",
        "animalWeightKg",
        "medicationDisposal",
      ])
    );
  });

  it("returns 400 listing only the missing P0 fields when some are present", async () => {
    const partial = {
      animalId: "animal-1",
      medicationType: "DEWORMING",
      medicationName: "Milbemax",
      // dosageAmount, dosageUnit, administeredAt, administeredById,
      // animalWeightKg, medicationDisposal intentionally omitted
    };
    const res = await POST(makeRequest("POST", { slug: "dar", body: partial }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.missingFields).toEqual(
      expect.arrayContaining([
        "dosageAmount",
        "dosageUnit",
        "administeredAt",
        "administeredById",
        "animalWeightKg",
        "medicationDisposal",
      ])
    );
    expect(json.missingFields).not.toContain("animalId");
    expect(json.missingFields).not.toContain("medicationName");
  });

  it("returns 400 for an invalid medicationType enum value", async () => {
    const res = await POST(
      makeRequest("POST", {
        slug: "dar",
        body: { ...VALID_PAYLOAD, medicationType: "MAGIC_SPELL" },
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/medicationType/);
  });

  it("returns 400 for an invalid dosageUnit enum value", async () => {
    const res = await POST(
      makeRequest("POST", {
        slug: "dar",
        body: { ...VALID_PAYLOAD, dosageUnit: "BUCKET" },
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/dosageUnit/);
  });

  it("returns 400 for an invalid medicationDisposal enum value", async () => {
    const res = await POST(
      makeRequest("POST", {
        slug: "dar",
        body: { ...VALID_PAYLOAD, medicationDisposal: "THROWN_IN_BIN" },
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/medicationDisposal/);
  });

  it("returns 400 for an unknown rescue slug", async () => {
    const res = await POST(
      makeRequest("POST", { slug: "unknown", body: VALID_PAYLOAD })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown/i);
  });

  it("returns 201 with the created log on success", async () => {
    const created = { id: "log-1", ...VALID_PAYLOAD, createdAt: new Date().toISOString() };
    mockCreate.mockResolvedValueOnce(created);

    const res = await POST(makeRequest("POST", { slug: "dar", body: VALID_PAYLOAD }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("log-1");
    expect(json.medicationName).toBe("Milbemax");
  });

  it("returns 500 when the database create throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await POST(makeRequest("POST", { slug: "dar", body: VALID_PAYLOAD }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to create/);
  });
});

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------
describe("GET /api/treatment-logs", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it("returns 400 when x-rescue-slug header is missing", async () => {
    const res = await GET(makeRequest("GET", { search: "animalId=animal-1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/x-rescue-slug/);
  });

  it("returns 400 when animalId query param is missing", async () => {
    const res = await GET(makeRequest("GET", { slug: "dar" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/animalId/);
  });

  it("returns 400 for an unknown rescue slug", async () => {
    const res = await GET(
      makeRequest("GET", { slug: "unknown", search: "animalId=animal-1" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown/i);
  });

  it("returns 200 with treatment logs ordered newest first", async () => {
    const logs = [
      { id: "log-2", administeredAt: "2026-03-27T12:00:00Z" },
      { id: "log-1", administeredAt: "2026-03-26T10:00:00Z" },
    ];
    mockFindMany.mockResolvedValueOnce(logs);

    const res = await GET(
      makeRequest("GET", { slug: "dar", search: "animalId=animal-1" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe("log-2");
  });

  it("returns 200 with an empty array when the animal has no logs", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await GET(
      makeRequest("GET", { slug: "dar", search: "animalId=no-treatments" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 when the database query throws", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await GET(
      makeRequest("GET", { slug: "dar", search: "animalId=animal-1" })
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to fetch/);
  });
});
