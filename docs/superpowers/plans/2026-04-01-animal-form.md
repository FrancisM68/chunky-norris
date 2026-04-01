# Animal Add/Edit Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the admin add/edit animal form — schema changes, API routes (GET/POST/PATCH), AnimalForm client component, detail and new-animal pages.

**Architecture:** Server Components fetch animal data and pass it as serialized props to `AnimalForm`, a `"use client"` island that handles view/edit toggling, species-driven field visibility, client-side validation, and API submission. POST creates, PATCH updates; both routes validate server-side using a shared `validateAnimalBody` function.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma 7 (schema-per-tenant via `getTenantClient`), Vitest for API route tests, inline styles matching the existing admin UI (DAR green `#2D5A27`).

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `prisma/schema.prisma` | Add `OTHER` to Species enum; add `speciesOther String?` and `notes String?` to Animal |
| Modify | `src/lib/constants.ts` | Add `TERMINAL_STATUSES` constant |
| Modify | `src/lib/display-helpers.ts` | Add `OTHER` to `speciesLabel`; add `disposalMethodLabel` |
| Modify | `src/lib/display-helpers.test.ts` | Tests for new helper entries |
| Create | `src/app/api/admin/animals/validate.ts` | Shared server-side validation (used by POST and PATCH) |
| Modify | `src/app/api/admin/animals/route.ts` | Add POST handler |
| Modify | `src/app/api/admin/animals/route.test.ts` | Add POST tests |
| Create | `src/app/api/admin/animals/[id]/route.ts` | GET and PATCH handlers |
| Create | `src/app/api/admin/animals/[id]/route.test.ts` | Tests for GET and PATCH |
| Create | `src/app/admin/animals/[id]/AnimalForm.tsx` | `"use client"` form island |
| Modify | `src/app/admin/animals/[id]/page.tsx` | Replace stub with Server Component |
| Modify | `src/app/admin/animals/new/page.tsx` | Replace stub with Server Component |
| Modify | `.claude/ROADMAP.md` | Mark feature complete |

---

## Task 1: Schema — add OTHER species, speciesOther, notes

**Files:** `prisma/schema.prisma`

- [ ] **Step 1: Edit the Species enum and Animal model**

In `prisma/schema.prisma`, change the Species enum:

```prisma
enum Species {
  CAT
  DOG
  RABBIT
  FERRET
  OTHER
}
```

In the Animal model, add two fields after `legacyNotes`:

```prisma
  // --- Additional ---
  speciesOther          String?       // Free-text species name when species = OTHER
  notes                 String?       // Behavioural/personality notes for admins
```

- [ ] **Step 2: Regenerate client and push schema**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx prisma generate && npx prisma db push
```

Expected output ends with: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add OTHER species, speciesOther and notes to Animal"
```

---

## Task 2: Constants and display helpers

**Files:** `src/lib/constants.ts`, `src/lib/display-helpers.ts`, `src/lib/display-helpers.test.ts`

- [ ] **Step 1: Write failing tests**

Add the following to `src/lib/display-helpers.test.ts`.

Update the import line at the top:
```typescript
import { speciesLabel, genderLabel, statusLabel, statusPillStyle, disposalMethodLabel } from "./display-helpers";
```

Inside the existing `describe("speciesLabel", ...)` block, add one test:
```typescript
it("returns 'Other' for OTHER", () => expect(speciesLabel("OTHER")).toBe("Other"));
```

After all existing describe blocks, add:
```typescript
describe("disposalMethodLabel", () => {
  it("returns 'Rehomed' for REHOMED", () => expect(disposalMethodLabel("REHOMED")).toBe("Rehomed"));
  it("returns 'Reclaimed' for RECLAIMED", () => expect(disposalMethodLabel("RECLAIMED")).toBe("Reclaimed"));
  it("returns 'Euthanised' for EUTHANISED", () => expect(disposalMethodLabel("EUTHANISED")).toBe("Euthanised"));
  it("returns 'Died in Care' for DIED_IN_CARE", () => expect(disposalMethodLabel("DIED_IN_CARE")).toBe("Died in Care"));
  it("returns 'TNR Returned' for TNR_RETURNED", () => expect(disposalMethodLabel("TNR_RETURNED")).toBe("TNR Returned"));
  it("returns 'Transferred' for TRANSFERRED", () => expect(disposalMethodLabel("TRANSFERRED")).toBe("Transferred"));
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/display-helpers.test.ts --reporter=verbose
```

Expected: 7 new tests fail (`disposalMethodLabel` not exported, `OTHER` not in map).

- [ ] **Step 3: Update constants.ts**

Replace the full content of `src/lib/constants.ts`:

```typescript
export const VALID_RESCUE_SLUGS = ["dar"] as const;

export type RescueSlug = (typeof VALID_RESCUE_SLUGS)[number];

export const TERMINAL_STATUSES = [
  "ADOPTED",
  "RETURNED_TO_OWNER",
  "EUTHANISED",
  "DIED_IN_CARE",
  "TNR_RETURNED",
] as const;

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];
```

- [ ] **Step 4: Update display-helpers.ts**

Add `OTHER` to `speciesLabel` and append `disposalMethodLabel` at the end of `src/lib/display-helpers.ts`:

