# TNR List Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin/tnr` stub with a working list page showing 270 TNR records with stats, status filter, search, and 12-column table.

**Architecture:** Three layers — TNR display helpers added to the existing `display-helpers.ts`, a new `GET /api/admin/tnr` route with tests, and a server-component page that fetches directly from the DB (same pattern as `animals/page.tsx`). The page does not use the API route — the route is a separate endpoint for future use.

**Tech Stack:** Next.js App Router (server components), Prisma via `getTenantClient('dar')`, vitest for tests, inline styles matching DAR green `#2D5A27`.

---

## File structure

| File | Action | Role |
|---|---|---|
| `src/lib/display-helpers.ts` | Modify | Add 5 TNR helpers |
| `src/lib/display-helpers.test.ts` | Modify | Add tests for 5 new helpers |
| `src/app/api/admin/tnr/route.ts` | Create | GET handler with scope + search |
| `src/app/api/admin/tnr/route.test.ts` | Create | 7 route tests |
| `src/app/admin/tnr/page.tsx` | Replace | Full list page |

---

### Task 1: TNR display helpers

**Files:**
- Modify: `src/lib/display-helpers.ts`
- Modify: `src/lib/display-helpers.test.ts`

- [ ] **Step 1: Write failing tests for the 5 new helpers**

Append to `src/lib/display-helpers.test.ts`:

```typescript
import {
  // existing imports above...
  tnrStatusLabel,
  tnrStatusPillStyle,
  tnrOutcomeLabel,
  tnrSexLabel,
  fivFelvLabel,
} from "./display-helpers";

describe("tnrStatusLabel", () => {
  it("returns 'In Progress' for IN_PROGRESS", () =>
    expect(tnrStatusLabel("IN_PROGRESS")).toBe("In Progress"));
  it("returns 'Completed' for COMPLETED", () =>
    expect(tnrStatusLabel("COMPLETED")).toBe("Completed"));
  it("returns 'On Hold' for ON_HOLD", () =>
    expect(tnrStatusLabel("ON_HOLD")).toBe("On Hold"));
  it("returns the raw value for unknown status", () =>
    expect(tnrStatusLabel("UNKNOWN_VAL")).toBe("UNKNOWN_VAL"));
});

describe("tnrStatusPillStyle", () => {
  it("returns amber colours for IN_PROGRESS", () => {
    const style = tnrStatusPillStyle("IN_PROGRESS");
    expect(style.backgroundColor).toBe("#fff3e0");
    expect(style.color).toBe("#e65100");
  });
  it("returns green colours for COMPLETED", () => {
    const style = tnrStatusPillStyle("COMPLETED");
    expect(style.backgroundColor).toBe("#f0fdf4");
    expect(style.color).toBe("#15803d");
  });
  it("returns grey colours for ON_HOLD", () => {
    const style = tnrStatusPillStyle("ON_HOLD");
    expect(style.backgroundColor).toBe("#f3f4f6");
    expect(style.color).toBe("#6b7280");
  });
  it("returns fallback grey for unknown status", () => {
    const style = tnrStatusPillStyle("UNKNOWN_VAL");
    expect(style.backgroundColor).toBe("#f3f4f6");
    expect(style.color).toBe("#374151");
  });
});

describe("tnrOutcomeLabel", () => {
  it("returns 'Returned / Released' for RETURNED_RELEASED", () =>
    expect(tnrOutcomeLabel("RETURNED_RELEASED")).toBe("Returned / Released"));
  it("returns 'Rehomed' for REHOMED", () =>
    expect(tnrOutcomeLabel("REHOMED")).toBe("Rehomed"));
  it("returns 'PTS' for EUTHANISED", () =>
    expect(tnrOutcomeLabel("EUTHANISED")).toBe("PTS"));
  it("returns 'Passed Away' for DIED_IN_CARE", () =>
    expect(tnrOutcomeLabel("DIED_IN_CARE")).toBe("Passed Away"));
  it("returns 'Transferred' for TRANSFERRED", () =>
    expect(tnrOutcomeLabel("TRANSFERRED")).toBe("Transferred"));
  it("returns the raw value for unknown outcome", () =>
    expect(tnrOutcomeLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE"));
});

describe("tnrSexLabel", () => {
  it("returns 'Female' for FEMALE_INTACT", () =>
    expect(tnrSexLabel("FEMALE_INTACT")).toBe("Female"));
  it("returns 'Male' for MALE_INTACT", () =>
    expect(tnrSexLabel("MALE_INTACT")).toBe("Male"));
  it("returns 'Unknown' for UNKNOWN", () =>
    expect(tnrSexLabel("UNKNOWN")).toBe("Unknown"));
  it("returns raw value for unexpected input", () =>
    expect(tnrSexLabel("FEMALE_NEUTERED")).toBe("FEMALE_NEUTERED"));
});

describe("fivFelvLabel", () => {
  it("returns '–/–' for NEGATIVE/NEGATIVE", () =>
    expect(fivFelvLabel("NEGATIVE", "NEGATIVE")).toBe("–/–"));
  it("returns '+/–' for POSITIVE/NEGATIVE", () =>
    expect(fivFelvLabel("POSITIVE", "NEGATIVE")).toBe("+/–"));
  it("returns '–/+' for NEGATIVE/POSITIVE", () =>
    expect(fivFelvLabel("NEGATIVE", "POSITIVE")).toBe("–/+"));
  it("returns '+/+' for POSITIVE/POSITIVE", () =>
    expect(fivFelvLabel("POSITIVE", "POSITIVE")).toBe("+/+"));
  it("returns 'n/t' for NOT_TESTED/NOT_TESTED", () =>
    expect(fivFelvLabel("NOT_TESTED", "NOT_TESTED")).toBe("n/t"));
  it("returns '–/n/t' for NEGATIVE/NOT_TESTED", () =>
    expect(fivFelvLabel("NEGATIVE", "NOT_TESTED")).toBe("–/n/t"));
  it("returns '+/n/t' for POSITIVE/NOT_TESTED", () =>
    expect(fivFelvLabel("POSITIVE", "NOT_TESTED")).toBe("+/n/t"));
  it("returns 'n/t/–' for NOT_TESTED/NEGATIVE", () =>
    expect(fivFelvLabel("NOT_TESTED", "NEGATIVE")).toBe("n/t/–"));
  it("returns 'n/t/+' for NOT_TESTED/POSITIVE", () =>
    expect(fivFelvLabel("NOT_TESTED", "POSITIVE")).toBe("n/t/+"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/display-helpers.test.ts
```

