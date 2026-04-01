import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    animal: { findUnique: mockFindUnique, update: mockUpdate },
  })),
}));

import { GET, PATCH } from "./route";

const BASE_URL = "http://localhost/api/admin/animals/animal-1";
const CONTEXT = { params: Promise.resolve({ id: "animal-1" }) };

function makeGet(): NextRequest {
  return new NextRequest(BASE_URL, { method: "GET" });
}
function makePatch(body: object): NextRequest {
  return new NextRequest(BASE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function adminSession() {
  return { user: { name: "Lisa", email: "lisa@dar.ie", volunteerId: "v1", roles: ["ADMIN"] } };
}
function fosterSession() {
  return { user: { name: "Jane", email: "jane@dar.ie", volunteerId: "v2", roles: ["FOSTER"] } };
}

const SAMPLE_ANIMAL = {
  id: "animal-1",
  officialName: "Moneymore Kitten1 - Snoopy",
  nickname: "Snoopy",
  species: "CAT",
  speciesOther: null,
  breed: "DSH",
  description: null,
  gender: "MALE_NEUTERED",
  dateOfBirth: new Date("2025-11-01"),
  dobIsEstimate: true,
  ageAtIntake: null,
  microchipNumber: null,
  microchipDate: null,
  intakeDate: new Date("2026-01-15"),
  intakeSource: "STRAY",
  strayLocation: "Moneymore Estate",
  infoSource: null,
  darRefNumber: null,
  vetRefNumber: null,
  vaccinationStatus: "V1_ONLY",
  v1Date: new Date("2026-01-20"),
  v2Date: null,
  vaccineType: null,
  neuteredDate: null,
  neuteredVet: null,
  fivResult: "NEGATIVE",
  felvResult: "NEGATIVE",
  kennelCoughDate: null,
  rabiesDate: null,
  condition: null,
  status: "FOSTERED",
  currentLocation: "Foster Care",
  departureDate: null,
  disposalMethod: null,
  totalDaysInCare: null,
  notes: null,
  legacyNotes: null,
  addedById: null,
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-01-15"),
};

const VALID_PATCH_BODY = {
  officialName: "Moneymore Kitten1 - Snoopy",
  species: "CAT",
  gender: "MALE_NEUTERED",
  intakeDate: "2026-01-15",
  intakeSource: "STRAY",
  strayLocation: "Moneymore Estate",
  status: "FOSTERED",
};

describe("GET /api/admin/animals/[id]", () => {
  beforeEach(() => { mockAuth.mockReset(); mockFindUnique.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(fosterSession());
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(403);
  });

  it("returns 404 when animal not found", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(404);
  });

  it("returns 200 with animal data", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_ANIMAL);
    const res = await GET(makeGet(), CONTEXT);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("animal-1");
    expect(json.species).toBe("CAT");
  });
});

describe("PATCH /api/admin/animals/[id]", () => {
  beforeEach(() => { mockAuth.mockReset(); mockFindUnique.mockReset(); mockUpdate.mockReset(); });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makePatch(VALID_PATCH_BODY), CONTEXT);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(fosterSession());
    const res = await PATCH(makePatch(VALID_PATCH_BODY), CONTEXT);
    expect(res.status).toBe(403);
  });

  it("returns 404 when animal not found", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makePatch(VALID_PATCH_BODY), CONTEXT);
    expect(res.status).toBe(404);
  });

  it("returns 422 when required fields are missing", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_ANIMAL);
    const res = await PATCH(makePatch({ officialName: "" }), CONTEXT);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fields.officialName).toBeDefined();
  });

  it("returns 422 when terminal status missing departureDate and disposalMethod", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_ANIMAL);
    const res = await PATCH(makePatch({ ...VALID_PATCH_BODY, status: "ADOPTED" }), CONTEXT);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fields.departureDate).toBeDefined();
    expect(json.fields.disposalMethod).toBeDefined();
  });

  it("returns 200 on valid update", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_ANIMAL);
    mockUpdate.mockResolvedValueOnce({ ...SAMPLE_ANIMAL, nickname: "Snoop" });
    const res = await PATCH(makePatch({ ...VALID_PATCH_BODY, nickname: "Snoop" }), CONTEXT);
    expect(res.status).toBe(200);
  });
});
