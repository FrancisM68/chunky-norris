# Admin Layout + Animal List — Design Spec

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this spec task-by-task.

**Goal:** Build the ChunkyNorris back-office admin shell with a fixed sidebar and a searchable, filterable animal register as the first page.

**In scope (v0.2.0 start):**
- Admin shell: sidebar, header, route layout, role guard
- Animal list page with search and In Care / All Animals toggle
- API route backing the list

**Out of scope:**
- Animal detail / edit page (follow-on)
- Treatment Logs, TNR, Volunteers pages (stubs only)
- Adoptions, Home Checks (v0.5.0)

---

## Architecture

Next.js App Router. `src/app/admin/` has a shared `layout.tsx` that renders the sidebar and header. Each section is a separate route under that layout. Pages are Server Components — data fetched server-side, no client loading spinners on the list view.

The existing RBAC middleware already blocks unauthenticated users from `/admin`. The admin `layout.tsx` adds a second check: if the session role is not `ADMIN`, redirect to `/foster`.

---

## File Structure

| Path | Purpose |
|------|---------|
| `src/app/admin/layout.tsx` | Sidebar + header shell, role guard |
| `src/app/admin/page.tsx` | Redirects `/admin` → `/admin/animals` |
| `src/app/admin/animals/page.tsx` | Animal list (Server Component) |
| `src/app/api/admin/animals/route.ts` | GET with scope + search params |
| `src/components/admin/Sidebar.tsx` | Nav sidebar (Client Component for active state) |

---

## Sidebar

- Fixed left sidebar, 220px wide, DAR green (`#2D5A27`)
- Top: 🐾 ChunkyNorris wordmark
- Nav items (icon + label, one per section):
  - 🐾 Animals → `/admin/animals`
  - 💊 Treatments → `/admin/treatments`
  - 🐱 TNR Records → `/admin/tnr`
  - 👥 Volunteers → `/admin/volunteers`
- Active item: white background highlight, full width
- Bottom: Sign out link (calls Auth.js `signOut`, redirects to `/login`)
- No collapse behaviour — always visible, always labelled

`Sidebar` is a Client Component (`"use client"`) so it can use `usePathname()` to determine the active item. The layout itself stays a Server Component.

---

## Admin Layout

`src/app/admin/layout.tsx`:
- Server Component
- Calls `auth()` from `src/auth.ts` to get the session
- If no session or role is not `ADMIN`: `redirect("/foster")`
- Renders: `<div style="display:flex">` with `<Sidebar />` on the left and `<main>` on the right
- Thin header bar inside `<main>`: right-aligned logged-in user's name. Each page renders its own `<h1>` page title — the layout does not manage titles.

---

## Animal List Page

`src/app/admin/animals/page.tsx` — Server Component.

Accepts `searchParams`: `{ scope?: "in_care" | "all", q?: string }`.

Fetches from `GET /api/admin/animals` with those params, renders the table.

### Toolbar (above table)

- Left: toggle buttons — **In Care** (default) / **All Animals**
  - Implemented as links that set `?scope=` in the URL (no client state needed)
- Right: search input (text field, `?q=` param) + **Add Animal** button (links to `/admin/animals/new` — stub for now)

### Table columns (in order)

| Column | Source | Notes |
|--------|--------|-------|
| Name | `nickname` (bold) + `officialName` (small, below) | — |
| Species | `species` enum | Display as "Cat", "Dog", "Rabbit", "Ferret" |
| Status | `status` enum | Coloured pill (see below) |
| Foster | Current active foster's full name | `—` if unassigned |
| Intake | `intakeDate` | Formatted as "30 Mar 2026" |
| Breed | `breed` | Plain text, `—` if null |
| Gender | `gender` enum | Abbreviated: "M·N", "F·N", "M·I", "F·I", "?" |
| Days in Care | Calculated | `today − intakeDate` in days; if `departureDate` set, use that instead |

**Status pill colours:**

| Status | Background | Text |
|--------|-----------|------|
| IN_CARE | `#fff3e0` | `#e65100` |
| FOSTERED | `#e8f5e9` | `#2D5A27` |
| ADOPTED | `#e3f2fd` | `#1565c0` |
| RETURNED_TO_OWNER | `#f3e5f5` | `#6a1b9a` |
| EUTHANISED / DIED_IN_CARE | `#fce4ec` | `#b71c1c` |
| TNR_RETURNED | `#f1f8e9` | `#558b2f` |

Clicking a row navigates to `/admin/animals/[id]` (detail/edit — not built yet, stub page is fine for now).

---

## API Route — GET /api/admin/animals

`src/app/api/admin/animals/route.ts`

### Auth + DB

Check session via `auth()`. Return 401 if no session; return 403 if role is not `ADMIN`.

Use `getTenantClient("dar")` for the Prisma query (multi-tenant architecture — slug hardcoded to `"dar"` until tenant resolution is implemented).

### Query params

| Param | Values | Default | Behaviour |
|-------|--------|---------|-----------|
| `scope` | `in_care` \| `all` | `in_care` | `in_care` filters to status `IN_CARE` or `FOSTERED`; `all` returns everything |
| `q` | string | — | Case-insensitive search across `officialName`, `nickname`, and current foster's `firstName`+`lastName` |

### Prisma query shape

```ts
db.animal.findMany({
  where: {
    ...(scope === "in_care" ? { status: { in: ["IN_CARE", "FOSTERED"] } } : {}),
    ...(q ? {
      OR: [
        { officialName: { contains: q, mode: "insensitive" } },
        { nickname: { contains: q, mode: "insensitive" } },
        { fosterAssignments: { some: {
          isActive: true,
          foster: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
        }}},
      ],
    } : {}),
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
      select: { foster: { select: { firstName: true, lastName: true } } },
      take: 1,
    },
  },
  orderBy: { intakeDate: "desc" },
})
```

### Response shape

```ts
type AnimalRow = {
  id: string;
  officialName: string;
  nickname: string | null;
  species: Species;
  status: AnimalStatus;
  breed: string | null;
  gender: Gender;
  intakeDate: string; // ISO date string
  daysInCare: number;
  fosterName: string | null; // "Lisa Martinez" or null
}
```

`daysInCare` calculated server-side before returning.

---

## Testing

- API route: test with vitest — auth guard (401, 403), `scope` filter, `q` search across name and foster name
- No UI tests needed for the list page (Server Component, data from tested API)

---

## What's Not Built Yet

- `/admin/animals/[id]` — detail/edit page (next task in v0.2.0)
- `/admin/treatments`, `/admin/tnr`, `/admin/volunteers` — stub pages with "Coming soon"
- Add Animal form (`/admin/animals/new`) — stub page for now