```typescript
export function speciesLabel(species: string): string {
  const map: Record<string, string> = {
    CAT: "Cat",
    DOG: "Dog",
    RABBIT: "Rabbit",
    FERRET: "Ferret",
    OTHER: "Other",
  };
  return map[species] ?? species;
}
```

```typescript
export function disposalMethodLabel(method: string): string {
  const map: Record<string, string> = {
    REHOMED: "Rehomed",
    RECLAIMED: "Reclaimed",
    EUTHANISED: "Euthanised",
    DIED_IN_CARE: "Died in Care",
    TNR_RETURNED: "TNR Returned",
    TRANSFERRED: "Transferred",
  };
  return map[method] ?? method;
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/lib/display-helpers.test.ts --reporter=verbose
```

Expected: all 30 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/lib/display-helpers.ts src/lib/display-helpers.test.ts
git commit -m "feat: add TERMINAL_STATUSES, OTHER species label, disposalMethodLabel"
```

---

## Task 3: Shared server-side validation

**Files:** `src/app/api/admin/animals/validate.ts`

- [ ] **Step 1: Create validate.ts**

```typescript
import { TERMINAL_STATUSES } from "@/lib/constants";

export interface AnimalBody {
  officialName?: unknown;
  species?: unknown;
  speciesOther?: unknown;
  gender?: unknown;
  intakeDate?: unknown;
  intakeSource?: unknown;
  strayLocation?: unknown;
  status?: unknown;
  departureDate?: unknown;
  disposalMethod?: unknown;
  [key: string]: unknown;
}

/**
 * Validates a request body for animal create or update.
 * Returns a map of field → error message. Empty map = valid.
 */
export function validateAnimalBody(body: AnimalBody): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!body.officialName || typeof body.officialName !== "string" || !body.officialName.trim()) {
    errors.officialName = "Official name is required";
  }
  if (!body.species) {
    errors.species = "Species is required";
  }
  if (body.species === "OTHER" && (!body.speciesOther || !(body.speciesOther as string).trim())) {
    errors.speciesOther = "Please specify the species";
  }
  if (!body.gender) {
    errors.gender = "Gender is required";
  }
  if (!body.intakeDate) {
    errors.intakeDate = "Intake date is required";
  }
  if (!body.intakeSource) {
    errors.intakeSource = "Intake source is required";
  }
  if (
    body.intakeSource === "STRAY" &&
    (!body.strayLocation || !(body.strayLocation as string).trim())
  ) {
    errors.strayLocation = "Stray location is required when intake source is Stray";
  }
  if (!body.status) {
    errors.status = "Status is required";
  }
  if ((TERMINAL_STATUSES as readonly string[]).includes(body.status as string)) {
    if (!body.departureDate) {
      errors.departureDate = "Departure date is required";
    }
    if (!body.disposalMethod) {
      errors.disposalMethod = "Disposal method is required (DoA compliance)";
    }
  }

  return errors;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/animals/validate.ts
git commit -m "feat(api): add shared animal body validation"
```

---

## Task 4: GET and PATCH /api/admin/animals/[id]

**Files:** `src/app/api/admin/animals/[id]/route.ts`, `src/app/api/admin/animals/[id]/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/admin/animals/[id]/route.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run "src/app/api/admin/animals/[id]/route.test.ts" --reporter=verbose
```

Expected: all 9 tests fail (route file does not exist).

- [ ] **Step 3: Implement the route**

Create `src/app/api/admin/animals/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";
import { validateAnimalBody } from "../validate";

