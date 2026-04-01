# Animal Form Design — Add & Edit

**Date:** 2026-04-01
**Scope:** Admin back-office add/edit animal form (`/admin/animals/new` and `/admin/animals/[id]`)
**Status:** Approved — ready for implementation

---

## 1. Schema Changes

Three additions to `prisma/schema.prisma`:

**Species enum** — add `OTHER` value:
```
enum Species {
  CAT
  DOG
  RABBIT
  FERRET
  OTHER
}
```

**Animal model** — two new optional fields:
- `speciesOther String?` — free-text species name when species = OTHER (e.g. "Budgie", "Ball Python")
- `notes String?` — freeform behavioural/personality notes (e.g. "Afraid of males", "Only pet household")

`legacyNotes String?` already exists — no change. Presence of a non-null value signals an imported animal.

---

## 2. Routes & Architecture

### Pages

| Route | Purpose |
|-------|---------|
| `/admin/animals/new` | Create mode — blank form |
| `/admin/animals/[id]` | Detail page — view mode by default, inline toggle to edit mode |

Both pages are **Server Components** that fetch data server-side, then pass it down to a **Client Component form island** (`AnimalForm`). This keeps auth and DB calls off the client while allowing rich interactive state (species-driven field visibility, conditional validation).

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/animals` | Create new animal |
| GET | `/api/admin/animals/[id]` | Fetch single animal for detail/edit |
| PATCH | `/api/admin/animals/[id]` | Update existing animal |

All routes: 401 if unauthenticated, 403 if non-ADMIN role.

### Component structure

```
src/app/admin/animals/
  new/page.tsx              — Server Component, renders <AnimalForm mode="create" />
  [id]/page.tsx             — Server Component, fetches animal, renders detail view + <AnimalForm>
  [id]/AnimalForm.tsx       — "use client" — all form state, validation, submit logic
```

### Inline view/edit toggle

The detail page (`/admin/animals/[id]`) renders in **view mode by default** — read-only field grid. An Edit button switches to edit mode **in place** (no navigation). Cancel restores view mode without saving. Save calls PATCH then returns to view mode.

This avoids a separate `/edit` route and keeps context clear for the admin.

---

## 3. Field Groups & Visibility

### Species — always first, required

Button group: CAT | DOG | RABBIT | FERRET | OTHER

If OTHER selected: "Please specify" text input appears inline — required.

Species selection controls which Medical fields are visible (see below).

### Identity

| Field | Required | Notes |
|-------|----------|-------|
| officialName | Yes | Structured name e.g. "Moneymore Kitten1 - Snoopy" |
| nickname | No | Foster-friendly name e.g. "Snoopy" |
| breed | No | |
| description | No | Coat colour/pattern |
| gender | Yes | Dropdown |
| dateOfBirth | No | + "estimated" checkbox |
| ageAtIntake | No | |
| microchipNumber | No | |
| microchipDate | No | |

### Intake

| Field | Required | Notes |
|-------|----------|-------|
| intakeDate | Yes | Not in the future |
| intakeSource | Yes | Dropdown |
| strayLocation | If STRAY | Shown only when intakeSource = Stray |
| infoSource | No | |
| darRefNumber | No | |
| vetRefNumber | No | |

### Medical

Shared fields (all species):
- vaccinationStatus, v1Date, v2Date, vaccineType
- neuteredDate, neuteredVet

**Cat only** (amber highlight, hidden for other species):
- fivResult — dropdown
- felvResult — dropdown

**Dog only** (blue highlight, hidden for other species):
- kennelCoughDate
- rabiesDate
- condition

When species changes, species-specific fields are hidden in the UI. Their values are preserved in the DB if previously set — no destructive clearing on species change.

### Status

| Field | Required | Notes |
|-------|----------|-------|
| status | Yes | Dropdown |
| currentLocation | No | "Foster Care", "Vet", "DAR HQ" etc. |

**Terminal status block** (pink, P0) — appears when status is one of: Adopted, Euthanised, Died in Care, Returned to Owner, TNR Returned:
- departureDate — required (P0)
- disposalMethod — required (P0)

### Notes

- notes — freeform textarea, optional, always visible and editable

### Legacy Notes (imported animals only)

- legacyNotes — read-only, shown only when `legacyNotes !== null`
- Never editable — these are raw Excel migration data

---

## 4. Validation Rules

### Always required
- `officialName` — non-empty string
- `gender` — valid enum value
- `intakeDate` — valid date, not in the future
- `intakeSource` — valid enum value
- `status` — valid enum value

### Conditionally required
- `speciesOther` — required if species = OTHER
- `strayLocation` — required if intakeSource = STRAY
- `departureDate` — required if status is terminal
- `disposalMethod` — required if status is terminal (P0 — non-negotiable)

**Terminal statuses:** Adopted, Euthanised, Died in Care, Returned to Owner, TNR Returned

### Optional with format constraints
- `dateOfBirth` — valid date if provided; must be before intakeDate
- `microchipDate` — valid date if provided
- `neuteredDate` — valid date if provided
- `v1Date`, `v2Date` — valid dates if provided; v2Date must be after v1Date if both set
- `kennelCoughDate`, `rabiesDate` — valid dates if provided (dog only)

### Submission behaviour
- Validation runs **client-side on submit** (not on blur — avoids interrupting mid-entry)
- Server validates independently and returns 422 with field-level errors if client validation is bypassed
- On success: redirect to `/admin/animals/[id]` in view mode

---

## 5. Testing Approach

**API route tests (Vitest)** — same pattern as existing `route.test.ts` files:

`POST /api/admin/animals`:
- 401 unauthenticated
- 403 non-admin role
- 201 valid create
- 422 missing required fields
- 422 terminal status without departureDate/disposalMethod

`GET /api/admin/animals/[id]`:
- 401, 403, 404 not found
- 200 correct data shape

`PATCH /api/admin/animals/[id]`:
- 401, 403, 404
- 200 valid update
- 422 validation failure
- Species change: old species-specific data untouched in DB

**display-helpers**: add `speciesLabel("OTHER")` → `"Other"` test case.

**No component tests** for `AnimalForm` — UI interactivity (show/hide, conditional required) verified manually during review. API tests cover all compliance-critical paths.

---

## Out of Scope

- Bulk import / CSV upload (separate feature)
- Treatment log entry from this form (separate flow)
- Foster assignment from this form (separate flow)
- Photo/document attachments
