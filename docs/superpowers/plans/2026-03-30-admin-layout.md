# Admin Shell & Animal Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the back-office admin shell with a fixed sidebar, role-guarded layout, and a searchable/filterable animal register as the first real page.

**Architecture:** A Next.js App Router layout at `src/app/admin/layout.tsx` provides the admin chrome (sidebar + header) and redirects non-admin users to `/foster`. The animal list page is a Server Component that queries Prisma directly (no HTTP round-trip). An API route at `src/app/api/admin/animals/route.ts` is provided for external/client-side use and is tested with Vitest.

**Tech Stack:** Next.js 15 (App Router, Server Components), Prisma 7, next-auth 5 beta, Vitest, TypeScript

---

### Task 1: Create the Sidebar component

**Files:**
- Create: `src/components/admin/Sidebar.tsx`

- [ ] **Step 1: Create the `src/components/admin` directory and Sidebar component**

Create `src/components/admin/Sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/admin/animals", label: "Animals", icon: "\uD83D\uDC3E" },
  { href: "/admin/treatments", label: "Treatments", icon: "\uD83D\uDC8A" },
  { href: "/admin/tnr", label: "TNR Records", icon: "\uD83D\uDC31" },
  { href: "/admin/volunteers", label: "Volunteers", icon: "\uD83D\uDC65" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        backgroundColor: "#2D5A27",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: "24px 16px 16px",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        \uD83D\uDC3E ChunkyNorris
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: isActive ? "#fff" : "transparent",
                color: isActive ? "#2D5A27" : "#fff",
                transition: "background-color 0.15s",
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out button */}
      <div style={{ padding: "16px" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.3)",
            backgroundColor: "transparent",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors referencing `Sidebar.tsx` (there may be unrelated pre-existing errors).

- [ ] **Step 3: Commit**

```
git add src/components/admin/Sidebar.tsx && git commit -m "feat(admin): add Sidebar nav component with DAR green branding"
```

---

### Task 2: Create the admin layout with role guard

**Files:**
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create `src/app/admin/layout.tsx`**

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user.roles.includes("ADMIN")) {
    redirect("/foster");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <header
          style={{
            height: 48,
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 24px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#fff",
            fontSize: 14,
            color: "#374151",
          }}
        >
          <span>{session.user.name}</span>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 3: Commit**

```
git add src/app/admin/layout.tsx && git commit -m "feat(admin): add admin layout with role guard and header"
```

---

### Task 3: Create the admin index redirect and stub pages

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/animals/new/page.tsx`
- Create: `src/app/admin/treatments/page.tsx`
- Create: `src/app/admin/tnr/page.tsx`
- Create: `src/app/admin/volunteers/page.tsx`
- Create: `src/app/admin/animals/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/admin/page.tsx` (redirect to animals)**

```tsx
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/admin/animals");
}
```

- [ ] **Step 2: Create stub pages**

Create `src/app/admin/animals/new/page.tsx`:

```tsx
export default function NewAnimalPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>
        Add Animal
      </h1>
      <p style={{ marginTop: 16, color: "#6b7280" }}>Coming soon</p>
    </div>
  );
}
```

Create `src/app/admin/animals/[id]/page.tsx`:

```tsx
export default function AnimalDetailPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>
        Animal Detail
      </h1>
      <p style={{ marginTop: 16, color: "#6b7280" }}>Coming soon</p>
    </div>
  );
}
```

Create `src/app/admin/treatments/page.tsx`:

```tsx
export default function TreatmentsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>
        Treatments
      </h1>
      <p style={{ marginTop: 16, color: "#6b7280" }}>Coming soon</p>
    </div>
  );
}
```

Create `src/app/admin/tnr/page.tsx`:

```tsx
export default function TNRPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>
        TNR Records
      </h1>
      <p style={{ marginTop: 16, color: "#6b7280" }}>Coming soon</p>
    </div>
  );
}
```

Create `src/app/admin/volunteers/page.tsx`:

```tsx
export default function VolunteersPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>
        Volunteers
      </h1>
      <p style={{ marginTop: 16, color: "#6b7280" }}>Coming soon</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify all files compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 4: Commit**

```
git add src/app/admin/page.tsx src/app/admin/animals/new/page.tsx src/app/admin/animals/\[id\]/page.tsx src/app/admin/treatments/page.tsx src/app/admin/tnr/page.tsx src/app/admin/volunteers/page.tsx && git commit -m "feat(admin): add index redirect and stub pages for treatments, tnr, volunteers, animal detail, new animal"
```

---

### Task 4: Write failing tests for the admin animals API route

**Files:**
- Create: `src/app/api/admin/animals/route.test.ts`

- [ ] **Step 1: Write the test file**

Create `src/app/api/admin/animals/route.test.ts`:

```ts
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

vi.mock("@/lib/tenant", () => ({
  getTenantClient: vi.fn(() => ({
    animal: {
      findMany: mockFindMany,
    },
  })),
}));

// ---------------------------------------------------------------------------
// Import the handler AFTER mocks are registered
// ---------------------------------------------------------------------------
import { GET } from "./route";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/admin/animals/route.test.ts`

Expected: FAIL — the test file cannot import `./route` because the file does not exist yet.

- [ ] **Step 3: Commit the failing tests**

```
git add src/app/api/admin/animals/route.test.ts && git commit -m "test(admin): add failing tests for GET /api/admin/animals"
```

---

### Task 5: Implement the admin animals API route

**Files:**
- Create: `src/app/api/admin/animals/route.ts`

- [ ] **Step 1: Create `src/app/api/admin/animals/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInCare(intakeDate: Date, departureDate: Date | null): number {
  const end = departureDate ?? new Date();
  return Math.floor(
    (end.getTime() - new Date(intakeDate).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/animals?scope=in_care|all&q=searchterm
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Parse query params ---
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "in_care";
  const q = searchParams.get("q") ?? "";

  // --- Query ---
  const db = getTenantClient("dar");

  try {
    const animals = await db.animal.findMany({
      where: {
        ...(scope === "all"
          ? {}
          : { status: { in: ["IN_CARE", "FOSTERED"] } }),
        ...(q
          ? {
              OR: [
                { officialName: { contains: q, mode: "insensitive" } },
                { nickname: { contains: q, mode: "insensitive" } },
                {
                  fosterAssignments: {
                    some: {
                      isActive: true,
                      foster: {
                        OR: [
                          {
                            firstName: { contains: q, mode: "insensitive" },
                          },
                          {
                            lastName: { contains: q, mode: "insensitive" },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        officialName: true,
        nickname: true,
        species: true,
        status: true,
        breed: true,
        gender: true,
        intakeDate: true,
        departureDate: true,
        fosterAssignments: {
          where: { isActive: true },
          select: {
            foster: { select: { firstName: true, lastName: true } },
          },
          take: 1,
        },
      },
      orderBy: { intakeDate: "desc" },
    });

    const rows = animals.map((animal) => ({
      id: animal.id,
      officialName: animal.officialName,
      nickname: animal.nickname,
      species: animal.species,
      status: animal.status,
      breed: animal.breed,
      gender: animal.gender,
      intakeDate: animal.intakeDate,
      departureDate: animal.departureDate,
      fosterName:
        animal.fosterAssignments.length > 0
          ? `${animal.fosterAssignments[0].foster.firstName} ${animal.fosterAssignments[0].foster.lastName}`
          : null,
      daysInCare: daysInCare(animal.intakeDate, animal.departureDate),
    }));

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch animals",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- src/app/api/admin/animals/route.test.ts`

Expected: PASS (all 7 tests green)

- [ ] **Step 3: Commit**

```
git add src/app/api/admin/animals/route.ts && git commit -m "feat(admin): implement GET /api/admin/animals with scope and search filtering"
```

---

### Task 6: Add display helper functions

**Files:**
- Create: `src/lib/display-helpers.ts`
- Create: `src/lib/display-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/display-helpers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { speciesLabel, genderLabel, statusLabel, statusPillStyle } from "./display-helpers";

describe("speciesLabel", () => {
  it("returns 'Cat' for CAT", () => expect(speciesLabel("CAT")).toBe("Cat"));
  it("returns 'Dog' for DOG", () => expect(speciesLabel("DOG")).toBe("Dog"));
  it("returns 'Rabbit' for RABBIT", () => expect(speciesLabel("RABBIT")).toBe("Rabbit"));
  it("returns 'Ferret' for FERRET", () => expect(speciesLabel("FERRET")).toBe("Ferret"));
});

describe("genderLabel", () => {
  it("returns 'M/N' for MALE_NEUTERED", () => expect(genderLabel("MALE_NEUTERED")).toBe("M/N"));
  it("returns 'F/N' for FEMALE_NEUTERED", () => expect(genderLabel("FEMALE_NEUTERED")).toBe("F/N"));
  it("returns 'M/I' for MALE_INTACT", () => expect(genderLabel("MALE_INTACT")).toBe("M/I"));
  it("returns 'F/I' for FEMALE_INTACT", () => expect(genderLabel("FEMALE_INTACT")).toBe("F/I"));
  it("returns '?' for UNKNOWN", () => expect(genderLabel("UNKNOWN")).toBe("?"));
});

describe("statusLabel", () => {
  it("returns 'In Care' for IN_CARE", () => expect(statusLabel("IN_CARE")).toBe("In Care"));
  it("returns 'Fostered' for FOSTERED", () => expect(statusLabel("FOSTERED")).toBe("Fostered"));
  it("returns 'Adopted' for ADOPTED", () => expect(statusLabel("ADOPTED")).toBe("Adopted"));
  it("returns 'Returned to Owner' for RETURNED_TO_OWNER", () =>
    expect(statusLabel("RETURNED_TO_OWNER")).toBe("Returned to Owner"));
  it("returns 'Euthanised' for EUTHANISED", () =>
    expect(statusLabel("EUTHANISED")).toBe("Euthanised"));
  it("returns 'Died in Care' for DIED_IN_CARE", () =>
    expect(statusLabel("DIED_IN_CARE")).toBe("Died in Care"));
  it("returns 'TNR Returned' for TNR_RETURNED", () =>
    expect(statusLabel("TNR_RETURNED")).toBe("TNR Returned"));
});

describe("statusPillStyle", () => {
  it("returns orange colours for IN_CARE", () => {
    const style = statusPillStyle("IN_CARE");
    expect(style.backgroundColor).toBe("#fff3e0");
    expect(style.color).toBe("#e65100");
  });

  it("returns green colours for FOSTERED", () => {
    const style = statusPillStyle("FOSTERED");
    expect(style.backgroundColor).toBe("#e8f5e9");
    expect(style.color).toBe("#2D5A27");
  });

  it("returns blue colours for ADOPTED", () => {
    const style = statusPillStyle("ADOPTED");
    expect(style.backgroundColor).toBe("#e3f2fd");
    expect(style.color).toBe("#1565c0");
  });

  it("returns purple colours for RETURNED_TO_OWNER", () => {
    const style = statusPillStyle("RETURNED_TO_OWNER");
    expect(style.backgroundColor).toBe("#f3e5f5");
    expect(style.color).toBe("#6a1b9a");
  });

  it("returns red colours for EUTHANISED", () => {
    const style = statusPillStyle("EUTHANISED");
    expect(style.backgroundColor).toBe("#fce4ec");
    expect(style.color).toBe("#b71c1c");
  });

  it("returns red colours for DIED_IN_CARE", () => {
    const style = statusPillStyle("DIED_IN_CARE");
    expect(style.backgroundColor).toBe("#fce4ec");
    expect(style.color).toBe("#b71c1c");
  });

  it("returns light-green colours for TNR_RETURNED", () => {
    const style = statusPillStyle("TNR_RETURNED");
    expect(style.backgroundColor).toBe("#f1f8e9");
    expect(style.color).toBe("#558b2f");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/display-helpers.test.ts`

Expected: FAIL — cannot resolve `./display-helpers`

- [ ] **Step 3: Write the implementation**

Create `src/lib/display-helpers.ts`:

```ts
// ---------------------------------------------------------------------------
// Display helpers for enum values in the admin UI.
// Pure functions — no side effects, no database access.
// ---------------------------------------------------------------------------

export function speciesLabel(species: string): string {
  const map: Record<string, string> = {
    CAT: "Cat",
    DOG: "Dog",
    RABBIT: "Rabbit",
    FERRET: "Ferret",
  };
  return map[species] ?? species;
}

export function genderLabel(gender: string): string {
  const map: Record<string, string> = {
    MALE_INTACT: "M/I",
    MALE_NEUTERED: "M/N",
    FEMALE_INTACT: "F/I",
    FEMALE_NEUTERED: "F/N",
    UNKNOWN: "?",
  };
  return map[gender] ?? gender;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    IN_CARE: "In Care",
    FOSTERED: "Fostered",
    ADOPTED: "Adopted",
    RETURNED_TO_OWNER: "Returned to Owner",
    EUTHANISED: "Euthanised",
    DIED_IN_CARE: "Died in Care",
    TNR_RETURNED: "TNR Returned",
  };
  return map[status] ?? status;
}

export function statusPillStyle(status: string): {
  backgroundColor: string;
  color: string;
} {
  const map: Record<string, { backgroundColor: string; color: string }> = {
    IN_CARE: { backgroundColor: "#fff3e0", color: "#e65100" },
    FOSTERED: { backgroundColor: "#e8f5e9", color: "#2D5A27" },
    ADOPTED: { backgroundColor: "#e3f2fd", color: "#1565c0" },
    RETURNED_TO_OWNER: { backgroundColor: "#f3e5f5", color: "#6a1b9a" },
    EUTHANISED: { backgroundColor: "#fce4ec", color: "#b71c1c" },
    DIED_IN_CARE: { backgroundColor: "#fce4ec", color: "#b71c1c" },
    TNR_RETURNED: { backgroundColor: "#f1f8e9", color: "#558b2f" },
  };
  return map[status] ?? { backgroundColor: "#f3f4f6", color: "#374151" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/display-helpers.test.ts`

Expected: PASS (all 19 tests green)

- [ ] **Step 5: Commit**

```
git add src/lib/display-helpers.ts src/lib/display-helpers.test.ts && git commit -m "feat(admin): add display helper functions for species, gender, status labels and pill styles"
```

---

### Task 7: Build the animal list page

**Files:**
- Create: `src/app/admin/animals/page.tsx`

This task depends on Tasks 5 and 6 being complete — the page calls `getTenantClient` directly (same pattern as the API route) and uses the display helpers.

- [ ] **Step 1: Create `src/app/admin/animals/page.tsx`**

```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import {
  speciesLabel,
  genderLabel,
  statusLabel,
  statusPillStyle,
} from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnimalRow {
  id: string;
  officialName: string;
  nickname: string | null;
  species: string;
  status: string;
  breed: string | null;
  gender: string;
  intakeDate: Date;
  departureDate: Date | null;
  fosterName: string | null;
  daysInCare: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInCare(intakeDate: Date, departureDate: Date | null): number {
  const end = departureDate ?? new Date();
  return Math.floor(
    (end.getTime() - new Date(intakeDate).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchAnimals(scope: string, q: string): Promise<AnimalRow[]> {
  const db = getTenantClient("dar");

  const animals = await db.animal.findMany({
    where: {
      ...(scope === "all"
        ? {}
        : { status: { in: ["IN_CARE", "FOSTERED"] } }),
      ...(q
        ? {
            OR: [
              { officialName: { contains: q, mode: "insensitive" as const } },
              { nickname: { contains: q, mode: "insensitive" as const } },
              {
                fosterAssignments: {
                  some: {
                    isActive: true,
                    foster: {
                      OR: [
                        { firstName: { contains: q, mode: "insensitive" as const } },
                        { lastName: { contains: q, mode: "insensitive" as const } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      officialName: true,
      nickname: true,
      species: true,
      status: true,
      breed: true,
      gender: true,
      intakeDate: true,
      departureDate: true,
      fosterAssignments: {
        where: { isActive: true },
        select: {
          foster: { select: { firstName: true, lastName: true } },
        },
        take: 1,
      },
    },
    orderBy: { intakeDate: "desc" },
  });

  return animals.map((animal) => ({
    id: animal.id,
    officialName: animal.officialName,
    nickname: animal.nickname,
    species: animal.species,
    status: animal.status,
    breed: animal.breed,
    gender: animal.gender,
    intakeDate: animal.intakeDate,
    departureDate: animal.departureDate,
    fosterName:
      animal.fosterAssignments.length > 0
        ? `${animal.fosterAssignments[0].foster.firstName} ${animal.fosterAssignments[0].foster.lastName}`
        : null,
    daysInCare: daysInCare(animal.intakeDate, animal.departureDate),
  }));
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = params.scope ?? "in_care";
  const q = params.q ?? "";

  const animals = await fetchAnimals(scope, q);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", marginBottom: 20 }}>
        Animals
      </h1>

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
        {/* Left: scope toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          <Link
            href="/admin/animals?scope=in_care"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: scope === "in_care" ? "#2D5A27" : "#f3f4f6",
              color: scope === "in_care" ? "#fff" : "#374151",
            }}
          >
            In Care
          </Link>
          <Link
            href="/admin/animals?scope=all"
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
            All Animals
          </Link>
        </div>

        {/* Right: search + add button */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <form method="GET" action="/admin/animals" style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="scope" value={scope} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name or foster..."
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
          <Link
            href="/admin/animals/new"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: "#2D5A27",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            + Add Animal
          </Link>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #e5e7eb",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Name</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Species</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Status</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Foster</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Intake</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Breed</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Gender</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Days in Care</th>
            </tr>
          </thead>
          <tbody>
            {animals.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "32px 12px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No animals found.
                </td>
              </tr>
            )}
            {animals.map((animal) => (
              <tr
                key={animal.id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer",
                }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    href={`/admin/animals/${animal.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontWeight: 600, color: "#111827" }}>
                      {animal.nickname ?? animal.officialName}
                    </div>
                    {animal.nickname && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        {animal.officialName}
                      </div>
                    )}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {speciesLabel(animal.species)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      ...statusPillStyle(animal.status),
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-block",
                    }}
                  >
                    {statusLabel(animal.status)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {animal.fosterName ?? "\u2014"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {new Date(animal.intakeDate).toLocaleDateString("en-IE")}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {animal.breed ?? "\u2014"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {genderLabel(animal.gender)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {animal.daysInCare}
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

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No new errors referencing `animals/page.tsx`.

- [ ] **Step 3: Commit**

```
git add src/app/admin/animals/page.tsx && git commit -m "feat(admin): add animal list page with search, scope toggle, and status pills"
```

---

### Task 8: Run full test suite and verify build

**Files:**
- No new files

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: All tests pass, including the new tests in `src/app/api/admin/animals/route.test.ts` and `src/lib/display-helpers.test.ts`.

- [ ] **Step 2: Verify the project builds**

Run: `npm run build 2>&1 | tail -20`

Expected: Build succeeds. The admin pages compile as Server Components. The Sidebar compiles as a Client Component.

- [ ] **Step 3: Fix any build errors (if needed)**

If TypeScript or build errors appear, fix them in the relevant files and re-run `npm run build`.

- [ ] **Step 4: Final commit (only if fixes were needed)**

```
git add -A && git commit -m "fix(admin): resolve build errors in admin shell"
```