type Context = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/animals/[id]
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getTenantClient("dar");

  try {
    const animal = await db.animal.findUnique({ where: { id } });
    if (!animal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(animal);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch animal", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/animals/[id]
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getTenantClient("dar");

  try {
    const existing = await db.animal.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const errors = validateAnimalBody(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });
    }

    const updated = await db.animal.update({
      where: { id },
      data: {
        officialName: body.officialName,
        nickname: body.nickname || null,
        species: body.species,
        speciesOther: body.species === "OTHER" ? (body.speciesOther || null) : null,
        breed: body.breed || null,
        description: body.description || null,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        dobIsEstimate: body.dobIsEstimate ?? false,
        ageAtIntake: body.ageAtIntake || null,
        microchipNumber: body.microchipNumber || null,
        microchipDate: body.microchipDate ? new Date(body.microchipDate) : null,
        intakeDate: new Date(body.intakeDate),
        intakeSource: body.intakeSource,
        strayLocation: body.intakeSource === "STRAY" ? (body.strayLocation || null) : null,
        infoSource: body.infoSource || null,
        darRefNumber: body.darRefNumber || null,
        vetRefNumber: body.vetRefNumber || null,
        vaccinationStatus: body.vaccinationStatus || null,
        v1Date: body.v1Date ? new Date(body.v1Date) : null,
        v2Date: body.v2Date ? new Date(body.v2Date) : null,
        vaccineType: body.vaccineType || null,
        neuteredDate: body.neuteredDate ? new Date(body.neuteredDate) : null,
        neuteredVet: body.neuteredVet || null,
        // Species-specific — only update the fields matching current species,
        // leave the rest untouched (no destructive clearing on species change)
        fivResult: body.species === "CAT" ? (body.fivResult || null) : existing.fivResult,
        felvResult: body.species === "CAT" ? (body.felvResult || null) : existing.felvResult,
        kennelCoughDate:
          body.species === "DOG"
            ? body.kennelCoughDate ? new Date(body.kennelCoughDate) : null
            : existing.kennelCoughDate,
        rabiesDate:
          body.species === "DOG"
            ? body.rabiesDate ? new Date(body.rabiesDate) : null
            : existing.rabiesDate,
        condition: body.species === "DOG" ? (body.condition || null) : existing.condition,
        status: body.status,
        currentLocation: body.currentLocation || null,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        disposalMethod: body.disposalMethod || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update animal", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run "src/app/api/admin/animals/[id]/route.test.ts" --reporter=verbose
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/admin/animals/[id]/route.ts" "src/app/api/admin/animals/[id]/route.test.ts"
git commit -m "feat(api): add GET and PATCH /api/admin/animals/[id]"
```

---

## Task 5: POST /api/admin/animals

**Files:** `src/app/api/admin/animals/route.ts`, `src/app/api/admin/animals/route.test.ts`

- [ ] **Step 1: Write failing tests**

In `src/app/api/admin/animals/route.test.ts`, make three edits:

**Edit 1** — add `mockCreate` to the mock setup (replace the existing mock block):
```typescript
const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    animal: { findMany: mockFindMany, create: mockCreate },
  })),
}));
```

**Edit 2** — add `POST` to the import:
```typescript
import { GET, POST } from "./route";
```

**Edit 3** — add `mockCreate.mockReset()` inside the existing GET `beforeEach`, and append this new describe block at the end of the file:

```typescript
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
```

- [ ] **Step 2: Run tests — verify new ones fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/app/api/admin/animals/route.test.ts --reporter=verbose
```

Expected: 5 new POST tests fail; 8 existing GET tests still pass.

- [ ] **Step 3: Add POST handler to route.ts**

At the top of `src/app/api/admin/animals/route.ts`, add the import:
```typescript
import { validateAnimalBody } from "./validate";
```

Append this handler after the closing `}` of the GET function:

```typescript
// ---------------------------------------------------------------------------
// POST /api/admin/animals
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getTenantClient("dar");

  try {
    const body = await req.json();
    const errors = validateAnimalBody(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });
    }

    const animal = await db.animal.create({
      data: {
        officialName: body.officialName,
        nickname: body.nickname || null,
        species: body.species,
        speciesOther: body.species === "OTHER" ? (body.speciesOther || null) : null,
        breed: body.breed || null,
        description: body.description || null,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        dobIsEstimate: body.dobIsEstimate ?? false,
        ageAtIntake: body.ageAtIntake || null,
        microchipNumber: body.microchipNumber || null,
        microchipDate: body.microchipDate ? new Date(body.microchipDate) : null,
        intakeDate: new Date(body.intakeDate),
        intakeSource: body.intakeSource,
        strayLocation: body.intakeSource === "STRAY" ? (body.strayLocation || null) : null,
        infoSource: body.infoSource || null,
        darRefNumber: body.darRefNumber || null,
        vetRefNumber: body.vetRefNumber || null,
        vaccinationStatus: body.vaccinationStatus || null,
        v1Date: body.v1Date ? new Date(body.v1Date) : null,
        v2Date: body.v2Date ? new Date(body.v2Date) : null,
        vaccineType: body.vaccineType || null,
        neuteredDate: body.neuteredDate ? new Date(body.neuteredDate) : null,
        neuteredVet: body.neuteredVet || null,
        fivResult: body.species === "CAT" ? (body.fivResult || null) : null,
        felvResult: body.species === "CAT" ? (body.felvResult || null) : null,
        kennelCoughDate:
          body.species === "DOG" && body.kennelCoughDate
            ? new Date(body.kennelCoughDate)
            : null,
        rabiesDate:
          body.species === "DOG" && body.rabiesDate ? new Date(body.rabiesDate) : null,
        condition: body.species === "DOG" ? (body.condition || null) : null,
        status: body.status,
        currentLocation: body.currentLocation || null,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        disposalMethod: body.disposalMethod || null,
        notes: body.notes || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: animal.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create animal", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run src/app/api/admin/animals/route.test.ts --reporter=verbose
```

