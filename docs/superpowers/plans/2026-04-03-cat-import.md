# Cat Register Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write a one-shot migration script that imports 1,171 cat records from `Support docs/DAR CAT REGISTER MASTER 06 Sept 2025.xlsx` into the `dar` schema, creating volunteer stubs and foster assignments as needed.

**Architecture:** Three phases in a single script — (1) upsert the 10 DAR volunteers, (2) upsert the 85 fosterers, (3) import Animal records with FosterAssignment per cat that has a fosterer. Pattern is identical to `scripts/import-tnr.ts`. The script is idempotent: re-running skips existing records (matched by `officialName + intakeDate`).

**Tech Stack:** `tsx`, `xlsx`, Prisma via `getTenantClient('dar')`, `dotenv/config`.

---

## File structure

| File | Action | Role |
|---|---|---|
| `scripts/import-cats.ts` | Create | Full import script — all phases |

---

### Task 1: Script skeleton with parse helpers

**Files:**
- Create: `scripts/import-cats.ts`

This task creates the file with all column constants and exported parse functions. No volunteer or animal logic yet — just the building blocks.

- [ ] **Step 1: Create `scripts/import-cats.ts` with column constants and parse helpers**

```typescript
/**
 * Imports 1,171 cat records from DAR's Excel register.
 *
 * Usage:
 *   npx tsx scripts/import-cats.ts           # real import
 *   npx tsx scripts/import-cats.ts --dry-run # preview only
 */
import 'dotenv/config'
import * as XLSX from 'xlsx'
import { getTenantClient } from '../src/lib/tenant'
import type {
  Gender,
  IntakeSource,
  AnimalStatus,
  DisposalMethod,
  VaccinationStatus,
  TestResult,
} from '@prisma/client'

// ── Column key constants (exact strings from Excel header row) ────────────────
const COL = {
  name:         'NAME',
  infoSource:   'INFO SOURCE',
  breed:        'BREED',
  description:  'DESCRIPTION',
  gender:       'GENDER',
  ageAtIntake:  'AGE at INTAKE',
  vacStatus:    'VACCINATION STATUS',
  v1Date:       'V1 DATE',
  v2Date:       'V2 DATE',
  vaccineType:  'VACCINE TYPE',
  dateNeutered: 'DATE NEUTERED',
  fiv:          'FIV',
  felv:         'FELV',
  location:     'LOCATION',
  dateIntoDar:  'DATE INTO DAR',
  dateOutOfDar: 'DATE OUT OF DAR',
  totalDays:    'TOTAL DAYS IN DAR',
  outcome:      'OUTCOME',
  source:       'SOURCE',
  fosterer:     'FOSTERER',
  refNum:       'REF NUM',
  darVolunteer: 'DAR VOLUNTEER',
  microchip:    'MICROCHIP NUM',
  chipDate:     'DATE IMPLANTED',
  notes:        'NOTES',
} as const

// ── Volunteer name overrides ──────────────────────────────────────────────────
// L. Martinez must match Lisa Martinez already in the DB — full name needed.
const VOL_OVERRIDES: Record<string, { firstName: string; lastName: string }> = {
  'L. Martinez': { firstName: 'Lisa', lastName: 'Martinez' },
}

// ── Parse helpers ─────────────────────────────────────────────────────────────

/**
 * Parses "F. LastName" format into { firstName, lastName }.
 * Single-word names (e.g. "Anne") → { firstName: "Anne", lastName: "" }.
 */
export function parseVolunteerName(raw: string): { firstName: string; lastName: string } {
  if (VOL_OVERRIDES[raw]) return VOL_OVERRIDES[raw]
  const trimmed = raw.trim()
  const dotMatch = trimmed.match(/^([A-Za-z])\.\s+(.+)$/)
  if (dotMatch) {
    return { firstName: dotMatch[1].toUpperCase(), lastName: dotMatch[2].trim() }
  }
  return { firstName: trimmed, lastName: '' }
}

/**
 * All dates in this Excel are Excel serial numbers (no string dates).
 * Returns null for null/undefined/empty values.
 */
export function parseExcelDate(
  value: unknown,
  rowNum: number,
  fieldName: string,
  warnings: string[],
): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  }
  warnings.push(`Row ${rowNum}: unparseable ${fieldName} value "${value}" — stored as null`)
  return null
}

export function parseGender(value: unknown): Gender {
  switch (value) {
    case 'FEMALE - NEUTERED': return 'FEMALE_NEUTERED'
    case 'MALE - NEUTERED':   return 'MALE_NEUTERED'
    case 'FEMALE':
    case 'FEMALE - INTACT':   return 'FEMALE_INTACT'
    case 'MALE':
    case 'MALE - INTACT':     return 'MALE_INTACT'
    default:                  return 'UNKNOWN'
  }
}

/**
 * 'OTHER' and null → STRAY (silent — too common to log individually).
 * Truly unexpected values → STRAY + logged.
 */
export function parseIntakeSource(
  value: unknown,
  rowNum: number,
  warnings: string[],
): IntakeSource {
  switch (value) {
    case 'STRAY':     return 'STRAY'
    case 'SURRENDER': return 'SURRENDER'
    case 'ABANDONED': return 'ABANDONED'
    case 'ORPHANED':  return 'ORPHANED'
    case 'TNR':       return 'TNR'
    case 'RTA':       return 'RTA'
    case 'OTHER':
    case null:
    case undefined:   return 'STRAY'
    default:
      warnings.push(`Row ${rowNum}: unknown SOURCE "${value}" — defaulting to STRAY`)
      return 'STRAY'
  }
}

/**
 * Returns the derived AnimalStatus + DisposalMethod from the OUTCOME column,
 * or null if OUTCOME is empty (status will be derived from LOCATION instead).
 */
export function parseOutcome(
  value: unknown,
  rowNum: number,
  warnings: string[],
): { status: AnimalStatus; disposalMethod: DisposalMethod } | null {
  switch (value) {
    case 'REHOMED':
      return { status: 'ADOPTED', disposalMethod: 'REHOMED' }
    case 'RETURN / RELEASE':
    case 'RETURN/RELEASE':
    case 'TNR RETURN/RELEASE':
      return { status: 'TNR_RETURNED', disposalMethod: 'TNR_RETURNED' }
    case 'PTS':
      return { status: 'EUTHANISED', disposalMethod: 'EUTHANISED' }
    case 'PASSED AWAY':
      return { status: 'DIED_IN_CARE', disposalMethod: 'DIED_IN_CARE' }
    case 'RECLAIMED':
      return { status: 'RETURNED_TO_OWNER', disposalMethod: 'RECLAIMED' }
    case null:
    case undefined:
      return null
    default:
      warnings.push(`Row ${rowNum}: unknown OUTCOME "${value}" — treating as no outcome`)
      return null
  }
}

/**
 * Derives status and currentLocation from the LOCATION column.
 * Only called when OUTCOME is null.
 */
export function parseStatusFromLocation(location: unknown): {
  status: AnimalStatus
  currentLocation: string | null
} {
  switch (location) {
    case 'FOSTER CARE':
    case 'FOSTER CARE - LONG TERM':
      return { status: 'FOSTERED', currentLocation: 'Foster Care' }
    case 'CAT CENTRE':
      return { status: 'IN_CARE', currentLocation: 'Cat Centre' }
    case 'VET':
      return { status: 'IN_CARE', currentLocation: 'Vet' }
    default:
      return { status: 'IN_CARE', currentLocation: null }
  }
}

export function parseVaccinationStatus(value: unknown): VaccinationStatus | null {
  const v = typeof value === 'string' ? value.trim() : value
  switch (v) {
    case 'V1 + V2': return 'V1_AND_V2'
    case 'V1':      return 'V1_ONLY'
    case 'PENDING': return 'NOT_VACCINATED'
    default:        return null
  }
}

export function parseFivFelv(value: unknown): TestResult {
  if (value === '+ve') return 'POSITIVE'
  if (value === '-ve') return 'NEGATIVE'
  return 'NOT_TESTED'
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-cats.ts
git commit -m "feat(import): add cat import script skeleton with parse helpers"
```