Expected: failures on `tnrStatusLabel`, `tnrStatusPillStyle`, `tnrOutcomeLabel`, `tnrSexLabel`, `fivFelvLabel` — all others still pass.

- [ ] **Step 3: Add the 5 helpers to `src/lib/display-helpers.ts`**

Append to the bottom of `src/lib/display-helpers.ts`:

```typescript
export function tnrStatusLabel(status: string): string {
  const map: Record<string, string> = {
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    ON_HOLD: "On Hold",
  };
  return map[status] ?? status;
}

export function tnrStatusPillStyle(status: string): {
  backgroundColor: string;
  color: string;
} {
  const map: Record<string, { backgroundColor: string; color: string }> = {
    IN_PROGRESS: { backgroundColor: "#fff3e0", color: "#e65100" },
    COMPLETED: { backgroundColor: "#f0fdf4", color: "#15803d" },
    ON_HOLD: { backgroundColor: "#f3f4f6", color: "#6b7280" },
  };
  return map[status] ?? { backgroundColor: "#f3f4f6", color: "#374151" };
}

export function tnrOutcomeLabel(outcome: string): string {
  const map: Record<string, string> = {
    RETURNED_RELEASED: "Returned / Released",
    REHOMED: "Rehomed",
    EUTHANISED: "PTS",
    DIED_IN_CARE: "Passed Away",
    TRANSFERRED: "Transferred",
  };
  return map[outcome] ?? outcome;
}

export function tnrSexLabel(sex: string): string {
  const map: Record<string, string> = {
    FEMALE_INTACT: "Female",
    MALE_INTACT: "Male",
    UNKNOWN: "Unknown",
  };
  return map[sex] ?? sex;
}

export function fivFelvLabel(fiv: string, felv: string): string {
  const fmt = (v: string) =>
    v === "POSITIVE" ? "+" : v === "NEGATIVE" ? "–" : "n/t";

  const fivStr = fmt(fiv);
  const felvStr = fmt(felv);

  // Both not tested — compact form
  if (fiv === "NOT_TESTED" && felv === "NOT_TESTED") return "n/t";

  return `${fivStr}/${felvStr}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/display-helpers.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/display-helpers.ts src/lib/display-helpers.test.ts