Expected: all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/animals/route.ts src/app/api/admin/animals/route.test.ts
git commit -m "feat(api): add POST /api/admin/animals"
```

---

## Task 6: AnimalForm client component

**Files:** `src/app/admin/animals/[id]/AnimalForm.tsx`

No unit tests — UI interactivity is verified manually. All compliance-critical paths (validation, P0 fields) are covered by the API route tests.

- [ ] **Step 1: Create AnimalForm.tsx**

Create `src/app/admin/animals/[id]/AnimalForm.tsx` with the following content:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TERMINAL_STATUSES } from "@/lib/constants";
import {
  speciesLabel,
  genderLabel,
  statusLabel,
  statusPillStyle,
  disposalMethodLabel,
} from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnimalDetail {
  id: string;
  officialName: string;
  nickname: string | null;
  species: string;
  speciesOther: string | null;
  breed: string | null;
  description: string | null;
  gender: string;
  dateOfBirth: string | null;
  dobIsEstimate: boolean;
  ageAtIntake: string | null;
  microchipNumber: string | null;
  microchipDate: string | null;
  intakeDate: string;
  intakeSource: string;
  strayLocation: string | null;
  infoSource: string | null;
  darRefNumber: string | null;
  vetRefNumber: string | null;
  vaccinationStatus: string | null;
  v1Date: string | null;
  v2Date: string | null;
  vaccineType: string | null;
  neuteredDate: string | null;
  neuteredVet: string | null;
  fivResult: string | null;
  felvResult: string | null;
  kennelCoughDate: string | null;
  rabiesDate: string | null;
  condition: string | null;
  status: string;
  currentLocation: string | null;
  departureDate: string | null;
  disposalMethod: string | null;
  notes: string | null;
  legacyNotes: string | null;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const SPECIES_OPTIONS = ["CAT", "DOG", "RABBIT", "FERRET", "OTHER"] as const;

const GENDER_OPTIONS = [
  { value: "MALE_INTACT", label: "Male / Intact" },
  { value: "MALE_NEUTERED", label: "Male / Neutered" },
  { value: "FEMALE_INTACT", label: "Female / Intact" },
  { value: "FEMALE_NEUTERED", label: "Female / Neutered" },
  { value: "UNKNOWN", label: "Unknown" },
];

const INTAKE_SOURCE_OPTIONS = [
  { value: "STRAY", label: "Stray" },
  { value: "SURRENDER", label: "Surrender" },
  { value: "TNR", label: "TNR" },
  { value: "ABANDONED", label: "Abandoned" },
  { value: "ORPHANED", label: "Orphaned" },
  { value: "RTA", label: "Road Traffic Accident" },
  { value: "POUND", label: "Pound" },
];

const VACCINATION_STATUS_OPTIONS = [
  { value: "NOT_VACCINATED", label: "Not Vaccinated" },
  { value: "V1_ONLY", label: "V1 Only" },
  { value: "V1_AND_V2", label: "V1 and V2" },
  { value: "FULLY_VACCINATED", label: "Fully Vaccinated" },
  { value: "UNKNOWN", label: "Unknown" },
];

const STATUS_OPTIONS = [
  { value: "IN_CARE", label: "In Care" },
  { value: "FOSTERED", label: "Fostered" },
  { value: "ADOPTED", label: "Adopted" },
  { value: "RETURNED_TO_OWNER", label: "Returned to Owner" },
  { value: "EUTHANISED", label: "Euthanised" },
  { value: "DIED_IN_CARE", label: "Died in Care" },
  { value: "TNR_RETURNED", label: "TNR Returned" },
];

const TEST_RESULT_OPTIONS = [
  { value: "POSITIVE", label: "Positive" },
  { value: "NEGATIVE", label: "Negative" },
  { value: "NOT_TESTED", label: "Not Tested" },
];

const CONDITION_OPTIONS = [
  { value: "GOOD", label: "Good" },
  { value: "OK", label: "OK" },
  { value: "POOR", label: "Poor" },
];

const DISPOSAL_METHOD_OPTIONS = [
  { value: "REHOMED", label: "Rehomed" },
  { value: "RECLAIMED", label: "Reclaimed" },
  { value: "EUTHANISED", label: "Euthanised" },
  { value: "DIED_IN_CARE", label: "Died in Care" },
  { value: "TNR_RETURNED", label: "TNR Returned" },
  { value: "TRANSFERRED", label: "Transferred" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE");
}

// ---------------------------------------------------------------------------
// Primitive UI components
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, color: "#374151", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "6px 10px", border: `1px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 5, fontSize: 13, boxSizing: "border-box", backgroundColor: "#fff",
  };
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{msg}</div>;
}

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

function ViewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
      <span style={{ color: value ? "#111827" : "#9ca3af", fontSize: 13 }}>{value || "—"}</span>
    </>
  );
}