---

### Task 2: Volunteer upsert (Phase 1 + Phase 2)

**Files:**
- Modify: `scripts/import-cats.ts` (append Phase 1 + Phase 2 functions)

Phase 1 upserts the 10 named DAR volunteers. Phase 2 collects unique fosterer names from the rows and creates stubs for any not already in the DB. Both phases are idempotent.

- [ ] **Step 1: Append the volunteer upsert functions to `scripts/import-cats.ts`**

Add after the parse helpers (before any `main` function — none exists yet):

```typescript
// ── DAR volunteer names (from DAR VOLUNTEER column — 10 unique values) ────────
const DAR_VOLUNTEER_NAMES = [
  'E. Howell', 'F. Connor', 'F. Cunningham', 'K. Brennan',
  'L. Hewitt', 'L. Martinez', 'P. Maquire', 'P. McDowell',
  'R. Borghi', 'S. Murphy',
]

// ── Phase 1: DAR volunteer upsert ────────────────────────────────────────────

export async function upsertDarVolunteers(
  db: Awaited<ReturnType<typeof getTenantClient>>,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const volMap = new Map<string, string>() // Excel name → volunteer ID
  let created = 0
  let matched = 0

  for (const raw of DAR_VOLUNTEER_NAMES) {
    const { firstName, lastName } = parseVolunteerName(raw)
    const existing = await db.volunteer.findFirst({ where: { firstName, lastName } })

    if (existing) {
      volMap.set(raw, existing.id)
      matched++
      console.log(`  Matched DAR vol: ${raw} → ${existing.firstName} ${existing.lastName} (${existing.id})`)
    } else if (dryRun) {
      console.log(`  [dry-run] Would create DAR volunteer: ${firstName} ${lastName}`)
      volMap.set(raw, `dry-run-${raw}`)
      created++
    } else {
      const vol = await db.volunteer.create({
        data: { firstName, lastName, roles: ['VOLUNTEER'] },
      })
      volMap.set(raw, vol.id)
      created++
      console.log(`  Created DAR vol: ${raw} → ${vol.id}`)
    }
  }

  console.log(`\nDAR volunteers: ${created} created, ${matched} matched`)
  return volMap
}

// ── Phase 2: Fosterer upsert ──────────────────────────────────────────────────

export async function upsertFosterers(
  db: Awaited<ReturnType<typeof getTenantClient>>,
  rows: Record<string, unknown>[],
  darVolMap: Map<string, string>,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const fosterMap = new Map<string, string>() // Excel name → volunteer ID
  let created = 0
  let matched = 0

  // Collect unique fosterer names from all rows
  const uniqueFosterers = [
    ...new Set(
      rows
        .map((r) => r[COL.fosterer] as string | null)
        .filter((v): v is string => Boolean(v)),
    ),
  ]

  for (const raw of uniqueFosterers) {
    // If already resolved in Phase 1, reuse that record
    if (darVolMap.has(raw)) {
      fosterMap.set(raw, darVolMap.get(raw)!)
      matched++
      continue
    }

    const { firstName, lastName } = parseVolunteerName(raw)
    const existing = await db.volunteer.findFirst({ where: { firstName, lastName } })

    if (existing) {
      fosterMap.set(raw, existing.id)
      matched++
    } else if (dryRun) {
      console.log(`  [dry-run] Would create fosterer: ${firstName} ${lastName}`)
      fosterMap.set(raw, `dry-run-${raw}`)
      created++
    } else {
      const vol = await db.volunteer.create({
        data: { firstName, lastName, roles: ['FOSTER'] },
      })
      fosterMap.set(raw, vol.id)
      created++
    }
  }

  console.log(`Fosterers: ${created} created, ${matched} matched`)
  return fosterMap
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-cats.ts
git commit -m "feat(import): add volunteer upsert phases to cat import script"
```