git commit -m "feat(tnr): add TNR display helpers — status, outcome, sex, FIV/FeLV"
```

---

### Task 2: GET /api/admin/tnr route and tests

**Files:**
- Create: `src/app/api/admin/tnr/route.ts`
- Create: `src/app/api/admin/tnr/route.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/app/api/admin/tnr/route.test.ts`:

```typescript
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

vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    tNRRecord: { findMany: mockFindMany, count: mockCount },
  })),
}));

import { GET } from "./route";

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
    mockCount.mockResolvedValueOnce(270); // total
    mockCount.mockResolvedValueOnce(52);  // inProgress
    mockCount.mockResolvedValueOnce(218); // completed

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/api/admin/tnr/route.test.ts
```

Expected: module not found error (route doesn't exist yet).

- [ ] **Step 3: Implement the route**

Create `src/app/api/admin/tnr/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// GET /api/admin/tnr?scope=in_progress|all&q=searchterm
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "in_progress";
  const q = searchParams.get("q") ?? "";

  const db = getTenantClient("dar");

  try {
    const statusFilter =
      scope === "all"
        ? undefined
        : { in: ["IN_PROGRESS", "ON_HOLD"] as const };

    const locationFilter = q
      ? { locationName: { contains: q, mode: "insensitive" as const } }
      : {};

    const where = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...locationFilter,
    };

    const [records, total, inProgress, completed] = await Promise.all([
      db.tNRRecord.findMany({
        where,
        select: {
          id: true,
          locationName: true,
          county: true,
          dateIntoDar: true,
          dateOutOfDar: true,
          status: true,
          outcome: true,
          sex: true,
          fivResult: true,
          felvResult: true,
          contactName: true,
          contactNumber: true,
          vetHospital: true,
          volunteer1: { select: { lastName: true } },
          volunteer2: { select: { lastName: true } },
        },
        orderBy: { dateIntoDar: "desc" },
      }),
      db.tNRRecord.count(),
      db.tNRRecord.count({ where: { status: { in: ["IN_PROGRESS", "ON_HOLD"] } } }),
      db.tNRRecord.count({ where: { status: "COMPLETED" } }),
    ]);

    return NextResponse.json({
      records,
      stats: { total, inProgress, completed },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch TNR records",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/api/admin/tnr/route.test.ts
```

Expected: 7/7 pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/tnr/route.ts src/app/api/admin/tnr/route.test.ts
git commit -m "feat(tnr): add GET /api/admin/tnr route with scope + search"
```

---

### Task 3: TNR list page

**Files:**
- Replace: `src/app/admin/tnr/page.tsx`

- [ ] **Step 1: Replace the stub with the full page**

Write `src/app/admin/tnr/page.tsx`:

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import {
  tnrStatusLabel,
  tnrStatusPillStyle,
  tnrOutcomeLabel,
  tnrSexLabel,
  fivFelvLabel,
} from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENTINEL_DATE = "1970-01-01";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (d.toISOString().startsWith(SENTINEL_DATE)) return "—";
  return d.toLocaleDateString("en-IE");
}

function volunteerNames(
  v1: { lastName: string } | null,
  v2: { lastName: string } | null
): string {
  const names = [v1?.lastName, v2?.lastName].filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchTnrData(scope: string, q: string) {
  const db = getTenantClient("dar");

  const statusFilter =
    scope === "all"
      ? undefined
      : { in: ["IN_PROGRESS", "ON_HOLD"] as const };

  const locationFilter = q
    ? { locationName: { contains: q, mode: "insensitive" as const } }
    : {};

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...locationFilter,
  };

  const [records, total, inProgress, completed] = await Promise.all([
    db.tNRRecord.findMany({
      where,
      select: {
        id: true,
        locationName: true,
        county: true,
        dateIntoDar: true,
        dateOutOfDar: true,
        status: true,
        outcome: true,
        sex: true,
        fivResult: true,
        felvResult: true,
        contactName: true,
        contactNumber: true,
        vetHospital: true,
        volunteer1: { select: { lastName: true } },
        volunteer2: { select: { lastName: true } },
      },
      orderBy: { dateIntoDar: "desc" },
    }),
    db.tNRRecord.count(),
    db.tNRRecord.count({ where: { status: { in: ["IN_PROGRESS", "ON_HOLD"] } } }),
    db.tNRRecord.count({ where: { status: "COMPLETED" } }),
  ]);

  return { records, stats: { total, inProgress, completed } };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function TNRPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = params.scope ?? "in_progress";
  const q = params.q ?? "";

  const { records, stats } = await fetchTnrData(scope, q);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", marginBottom: 20 }}>
        TNR Records
      </h1>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Total Records", value: stats.total },
          { label: "In Progress", value: stats.inProgress },
          { label: "Completed", value: stats.completed },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              backgroundColor: "#fff",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Scope toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          <a
            href={`/admin/tnr?scope=in_progress${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: scope === "in_progress" ? "#2D5A27" : "#f3f4f6",
              color: scope === "in_progress" ? "#fff" : "#374151",
            }}
          >
            In Progress
          </a>
          <a
            href={`/admin/tnr?scope=all${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: scope === "all" ? "#2D5A27" : "#f3f4f6",
              color: scope === "all" ? "#fff" : "#374151",
            }}
          >
            All Records
          </a>
        </div>

        {/* Search */}
        <form method="GET" action="/admin/tnr" style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="scope" value={scope} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by location..."
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: 13,
              width: 240,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              {[
                "Location",
                "County",
                "Date In",
                "Date Out",
                "Status",
                "Outcome",
                "Sex",
                "FIV/FeLV",
                "Volunteer(s)",
                "Contact",
                "Phone",
                "Vet",
              ].map((col) => (
                <th
                  key={col}
                  style={{ padding: "10px 12px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  style={{ padding: "32px 12px", textAlign: "center", color: "#6b7280" }}
                >
                  No TNR records found.
                </td>
              </tr>
            )}
            {records.map((rec) => (
              <tr key={rec.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 12px", color: "#111827", fontWeight: 500, maxWidth: 220 }}>
                  {rec.locationName}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {rec.county}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {formatDate(rec.dateIntoDar)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {formatDate(rec.dateOutOfDar)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      ...tnrStatusPillStyle(rec.status),
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tnrStatusLabel(rec.status)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {rec.outcome ? tnrOutcomeLabel(rec.outcome) : "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {tnrSexLabel(rec.sex)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {fivFelvLabel(rec.fivResult, rec.felvResult)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {volunteerNames(rec.volunteer1, rec.volunteer2)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {rec.contactName ?? "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {rec.contactNumber ?? "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {rec.vetHospital ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Start the dev server and verify the page**

```bash
npm run dev
```

Open `http://localhost:3000/admin/tnr`. Verify:
- Stats bar shows 3 cards with correct counts
- Default view shows In Progress records only
- "All Records" toggle shows all 270 records
- Search for "Moneymore" returns matching rows
- Status pills are correctly coloured
- FIV/FeLV column shows compact format

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/tnr/page.tsx
git commit -m "feat(tnr): build TNR list page with stats, filter, and 12-column table"
```
