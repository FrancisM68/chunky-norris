import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    tNRRecord: { findUnique: mockFindUnique, update: mockUpdate },
  })),
}));

import { GET, PATCH } from "./route";

const BASE_URL = "http://localhost/api/admin/tnr/tnr-1";

function makeRequest(method: string, body?: object): NextRequest {
  return new NextRequest(BASE_URL, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

function adminSession() {
  return { user: { name: "Lisa", email: "lisa@dar.ie", volunteerId: "v1", roles: ["ADMIN"] } };
}
function fosterSession() {
  return { user: { name: "Jane", email: "jane@dar.ie", volunteerId: "v2", roles: ["FOSTER"] } };
}

const SAMPLE_RECORD = {
  id: "tnr-1",
  locationName: "Moneymore Estate",
  county: "Louth",
  contactName: "Mark Flood",
  contactNumber: "0868469506",
  sex: "FEMALE_INTACT",
  ageEstimate: "Young Adult",
  coatColour: "Black",
  earTipped: true,
  dateIntoDar: new Date("2024-09-13"),
  dateOutOfDar: new Date("2024-09-20"),
  dateNeutered: new Date("2024-09-15"),
  elapsedDays: 7,
  vetHospital: "O'Dowd",
  apRefNumber: "AP-123",
  vaccinationStatus: "VACCINATED",
  vaccineType: "FVRCP",
  fivResult: "NEGATIVE",
  felvResult: "NEGATIVE",
  status: "COMPLETED",
  outcome: "RETURNED_RELEASED",
  notes: null,
};

const context = { params: Promise.resolve({ id: "tnr-1" }) };

describe("GET /api/admin/tnr/[id]", () => {
  beforeEach(() => { mockAuth.mockReset(); mockFindUnique.mockReset(); });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest("GET"), context);
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(fosterSession());
    const res = await GET(makeRequest("GET"), context);
    expect(res.status).toBe(403);
  });

  it("returns 404 when record not found", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await GET(makeRequest("GET"), context);
    expect(res.status).toBe(404);
  });

  it("returns the record on success", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_RECORD);
    const res = await GET(makeRequest("GET"), context);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("tnr-1");
    expect(json.locationName).toBe("Moneymore Estate");
  });
});

describe("PATCH /api/admin/tnr/[id]", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
  });

  const validPatch = {
    locationName: "Moneymore Estate",
    county: "Louth",
    sex: "FEMALE_INTACT",
    dateIntoDar: "2024-09-13",
    status: "IN_PROGRESS",
  };

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest("PATCH", validPatch), context);
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce(fosterSession());
    const res = await PATCH(makeRequest("PATCH", validPatch), context);
    expect(res.status).toBe(403);
  });

  it("returns 404 when record not found", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest("PATCH", validPatch), context);
    expect(res.status).toBe(404);
  });

  it("returns 422 on validation failure", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_RECORD);
    const res = await PATCH(makeRequest("PATCH", { ...validPatch, locationName: "" }), context);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fields.locationName).toBeDefined();
  });

  it("returns updated record on success", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_RECORD);
    mockUpdate.mockResolvedValueOnce({ ...SAMPLE_RECORD, locationName: "New Location" });
    const res = await PATCH(makeRequest("PATCH", { ...validPatch, locationName: "New Location" }), context);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locationName).toBe("New Location");
  });

  it("recalculates elapsedDays on update", async () => {
    mockAuth.mockResolvedValueOnce(adminSession());
    mockFindUnique.mockResolvedValueOnce(SAMPLE_RECORD);
    mockUpdate.mockResolvedValueOnce({ ...SAMPLE_RECORD });
    await PATCH(makeRequest("PATCH", {
      ...validPatch,
      status: "COMPLETED",
      outcome: "RETURNED_RELEASED",
      dateOutOfDar: "2024-09-23",
    }), context);
    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData.elapsedDays).toBe(10);
  });
});
