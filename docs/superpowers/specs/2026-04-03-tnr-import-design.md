# TNR Import Script — Design Spec

**Date:** 2026-04-03
**Source file:** `Support docs/DAR TNR ONLY REGISTER.xlsx` (sheet: `TNR ONLY`, 281 rows)
**Target:** `dar` schema, `tnr_records` table

---

## Overview

A one-shot migration script that imports 281 TNR records from DAR's Excel register
into the ChunkyNorris database. Volunteer stubs are created first so TNR records can
be properly linked via foreign keys.

---

## Script

**File:** `scripts/import-tnr.ts`

**Usage:**
```
npx tsx scripts/import-tnr.ts           # real import
npx tsx scripts/import-tnr.ts --dry-run # preview only, no DB writes
```

---

## Two-phase execution

### Phase 1 — Volunteer upsert

The Excel contains 7 abbreviated volunteer names:

| Excel name | Parsed firstName | Parsed lastName | Action |
|---|---|---|---|
| `L MARTINEZ` | Lisa | Martinez | Match existing by name |
| `E HOWELL` | E | Howell | Create stub |
| `E MCDONNELL` | E | Mcdonnell | Create stub |
| `F CONNOR` | F | Connor | Create stub |
| `N. CARNEY` | N | Carney | Create stub |
| `P MCDOWELL` | P | Mcdowell | Create stub |
| `R BORGHI` | R | Borghi | Create stub |

Stubs are created with `roles: ['VOLUNTEER']`, no email or password.
Lisa is matched by `firstName: 'Lisa', lastName: 'Martinez'` — no stub created.
Phase 1 is idempotent: stubs are only created if no matching volunteer exists.

### Phase 2 — TNR record import

Reads all 281 rows. For each row:
1. Parse and transform fields (see column mapping below)
2. Check for existing record with same `locationName + dateIntoDar` — skip if found
3. Insert new `TNRRecord`

---

## Column mapping

| Excel column | Schema field | Transformation |
|---|---|---|
| ` ` (unlabeled, col A) | `locationName` | Direct; null/blank → `"Not recorded"` (logged) |
| `COUNTY` | `county` | Direct |
| `CONTACT NAME` | `contactName` | Direct |
| `CONTACT NUMBER` | `contactNumber` | Direct |
| `VETERINARY HOSPITAL` | `vetHospital` | Direct |
| `AP REF NUM` | `apRefNumber` | Direct |
| `AGE` | `ageEstimate` | Direct |
| `COAT COLOUR` | `coatColour` | Direct |
| `ELAPSTED TIME (DAYS)` | `elapsedDays` | Direct |
| `NOTES` | `notes` | Direct |
| `ASSIGNED DAR VOLUNTEER1` | `volunteer1Id` | Resolved to volunteer ID via Phase 1 map |
| `ASSIGNED DAR VOLUNTEER2` | `volunteer2Id` | Resolved to volunteer ID via Phase 1 map |
| `SEX` | `sex` | `FEMALE` → `FEMALE_INTACT`, `MALE` → `MALE_INTACT`, null → `UNKNOWN` |
| `FIV` | `fivResult` | `'-ve'` → `NEGATIVE`, `'+ve'` → `POSITIVE`, null → `NOT_TESTED` |
| `FELV` | `felvResult` | Same as FIV |
| `STATUS` | `status` | See status mapping below |
| `OUTCOME` | `outcome` | See outcome mapping below |
| `DATE INTO DAR` | `dateIntoDar` | See date handling below |
| `DATE OUT OF DAR` | `dateOutOfDar` | See date handling below |
| `DATE NEUTERED` | `dateNeutered` | See date handling below |

### Status mapping

| Excel value | Schema value |
|---|---|
| `IN PROGRESS` | `IN_PROGRESS` |
| `ASSIGNED` | `IN_PROGRESS` |
| `COMPLETED` | `COMPLETED` |
| `CANCELLED` | `ON_HOLD` |
| null | `IN_PROGRESS` |
| unknown | `IN_PROGRESS` (logged) |

### Outcome mapping

| Excel value | Schema value |
|---|---|
| `RETURNED / RELEASED` | `RETURNED_RELEASED` |
| `REHOMED` | `REHOMED` |
| `KEPT FOR REHOMING` | `REHOMED` |
| `KEPT FOR REHOMING / TAME` | `REHOMED` |
| `PTS` | `EUTHANISED` |
| `PASSED AWAY` | `DIED_IN_CARE` |
| `FOSTER CARE` | null |
| null | null |
| unknown | null (logged) |

### Date handling

Dates appear in two formats in the Excel:
- **Excel serial numbers** (e.g. `45548`) — converted via `XLSX.SSF.parse_date_code()`
- **DD/MM/YYYY strings** (e.g. `"13/09/2024"`) — parsed manually

Known data quality issues:
- Some string dates have a malformed year (`0204` → `2024`, `0205` → `2025`) — corrected automatically
- `"N/A"` or any other unparseable value → stored as null, warning logged with row number and raw value

---

## Error handling and logging

| Condition | Action |
|---|---|
| `locationName` is null/blank | Store `"Not recorded"`, log warning with row number |
| Unparseable date | Store null, log warning with row number and raw value |
| Unknown STATUS value | Use `IN_PROGRESS`, log warning |
| Unknown OUTCOME value | Use null, log warning |
| Duplicate (locationName + dateIntoDar match) | Skip, counted in summary |

---

## Summary output

After both phases, print:

```
Volunteers: X created, Y matched
TNR records: Z imported, W skipped (duplicates)
Warnings: N (see above)
```

---

## Not in scope

- Parsing ear-tipping status from notes (left as `earTipped: false`)
- Vaccination status (not present in Excel)
- Tests for the script itself — existing TNR API tests confirm imported data is readable