function ViewMode({ animal, onEdit }: { animal: AnimalDetail; onEdit: () => void }) {
  const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(animal.status);
  const speciesDisplay =
    animal.species === "OTHER"
      ? `Other — ${animal.speciesOther ?? ""}`
      : speciesLabel(animal.species);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
            {animal.nickname ?? animal.officialName}
          </h1>
          {animal.nickname && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{animal.officialName}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ ...statusPillStyle(animal.status), padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {statusLabel(animal.status)}
          </span>
          <button onClick={onEdit} style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: "#2D5A27", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Edit
          </button>
        </div>
      </div>

      <SectionCard title="Identity">
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "5px 12px" }}>
          <ViewRow label="Species" value={speciesDisplay} />
          <ViewRow label="Gender" value={genderLabel(animal.gender)} />
          <ViewRow label="Breed" value={animal.breed} />
          <ViewRow label="Description" value={animal.description} />
          <ViewRow label="Date of Birth" value={toDisplayDate(animal.dateOfBirth)} />
          <ViewRow label="Age at Intake" value={animal.ageAtIntake} />
          <ViewRow label="Microchip" value={animal.microchipNumber} />
          <ViewRow label="Microchip Date" value={toDisplayDate(animal.microchipDate)} />
        </div>
      </SectionCard>

      <SectionCard title="Intake">
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "5px 12px" }}>
          <ViewRow label="Date" value={toDisplayDate(animal.intakeDate)} />
          <ViewRow label="Source" value={INTAKE_SOURCE_OPTIONS.find(o => o.value === animal.intakeSource)?.label ?? animal.intakeSource} />
          {animal.intakeSource === "STRAY" && <ViewRow label="Location" value={animal.strayLocation} />}
          <ViewRow label="Info Source" value={animal.infoSource} />
          <ViewRow label="DAR Ref" value={animal.darRefNumber} />
          <ViewRow label="Vet Ref" value={animal.vetRefNumber} />
        </div>
      </SectionCard>

      <SectionCard title="Medical">
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "5px 12px" }}>
          <ViewRow label="Vaccination" value={VACCINATION_STATUS_OPTIONS.find(o => o.value === animal.vaccinationStatus)?.label ?? animal.vaccinationStatus} />
          <ViewRow label="V1 Date" value={toDisplayDate(animal.v1Date)} />
          <ViewRow label="V2 Date" value={toDisplayDate(animal.v2Date)} />
          <ViewRow label="Vaccine Type" value={animal.vaccineType} />
          <ViewRow label="Neutered Date" value={toDisplayDate(animal.neuteredDate)} />
          <ViewRow label="Neutered Vet" value={animal.neuteredVet} />
          {animal.species === "CAT" && (
            <>
              <ViewRow label="FIV" value={TEST_RESULT_OPTIONS.find(o => o.value === animal.fivResult)?.label ?? animal.fivResult} />
              <ViewRow label="FeLV" value={TEST_RESULT_OPTIONS.find(o => o.value === animal.felvResult)?.label ?? animal.felvResult} />
            </>
          )}
          {animal.species === "DOG" && (
            <>
              <ViewRow label="Kennel Cough" value={toDisplayDate(animal.kennelCoughDate)} />
              <ViewRow label="Rabies Date" value={toDisplayDate(animal.rabiesDate)} />
              <ViewRow label="Condition" value={CONDITION_OPTIONS.find(o => o.value === animal.condition)?.label ?? animal.condition} />
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Status">
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "5px 12px" }}>
          <ViewRow label="Status" value={statusLabel(animal.status)} />
          <ViewRow label="Location" value={animal.currentLocation} />
          {isTerminal && (
            <>
              <ViewRow label="Departure Date" value={toDisplayDate(animal.departureDate)} />
              <ViewRow label="Disposal Method" value={animal.disposalMethod ? disposalMethodLabel(animal.disposalMethod) : null} />
            </>
          )}
        </div>
      </SectionCard>

      {animal.notes && (
        <SectionCard title="Notes">
          <p style={{ margin: 0, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>{animal.notes}</p>
        </SectionCard>
      )}

      {animal.legacyNotes !== null && (
        <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: "12px 16px", backgroundColor: "#f9fafb" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Legacy Notes — imported record
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", whiteSpace: "pre-wrap" }}>{animal.legacyNotes}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form state helpers
// ---------------------------------------------------------------------------

type FormData = {
  officialName: string; nickname: string; speciesOther: string;
  breed: string; description: string; gender: string;
  dateOfBirth: string; dobIsEstimate: boolean; ageAtIntake: string;
  microchipNumber: string; microchipDate: string; intakeDate: string;
  strayLocation: string; infoSource: string; darRefNumber: string; vetRefNumber: string;
  vaccinationStatus: string; v1Date: string; v2Date: string; vaccineType: string;
  neuteredDate: string; neuteredVet: string; fivResult: string; felvResult: string;
  kennelCoughDate: string; rabiesDate: string; condition: string;
  currentLocation: string; departureDate: string; disposalMethod: string; notes: string;
};

function initForm(a: AnimalDetail | null): FormData {
  return {
    officialName: a?.officialName ?? "",
    nickname: a?.nickname ?? "",
    speciesOther: a?.speciesOther ?? "",
    breed: a?.breed ?? "",
    description: a?.description ?? "",
    gender: a?.gender ?? "",
    dateOfBirth: toDateInput(a?.dateOfBirth),
    dobIsEstimate: a?.dobIsEstimate ?? true,
    ageAtIntake: a?.ageAtIntake ?? "",
    microchipNumber: a?.microchipNumber ?? "",
    microchipDate: toDateInput(a?.microchipDate),
    intakeDate: toDateInput(a?.intakeDate),
    strayLocation: a?.strayLocation ?? "",
    infoSource: a?.infoSource ?? "",
    darRefNumber: a?.darRefNumber ?? "",
    vetRefNumber: a?.vetRefNumber ?? "",
    vaccinationStatus: a?.vaccinationStatus ?? "",
    v1Date: toDateInput(a?.v1Date),
    v2Date: toDateInput(a?.v2Date),
    vaccineType: a?.vaccineType ?? "",
    neuteredDate: toDateInput(a?.neuteredDate),
    neuteredVet: a?.neuteredVet ?? "",
    fivResult: a?.fivResult ?? "",
    felvResult: a?.felvResult ?? "",
    kennelCoughDate: toDateInput(a?.kennelCoughDate),
    rabiesDate: toDateInput(a?.rabiesDate),
    condition: a?.condition ?? "",
    currentLocation: a?.currentLocation ?? "",
    departureDate: toDateInput(a?.departureDate),
    disposalMethod: a?.disposalMethod ?? "",
    notes: a?.notes ?? "",
  };
}

function validateForm(
  form: FormData,
  species: string,
  intakeSource: string,
  status: string
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.officialName.trim()) e.officialName = "Required";
  if (!form.gender) e.gender = "Required";
  if (!form.intakeDate) e.intakeDate = "Required";
  if (!intakeSource) e.intakeSource = "Required";
  if (intakeSource === "STRAY" && !form.strayLocation.trim()) e.strayLocation = "Required";
  if (species === "OTHER" && !form.speciesOther.trim()) e.speciesOther = "Required";
  if (!status) e.status = "Required";
  if ((TERMINAL_STATUSES as readonly string[]).includes(status)) {
    if (!form.departureDate) e.departureDate = "Required";
    if (!form.disposalMethod) e.disposalMethod = "Required (DoA compliance)";
  }
  return e;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnimalForm({ animal }: { animal: AnimalDetail | null }) {
  const router = useRouter();
  const isCreate = animal === null;

  const [isEditing, setIsEditing] = useState(isCreate);
  const [species, setSpecies] = useState(animal?.species ?? "CAT");
  const [intakeSource, setIntakeSource] = useState(animal?.intakeSource ?? "");
  const [status, setStatus] = useState(animal?.status ?? "IN_CARE");
  const [form, setForm] = useState<FormData>(() => initForm(animal));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    if (isCreate) {
      router.push("/admin/animals");
    } else {
      setForm(initForm(animal));
      setSpecies(animal!.species);
      setIntakeSource(animal!.intakeSource);
      setStatus(animal!.status);
      setErrors({});
      setIsEditing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateForm(form, species, intakeSource, status);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);

    const body = { ...form, species, intakeSource, status };
    const url = animal ? `/api/admin/animals/${animal.id}` : "/api/admin/animals";
    const method = animal ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        setErrors(json.fields ?? { _global: json.error ?? "Save failed" });
        setSaving(false);
        return;
      }
      const data = await res.json();
      router.push(`/admin/animals/${isCreate ? data.id : animal!.id}`);
    } catch {
      setErrors({ _global: "Network error — please try again" });
      setSaving(false);
    }
  }

  if (!isEditing && animal) {
    return <ViewMode animal={animal} onEdit={() => setIsEditing(true)} />;
  }

  const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(status);

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
          {isCreate ? "Add Animal" : `Editing: ${animal?.nickname ?? animal?.officialName}`}
        </h1>
        <button type="button" onClick={handleCancel}
          style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>

      {errors._global && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#b91c1c" }}>
          {errors._global}
        </div>
      )}

      {/* Species */}
      <div style={{ background: "#2D5A27", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Species *
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {SPECIES_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setSpecies(s)}
              style={{
                flex: 1, padding: "6px 4px", borderRadius: 4, cursor: "pointer",
                border: species === s ? "2px solid #fff" : "1px solid rgba(255,255,255,.4)",
                backgroundColor: species === s ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.1)",
                color: "#fff", fontSize: 12, fontWeight: species === s ? 700 : 400,
              }}>
              {speciesLabel(s)}
            </button>
          ))}
        </div>
        {species === "OTHER" && (
          <div style={{ marginTop: 8 }}>
            <input type="text" value={form.speciesOther} onChange={(e) => set("speciesOther", e.target.value)}
              placeholder="Please specify *"
              style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: `1px solid ${errors.speciesOther ? "#fca5a5" : "rgba(255,255,255,.4)"}`, backgroundColor: "rgba(255,255,255,.9)", fontSize: 13, boxSizing: "border-box" }} />
            <ErrorMsg msg={errors.speciesOther} />
          </div>
        )}
      </div>

      {/* Identity */}
      <SectionCard title="Identity">
        <FieldRow label="Official Name *">
          <input type="text" value={form.officialName} onChange={(e) => set("officialName", e.target.value)}
            placeholder='"Moneymore Kitten1 - Snoopy"' style={inputStyle(!!errors.officialName)} />
          <ErrorMsg msg={errors.officialName} />
        </FieldRow>
        <FieldRow label="Nickname">
          <input type="text" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} style={inputStyle()} />
        </FieldRow>
        <FieldRow label="Gender *">
          <select value={form.gender} onChange={(e) => set("gender", e.target.value)} style={inputStyle(!!errors.gender)}>
            <option value="">— Select —</option>
            {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ErrorMsg msg={errors.gender} />
        </FieldRow>
        <FieldRow label="Breed">
          <input type="text" value={form.breed} onChange={(e) => set("breed", e.target.value)} style={inputStyle()} />
        </FieldRow>
        <FieldRow label="Description">
          <input type="text" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Coat colour/pattern" style={inputStyle()} />
        </FieldRow>
        <FieldRow label="Date of Birth">
          <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} style={inputStyle()} />
        </FieldRow>
        {form.dateOfBirth && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13, color: "#374151" }}>
            <input type="checkbox" id="dobEst" checked={form.dobIsEstimate} onChange={(e) => set("dobIsEstimate", e.target.checked)} />
            <label htmlFor="dobEst">Date of birth is estimated</label>
          </div>
        )}
        <FieldRow label="Age at Intake">
          <input type="text" value={form.ageAtIntake} onChange={(e) => set("ageAtIntake", e.target.value)} placeholder='"~6 weeks", "2-3 years"' style={inputStyle()} />
        </FieldRow>
        <FieldRow label="Microchip Number">
          <input type="text" value={form.microchipNumber} onChange={(e) => set("microchipNumber", e.target.value)} style={inputStyle()} />
        </FieldRow>
        <FieldRow label="Microchip Date">
          <input type="date" value={form.microchipDate} onChange={(e) => set("microchipDate", e.target.value)} style={inputStyle()} />
        </FieldRow>
      </SectionCard>

      {/* Intake */}
      <SectionCard title="Intake">
        <FieldRow label="Intake Date *">
          <input type="date" value={form.intakeDate} onChange={(e) => set("intakeDate", e.target.value)} style={inputStyle(!!errors.intakeDate)} />
          <ErrorMsg msg={errors.intakeDate} />
        </FieldRow>
        <FieldRow label="Intake Source *">
          <select value={intakeSource}
            onChange={(e) => { setIntakeSource(e.target.value); if (e.target.value !== "STRAY") set("strayLocation", ""); }}
            style={inputStyle(!!errors.intakeSource)}>
            <option value="">— Select —</option>
            {INTAKE_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ErrorMsg msg={errors.intakeSource} />
        </FieldRow>
        {intakeSource === "STRAY" && (
          <FieldRow label="Stray Location *">
            <input type="text" value={form.strayLocation} onChange={(e) => set("strayLocation", e.target.value)} style={inputStyle(!!errors.strayLocation)} />
            <ErrorMsg msg={errors.strayLocation} />
          </FieldRow>
        )}
        <FieldRow label="Info Source">
          <input type="text" value={form.infoSource} onChange={(e) => set("infoSource", e.target.value)} style={inputStyle()} />
        </FieldRow>
        <FieldRow label="DAR Ref Number">
          <input type="text" value={form.darRefNumber} onChange={(e) => set("darRefNumber", e.target.value)} style={inputStyle()} />
        </FieldRow>
        <FieldRow label="Vet Ref Number">
          <input type="text" value={form.vetRefNumber} onChange={(e) => set("vetRefNumber", e.target.value)} style={inputStyle()} />
        </FieldRow>
      </SectionCard>

      {/* Medical */}
      <SectionCard title="Medical">
        <FieldRow label="Vaccination Status">
          <select value={form.vaccinationStatus} onChange={(e) => set("vaccinationStatus", e.target.value)} style={inputStyle()}>
            <option value="">— Select —</option>
            {VACCINATION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="V1 Date"><input type="date" value={form.v1Date} onChange={(e) => set("v1Date", e.target.value)} style={inputStyle()} /></FieldRow>
        <FieldRow label="V2 Date"><input type="date" value={form.v2Date} onChange={(e) => set("v2Date", e.target.value)} style={inputStyle()} /></FieldRow>
        <FieldRow label="Vaccine Type"><input type="text" value={form.vaccineType} onChange={(e) => set("vaccineType", e.target.value)} placeholder='"Nobivac Tri-Cat"' style={inputStyle()} /></FieldRow>
        <FieldRow label="Neutered Date"><input type="date" value={form.neuteredDate} onChange={(e) => set("neuteredDate", e.target.value)} style={inputStyle()} /></FieldRow>
        <FieldRow label="Neutered Vet"><input type="text" value={form.neuteredVet} onChange={(e) => set("neuteredVet", e.target.value)} style={inputStyle()} /></FieldRow>

        {species === "CAT" && (
          <div style={{ background: "#fef9ec", border: "1px solid #fde68a", borderRadius: 6, padding: "10px 12px", marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>Cat-specific</div>
            <FieldRow label="FIV Result">
              <select value={form.fivResult} onChange={(e) => set("fivResult", e.target.value)} style={inputStyle()}>
                <option value="">— Select —</option>
                {TEST_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="FeLV Result">
              <select value={form.felvResult} onChange={(e) => set("felvResult", e.target.value)} style={inputStyle()}>
                <option value="">— Select —</option>
                {TEST_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FieldRow>
          </div>
        )}

        {species === "DOG" && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "10px 12px", marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 8 }}>Dog-specific</div>
            <FieldRow label="Kennel Cough Date"><input type="date" value={form.kennelCoughDate} onChange={(e) => set("kennelCoughDate", e.target.value)} style={inputStyle()} /></FieldRow>
            <FieldRow label="Rabies Date"><input type="date" value={form.rabiesDate} onChange={(e) => set("rabiesDate", e.target.value)} style={inputStyle()} /></FieldRow>
            <FieldRow label="Condition">
              <select value={form.condition} onChange={(e) => set("condition", e.target.value)} style={inputStyle()}>
                <option value="">— Select —</option>
                {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FieldRow>
          </div>
        )}
      </SectionCard>

      {/* Status */}
      <SectionCard title="Status">
        <FieldRow label="Status *">
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle(!!errors.status)}>
            <option value="">— Select —</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ErrorMsg msg={errors.status} />
        </FieldRow>
        <FieldRow label="Current Location">
          <input type="text" value={form.currentLocation} onChange={(e) => set("currentLocation", e.target.value)} placeholder='"Foster Care", "Vet", "DAR HQ"' style={inputStyle()} />
        </FieldRow>

        {isTerminal && (
          <div style={{ background: "#fce7f3", border: "1px solid #f9a8d4", borderRadius: 6, padding: "10px 12px", marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", marginBottom: 8 }}>Departure details — required</div>
            <FieldRow label="Departure Date *">
              <input type="date" value={form.departureDate} onChange={(e) => set("departureDate", e.target.value)} style={inputStyle(!!errors.departureDate)} />
              <ErrorMsg msg={errors.departureDate} />
            </FieldRow>
            <FieldRow label="Disposal Method *">
              <select value={form.disposalMethod} onChange={(e) => set("disposalMethod", e.target.value)} style={inputStyle(!!errors.disposalMethod)}>
                <option value="">— Select —</option>
                {DISPOSAL_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ErrorMsg msg={errors.disposalMethod} />
            </FieldRow>
          </div>
        )}
      </SectionCard>

      {/* Notes */}
      <SectionCard title="Notes">
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
          placeholder='"Afraid of males", "Only pet household", "Not suitable for young children"'
          rows={4}
          style={{ width: "100%", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
      </SectionCard>

      {/* Legacy Notes — read-only */}
      {animal?.legacyNotes != null && (
        <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: "12px 16px", backgroundColor: "#f9fafb", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Legacy Notes — read-only
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", whiteSpace: "pre-wrap" }}>{animal.legacyNotes}</p>
        </div>
      )}

      {/* Submit */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button type="button" onClick={handleCancel}
          style={{ padding: "8px 18px", borderRadius: 6, backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{ padding: "8px 18px", borderRadius: 6, backgroundColor: saving ? "#6b9e65" : "#2D5A27", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving…" : isCreate ? "Add Animal" : "Save Animal"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/animals/[id]/AnimalForm.tsx
git commit -m "feat(ui): implement AnimalForm client component with view/edit toggle"
```

---

## Task 7: Detail page and new animal page

**Files:** `src/app/admin/animals/[id]/page.tsx`, `src/app/admin/animals/new/page.tsx`

- [ ] **Step 1: Replace detail page stub**

Replace the full content of `src/app/admin/animals/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import { AnimalForm, type AnimalDetail } from "./AnimalForm";

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const db = getTenantClient("dar");

  const raw = await db.animal.findUnique({ where: { id } });
  if (!raw) notFound();

  // Serialize Date fields to ISO strings for the Client Component boundary
  const animal: AnimalDetail = {
    id: raw.id,
    officialName: raw.officialName,
    nickname: raw.nickname,
    species: raw.species,
    speciesOther: raw.speciesOther,
    breed: raw.breed,
    description: raw.description,
    gender: raw.gender,
    dateOfBirth: raw.dateOfBirth?.toISOString() ?? null,
    dobIsEstimate: raw.dobIsEstimate,
    ageAtIntake: raw.ageAtIntake,
    microchipNumber: raw.microchipNumber,
    microchipDate: raw.microchipDate?.toISOString() ?? null,
    intakeDate: raw.intakeDate.toISOString(),
    intakeSource: raw.intakeSource,
    strayLocation: raw.strayLocation,
    infoSource: raw.infoSource,
    darRefNumber: raw.darRefNumber,
    vetRefNumber: raw.vetRefNumber,
    vaccinationStatus: raw.vaccinationStatus,
    v1Date: raw.v1Date?.toISOString() ?? null,
    v2Date: raw.v2Date?.toISOString() ?? null,
    vaccineType: raw.vaccineType,
    neuteredDate: raw.neuteredDate?.toISOString() ?? null,
    neuteredVet: raw.neuteredVet,
    fivResult: raw.fivResult,
    felvResult: raw.felvResult,
    kennelCoughDate: raw.kennelCoughDate?.toISOString() ?? null,
    rabiesDate: raw.rabiesDate?.toISOString() ?? null,
    condition: raw.condition,
    status: raw.status,
    currentLocation: raw.currentLocation,
    departureDate: raw.departureDate?.toISOString() ?? null,
    disposalMethod: raw.disposalMethod,
    notes: raw.notes,
    legacyNotes: raw.legacyNotes,
  };

  return <AnimalForm animal={animal} />;
}
```

- [ ] **Step 2: Replace new animal page stub**

Replace the full content of `src/app/admin/animals/new/page.tsx`:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AnimalForm } from "../[id]/AnimalForm";

export default async function NewAnimalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <AnimalForm animal={null} />;
}
```

- [ ] **Step 3: Run the full test suite**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx vitest run --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/animals/[id]/page.tsx src/app/admin/animals/new/page.tsx
git commit -m "feat(admin): implement animal detail and new-animal pages"
```

---

## Task 8: ROADMAP update

**Files:** `.claude/ROADMAP.md`

- [ ] **Step 1: Mark animal form items complete in the v0.2.0 section**

In `.claude/ROADMAP.md`, find the v0.2.0 section. Mark the animal detail/add/edit items as ✅.

- [ ] **Step 2: Commit**

```bash
git add .claude/ROADMAP.md
git commit -m "docs: mark animal add/edit form complete in ROADMAP"
```
