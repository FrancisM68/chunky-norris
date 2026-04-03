# TNR List Page — Design Spec

**Date:** 2026-04-03
**Route:** `/admin/tnr`
**File:** `src/app/admin/tnr/page.tsx` (replace stub)

---

## Overview

A read-only admin list page for the TNR register. Serves as both an operational view
(active operations) and a historical register (past records). Follows the same
server-component pattern as the animals and treatments pages.

---

## Page structure

Three sections, top to bottom:

1. **Stats bar** — three cards: Total Records, In Progress, Completed. On Hold count
   folded into a small badge on the Completed card if any exist.
2. **Toolbar** — status filter toggle + search input
3. **Table** — 12 columns, sorted by `dateIntoDar` descending

All data fetched server-side. Auth guard: `auth()` → redirect to `/login` if no session.

---

## Stats bar

| Card | Value |
|---|---|
| Total Records | COUNT of all TNR records |
| In Progress | COUNT where status IN (`IN_PROGRESS`, `ON_HOLD`) |
| Completed | COUNT where status = `COMPLETED` |

---

## Toolbar

- **Status filter toggle** (left): "In Progress" / "All Records" — URL param `scope`
  - `scope=in_progress` (default): shows `IN_PROGRESS` + `ON_HOLD`
  - `scope=all`: shows everything
- **Search** (right): filters on `locationName` case-insensitive contains — URL param `q`

---

## Table columns

| Column | Field | Notes |
|---|---|---|
| Location | `locationName` | Primary identifier |
| County | `county` | Direct |
| Date In | `dateIntoDar` | `en-IE` format; 1970-01-01 sentinel → `—` |
| Date Out | `dateOutOfDar` | `en-IE` format; null → `—` |
| Status | `status` | Pill (see below) |
| Outcome | `outcome` | Human-readable label; null → `—` |
| Sex | `sex` | `Female`, `Male`, `Unknown` |
| FIV / FeLV | `fivResult` / `felvResult` | Compact format: `–/–`, `+/–`, `–/+`, `+/+` |
| Volunteer(s) | `volunteer1` + `volunteer2` | Last names only, comma-separated; null → `—` |
| Contact | `contactName` | null → `—` |
| Phone | `contactNumber` | null → `—` |
| Vet | `vetHospital` | null → `—` |

Sorted by `dateIntoDar` descending. Horizontal scroll via `overflowX: auto`.

Empty state: "No TNR records found." centred in the table body.

### Status pill colours

| Status | Background | Text |
|---|---|---|
| `IN_PROGRESS` | `#fff3e0` | `#e65100` (amber) |
| `COMPLETED` | `#f0fdf4` | `#15803d` (green) |
| `ON_HOLD` | `#f3f4f6` | `#6b7280` (grey) |

### Outcome labels

| Value | Label |
|---|---|
| `RETURNED_RELEASED` | Returned / Released |
| `REHOMED` | Rehomed |
| `EUTHANISED` | PTS |
| `DIED_IN_CARE` | Passed Away |
| `TRANSFERRED` | Transferred |
| null | — |

### FIV / FeLV display

| fivResult / felvResult | Display |
|---|---|
| NEGATIVE / NEGATIVE | `–/–` |
| POSITIVE / NEGATIVE | `+/–` |
| NEGATIVE / POSITIVE | `–/+` |
| POSITIVE / POSITIVE | `+/+` |
| NOT_TESTED / NOT_TESTED | `n/t` |
| NEGATIVE / NOT_TESTED | `–/n/t` |
| POSITIVE / NOT_TESTED | `+/n/t` |
| NOT_TESTED / NEGATIVE | `n/t/–` |
| NOT_TESTED / POSITIVE | `n/t/+` |

---

## API route

**`GET /api/admin/tnr`** — returns TNR records for the table.

Query params:
- `scope`: `in_progress` (default) | `all`
- `q`: search string (optional)

Response shape:
```typescript
{
  records: {
    id: string
    locationName: string
    county: string
    dateIntoDar: string        // ISO
    dateOutOfDar: string | null
    status: string
    outcome: string | null
    sex: string
    fivResult: string
    felvResult: string
    contactName: string | null
    contactNumber: string | null
    vetHospital: string | null
    volunteer1LastName: string | null
    volunteer2LastName: string | null
  }[]
  stats: {
    total: number
    inProgress: number
    completed: number
  }
}
```

### Tests (vitest)

1. Returns all records when `scope=all`
2. Returns only `IN_PROGRESS` + `ON_HOLD` when `scope=in_progress`
3. Filters by `locationName` when `q` is provided
4. Returns empty array when no records match
5. Stats counts are correct

---

## Styling

Follows existing admin patterns:
- DAR green: `#2D5A27`
- Inline styles throughout (no Tailwind classes)
- Font size 13px for table rows
- Same header/pill/toolbar patterns as `src/app/admin/animals/page.tsx`

---

## Not in scope

- Add / edit TNR records (future)
- Detail page per TNR record (future)
- Pagination (270 records is manageable in a single load)
- Ear-tipping, vaccination status columns (too much width; available in future detail page)