---

### Task 3: Animal import + FosterAssignment + main

**Files:**
- Modify: `scripts/import-cats.ts` (append Phase 3 + main)

Phase 3 loops over all 1,171 rows. For each row: deduplication check by `officialName + intakeDate`, then create the Animal record, then (if FOSTERER present) a FosterAssignment.

**Important data quality issue:** The Excel has 9 microchip numbers that appear on 2 rows each (data entry duplicates in DAR's spreadsheet). The schema has `@unique` on `microchipNumber`. We pre-scan for intra-Excel duplicates and nullify those chips before importing, logging a warning per affected row.

- [ ] **Step 1: Append the animal import function to `scripts/import-cats.ts`**

Add after the volunteer upsert functions:

```typescript
// ── Phase 3: Animal import ────────────────────────────────────────────────────

export async function importAnimals(
  db: Awaited<ReturnType<typeof getTenantClient>>,
  rows: Record<string, unknown>[],
  darVolMap: Map<string, string>,
  fosterMap: Map<string, string>,
  dryRun: boolean,
  warnings: string[],
): Promise<{ imported: number; skipped: number }> {
  // Pre-scan for duplicate microchip numbers within this Excel file.
  // Any chip that appears more than once is nullified to avoid @unique violations.
  const chipCounts = new Map<string, number>()
  for (const row of rows) {
    const raw = row[COL.microchip]
    if (raw != null && String(raw).trim() !== '') {
      const chip = String(raw).trim()
      chipCounts.set(chip, (chipCounts.get(chip) ?? 0) + 1)
    }
  }
  const duplicateChips = new Set(
    [...chipCounts.entries()].filter(([, count]) => count > 1).map(([chip]) => chip),
  )

  let imported = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-based, +1 for header row

    // ── officialName ──────────────────────────────────────────────────────────
    const rawName = row[COL.name]
    const officialName =
      rawName != null && String(rawName).trim() !== ''
        ? String(rawName).trim()
        : 'Not recorded'
    if (officialName === 'Not recorded') {
      warnings.push(`Row ${rowNum}: no NAME — stored as "Not recorded"`)
    }

    // ── dates ─────────────────────────────────────────────────────────────────
    const dateIntoDar    = parseExcelDate(row[COL.dateIntoDar],  rowNum, 'DATE INTO DAR',  warnings)
    const dateOutOfDar   = parseExcelDate(row[COL.dateOutOfDar], rowNum, 'DATE OUT OF DAR', warnings)
    const dateNeutered   = parseExcelDate(row[COL.dateNeutered], rowNum, 'DATE NEUTERED',   warnings)
    const v1Date         = parseExcelDate(row[COL.v1Date],       rowNum, 'V1 DATE',         warnings)
    const v2Date         = parseExcelDate(row[COL.v2Date],       rowNum, 'V2 DATE',         warnings)
    const chipDate       = parseExcelDate(row[COL.chipDate],     rowNum, 'DATE IMPLANTED',  warnings)

    const intakeDate = dateIntoDar ?? new Date('1970-01-01')

    // ── deduplication ─────────────────────────────────────────────────────────
    const existing = await db.animal.findFirst({
      where: { officialName, intakeDate },
    })
    if (existing) {
      skipped++
      continue
    }

    // ── status + outcome ──────────────────────────────────────────────────────
    const outcomeResult = parseOutcome(row[COL.outcome], rowNum, warnings)
    const locationResult = parseStatusFromLocation(row[COL.location])

    const status         = outcomeResult?.status ?? locationResult.status
    const disposalMethod = outcomeResult?.disposalMethod ?? null
    const currentLocation = outcomeResult ? null : locationResult.currentLocation

    // ── microchip ─────────────────────────────────────────────────────────────
    const rawChip = row[COL.microchip]
    const chipStr = rawChip != null && String(rawChip).trim() !== '' ? String(rawChip).trim() : null
    let microchipNumber: string | null = chipStr
    if (chipStr && duplicateChips.has(chipStr)) {
      warnings.push(`Row ${rowNum}: microchip "${chipStr}" appears on multiple rows — stored as null`)
      microchipNumber = null
    }

    // ── totals ────────────────────────────────────────────────────────────────
    const totalDaysRaw = row[COL.totalDays]
    const totalDaysInCare =
      typeof totalDaysRaw === 'number' && totalDaysRaw > 0
        ? Math.round(totalDaysRaw)
        : null

    // ── relationships ─────────────────────────────────────────────────────────
    const darVolRaw = row[COL.darVolunteer] as string | null
    const addedById = darVolRaw ? (darVolMap.get(darVolRaw) ?? null) : null

    const fostererRaw = row[COL.fosterer] as string | null
    const fosterId = fostererRaw ? (fosterMap.get(fostererRaw) ?? null) : null

    if (dryRun) {
      console.log(`  [dry-run] Would import row ${rowNum}: ${officialName}`)
      imported++
      continue
    }

    // ── create Animal ─────────────────────────────────────────────────────────
    const animal = await db.animal.create({
      data: {
        officialName,
        species:           'CAT',
        breed:             (row[COL.breed]       as string | null) ?? null,
        description:       (row[COL.description] as string | null) ?? null,
        gender:            parseGender(row[COL.gender]),
        ageAtIntake:       (row[COL.ageAtIntake]  as string | null) ?? null,
        vaccinationStatus: parseVaccinationStatus(row[COL.vacStatus]),
        v1Date,
        v2Date,
        vaccineType:       (row[COL.vaccineType] as string | null) ?? null,
        neuteredDate:      dateNeutered,
        fivResult:         parseFivFelv(row[COL.fiv]),
        felvResult:        parseFivFelv(row[COL.felv]),
        currentLocation,
        intakeDate,
        intakeSource:      parseIntakeSource(row[COL.source], rowNum, warnings),
        infoSource:        (row[COL.infoSource] as string | null) ?? null,
        darRefNumber:      row[COL.refNum] != null ? String(row[COL.refNum]) : null,
        microchipNumber,
        microchipDate:     chipDate,
        status,
        departureDate:     dateOutOfDar,
        disposalMethod,
        totalDaysInCare,
        legacyNotes:       (row[COL.notes] as string | null) ?? null,
        addedById,
      },
    })

    // ── create FosterAssignment ───────────────────────────────────────────────
    if (fosterId) {
      await db.fosterAssignment.create({
        data: {
          animalId:  animal.id,
          fosterId,
          startDate: intakeDate,
          endDate:   dateOutOfDar,
          isActive:  !dateOutOfDar,
        },
      })
    } else if (fostererRaw) {
      warnings.push(`Row ${rowNum}: fosterer "${fostererRaw}" not resolved — FosterAssignment skipped`)
    }

    imported++
  }

  return { imported, skipped }
}
```

- [ ] **Step 2: Append the main function to `scripts/import-cats.ts`**

Add at the very end of the file:

```typescript
// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('=== DRY RUN — no database writes ===\n')

  const db = getTenantClient('dar')
  const warnings: string[] = []

  // Read Excel
  const wb = XLSX.readFile('Support docs/DAR CAT REGISTER MASTER 06 Sept 2025.xlsx')
  const ws = wb.Sheets['CAT REGISTER']
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  console.log(`Read ${rows.length} rows from Excel\n`)

  // Phase 1
  console.log('=== Phase 1: DAR Volunteers ===')
  const darVolMap = await upsertDarVolunteers(db, dryRun)

  // Phase 2
  console.log('\n=== Phase 2: Fosterers ===')
  const fosterMap = await upsertFosterers(db, rows, darVolMap, dryRun)

  // Phase 3
  console.log('\n=== Phase 3: Animals ===')
  const { imported, skipped } = await importAnimals(db, rows, darVolMap, fosterMap, dryRun, warnings)

  // Summary
  console.log('\n=== Summary ===')
  console.log(`Animals: ${imported} imported, ${skipped} skipped (duplicates)`)
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`)
    warnings.forEach((w) => console.log(' ', w))
  } else {
    console.log('Warnings: 0')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run dry-run and verify output**

```bash
npx tsx scripts/import-cats.ts --dry-run
```

Expected output (approximate):
```
=== DRY RUN — no database writes ===

Read 1171 rows from Excel

=== Phase 1: DAR Volunteers ===
  Matched DAR vol: L. Martinez → Lisa Martinez (...)
  [dry-run] Would create DAR volunteer: E Howell
  ... (9 more lines)

DAR volunteers: 9 created, 1 matched

=== Phase 2: Fosterers ===
  [dry-run] Would create fosterer: ...
  ... (many lines)
Fosterers: ~80 created, ~5 matched

=== Phase 3: Animals ===
  [dry-run] Would import row 2: Newtownstalban Young Cat
  ... (1171 lines)

=== Summary ===
Animals: 1171 imported, 0 skipped (duplicates)
Warnings: N (see above)
```

- [ ] **Step 5: Run the real import**

```bash
npx tsx scripts/import-cats.ts
```

Expected output:
```
Read 1171 rows from Excel

=== Phase 1: DAR Volunteers ===
  Matched DAR vol: L. Martinez → Lisa Martinez (...)
  Created DAR vol: E. Howell → <id>
  ... (9 created, 1 matched)

=== Phase 2: Fosterers ===
  ... (~80 created, ~5 matched)

=== Phase 3: Animals ===
  (no per-row output in real mode — just runs)

=== Summary ===
Animals: 1171 imported, 0 skipped (duplicates)
Warnings: N (see above)
```

- [ ] **Step 6: Verify record counts in the database**

```bash
npx tsx -e "
import 'dotenv/config'
import { getTenantClient } from './src/lib/tenant'
const db = getTenantClient('dar')
const [animals, fosters, assignments] = await Promise.all([
  db.animal.count(),
  db.volunteer.count(),
  db.fosterAssignment.count(),
])
console.log('Animals:', animals)
console.log('Volunteers:', fosters)
console.log('FosterAssignments:', assignments)
"
```

Expected:
- Animals: 1171 (or close — any pre-existing test animals will add to this)
- Volunteers: at least 96 (9 new DAR vols + ~80 new fosterers + existing Lisa + any pre-existing)
- FosterAssignments: at least 700 (most animals have a fosterer)

- [ ] **Step 7: Commit**

```bash
git add scripts/import-cats.ts
git commit -m "feat(import): cat register import complete — 1171 animals, fosterer stubs, foster assignments"
```
