import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock auth
// ---------------------------------------------------------------------------
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// ---------------------------------------------------------------------------
// Mock tenant client
// ---------------------------------------------------------------------------
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    tNRRecord: { findMany: mockFindMany, count: mockCount, create: mockCreate },
  })),
}));

import { GET, POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost/api/admin/tnr";

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

const SAMPLE_RECORDS = [
  {
    id: "tnr-1",
    locationName: "Moneymore Estate Cat1",
    county: "LOUTH",
    dateIntoDar: new Date("2024-09-13"),
    dateOutOfDar: new Date("2024-09-20"),
    status: "COMPLETED",
    outcome: "RETURNED_RELEASED",
    sex: "FEMALE_INTACT",
    fivResult: "NEGATIVE",
    felvResult: "NEGATIVE",
    contactName: "Mark Flood",
    contactNumber: "0868469506",
    vetHospital: "O'Dowd",
    volunteer1: { lastName: "Mcdowell" },
    volunteer2: null,
  },
  {
    id: "tnr-2",
    locationName: "Bolton Street Cat3",
    county: "LOUTH",
    dateIntoDar: new Date("2024-11-01"),
    dateOutOfDar: null,
    status: "IN_PROGRESS",
    outcome: null,
    sex: "MALE_INTACT",
    fivResult: "NOT_TESTED",
    felvResult: "NOT_TESTED",
    contactName: null,
    contactNumber: null,
    vetHospital: null,
    volunteer1: { lastName: "Howell" },
    volunteer2: null,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /api/admin/tnr", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindMany.mockReset();
    mockCount.mockReset();
  });

  it("returns 401 when no session", async () => {
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

  it("returns only IN_PROGRESS and ON_HOLD records by default (scope=in_progress)", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([SAMPLE_RECORDS[1]]);
    mockCount.mockResolvedValueOnce(270);
    mockCount.mockResolvedValueOnce(52);
    mockCount.mockResolvedValueOnce(218);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.records).toHaveLength(1);

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toEqual({ in: ["IN_PROGRESS", "ON_HOLD"] });
  });

  it("returns all records when scope=all", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce(SAMPLE_RECORDS);
    mockCount.mockResolvedValueOnce(270);
    mockCount.mockResolvedValueOnce(52);
    mockCount.mockResolvedValueOnce(218);

    const res = await GET(makeRequest("scope=all"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.records).toHaveLength(2);

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBeUndefined();
  });

  it("filters by locationName when q is provided", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([SAMPLE_RECORDS[0]]);
    mockCount.mockResolvedValueOnce(270);
    mockCount.mockResolvedValueOnce(52);
    mockCount.mockResolvedValueOnce(218);

    const res = await GET(makeRequest("scope=all&q=Moneymore"));
    expect(res.status).toBe(200);

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.locationName).toEqual({
      contains: "Moneymore",
      mode: "insensitive",
    });
  });

  it("returns empty records array when no records match", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);
    mockCount.mockResolvedValueOnce(0);
    mockCount.mockResolvedValueOnce(0);

    const res = await GET(makeRequest("q=nonexistent"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.records).toHaveLength(0);
  });

  it("returns correct stats shape", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindMany.mockResolvedValueOnce(SAMPLE_RECORDS);
    mockCount.mockResolvedValueOnce(270);
    mockCount.mockResolvedValueOnce(52);
    mockCount.mockResolvedValueOnce(218);

    const res = await GET(makeRequest("scope=all"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toEqual({ total: 270, inProgress: 52, completed: 218 });
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

// ---------------------------------------------------------------------------
// POST /api/admin/tnr
// ---------------------------------------------------------------------------

describe("POST /api/admin/tnr", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockCreate.mockReset();
  });

  function makePostRequest(body: object): NextRequest {
    return new NextRequest(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const validBody = {
    locationName: "Moneymore Estate",
    county: "Louth",
    sex: "FEMALE_INTACT",
    dateIntoDar: "2024-09-13",
    status: "IN_PROGRESS",
  };

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(fosterSession());
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 422 when locationName is missing", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    const res = await POST(makePostRequest({ ...validBody, locationName: "" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fields.locationName).toBeDefined();
  });

  it("returns 201 and id on valid create", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockCreate.mockResolvedValueOnce({ id: "tnr-new-1" });
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("tnr-new-1");
  });

  it("passes elapsedDays to create when both dates present", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockCreate.mockResolvedValueOnce({ id: "tnr-new-2" });
    await POST(makePostRequest({
      ...validBody,
      status: "COMPLETED",
      outcome: "RETURNED_RELEASED",
      dateOutOfDar: "2024-09-20",
    }));
    const callData = mockCreate.mock.calls[0][0].data;
    expect(callData.elapsedDays).toBe(7);
  });

  it("returns 500 when DB throws", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockCreate.mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(500);
  });
});
