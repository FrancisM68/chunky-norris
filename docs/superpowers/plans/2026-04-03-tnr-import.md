# TNR Import Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import 281 TNR records from `Support docs/DAR TNR ONLY REGISTER.xlsx` into the `dar` schema, creating volunteer stubs as needed.

**Architecture:** Single script `scripts/import-tnr.ts` with two phases: volunteer upsert then TNR record import. A `--dry-run` flag previews all actions without writing to the DB. Import is idempotent — re-running skips records that already exist (matched by `locationName + dateIntoDar`).

**Tech Stack:** `xlsx` (already installed), `tsx`, Prisma via `getTenantClient('dar')`

---

## File structure

| File | Role |
|---|---|
| `scripts/import-tnr.ts` | Single script — helpers, Phase 1, Phase 2, main entrypoint |

No new source files needed. The script follows the pattern of `scripts/reseed-dev.ts`.

---

### Task 1: Scaffold the script with column constants and parse helpers

**Files:**
- Create: `scripts/import-tnr.ts`

These are all pure functions. No DB calls yet.

- [ ] **Step 1: Create the file with imports, column constants, and all parse helpers**

```typescript
/**
 * Imports 281 TNR records from DAR's Excel register.
 *
 * Usage:
 *   npx tsx scripts/import-tnr.ts           # real import
 *   npx tsx scripts/import-tnr.ts --dry-run # preview only
 */
import 'dotenv/config'
import * as XLSX from 'xlsx'
import { getTenantClient } from '../src/lib/tenant'
import type { Gender, TestResult, TNRStatus, TNROutcome } from '@prisma/client'

// ── Column key constants (exact strings from the Excel header row) ───────────
const COL = {
  locationName:  ' ',
  county:        'COUNTY',
  contactName:   'CONTACT NAME',
  contactNumber: 'CONTACT NUMBER',
  status:        'STATUS',
  vol1:          'ASSIGNED \r\nDAR VOLUNTEER1',
  vol2:          'ASSIGNED\r\nDAR VOLUNTEER2',
  vetHospital:   'VETERINARY HOSPITAL',
  apRefNumber:   'AP REF NUM',
  dateIntoDar:   'DATE INTO DAR\r\nDD/MM/YYYY',
  dateOutOfDar:  'DATE OUT OF DAR\r\nDD/MM/YYYY',
  elapsedDays:   'ELAPSTED TIME\r\n(DAYS)',
  sex:           'SEX',
  ageEstimate:   'AGE',
  coatColour:    'COAT COLOUR',
  dateNeutered:  'DATE NEUTERED\r\nDD/MM/YYYY',
  fivResult:     'FIV',
  felvResult:    'FELV',
  outcome:       'OUTCOME',
  notes:         'NOTES',
} as const

// ── Volunteer name overrides ─────────────────────────────────────────────────
// L MARTINEZ must match Lisa Martinez already in the DB — full name needed.
const VOLUNTEER_OVERRIDES: Record<string, { firstName: string; lastName: string }> = {
  'L MARTINEZ': { firstName: 'Lisa', lastName: 'Martinez' },
}

// ── Parse helpers ────────────────────────────────────────────────────────────

export function parseVolunteerName(abbrev: string): { firstName: string; lastName: string } {
  if (VOLUNTEER_OVERRIDES[abbrev]) return VOLUNTEER_OVERRIDES[abbrev]
  const parts = abbrev.replace(/\./g, '').trim().split(/\s+/)
  const firstName = parts[0]
  const lastName = parts
    .slice(1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')
  return { firstName, lastName }
}

export function parseExcelDate(
  value: unknown,
  rowNum: number,
  fieldName: string,
  warnings: string[],
): Date | null {
  if (value === null || value === undefined || value === '' || value === 'N/A') return null

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  }

  if (typeof value === 'string') {
    // Fix known year typos: "0204" → "2024", "0205" → "2025"
    const fixed = value.replace(/^(\d{2})\/(\d{2})\/(02)(\d{2})$/, '$1/$2/20$4')
    const parts = fixed.split('/')
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number)
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
        return new Date(Date.UTC(year, month - 1, day))
      }
    }
  }

  warnings.push(`Row ${rowNum}: unparseable ${fieldName} value "${value}" — stored as null`)
  return null
}

export function parseSex(value: unknown): Gender {
  if (value === 'FEMALE') return 'FEMALE_INTACT'
  if (value === 'MALE') return 'MALE_INTACT'
  return 'UNKNOWN'
}

export function parseFivFelv(value: unknown): TestResult {
  if (value === '-ve') return 'NEGATIVE'
  if (value === '+ve') return 'POSITIVE'
  return 'NOT_TESTED'
}

export function parseStatus(value: unknown, rowNum: number, warnings: string[]): TNRStatus {
  switch (value) {
    case 'IN PROGRESS':
    case 'ASSIGNED':
    case null:
    case undefined:
      return 'IN_PROGRESS'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'CANCELLED':
      return 'ON_HOLD'
    default:
      warnings.push(`Row ${rowNum}: unknown STATUS "${value}" — defaulting to IN_PROGRESS`)
      return 'IN_PROGRESS'
  }
}

export function parseOutcome(value: unknown, rowNum: number, warnings: string[]): TNROutcome | null {
  switch (value) {
    case 'RETURNED / RELEASED':
      return 'RETURNED_RELEASED'
    case 'REHOMED':
    case 'KEPT FOR REHOMING':
    case 'KEPT FOR REHOMING / TAME':
      return 'REHOMED'
    case 'PTS':
      return 'EUTHANISED'
    case 'PASSED AWAY':
      return 'DIED_IN_CARE'
    case 'FOSTER CARE':
    case null:
    case undefined:
      return null
    default:
      warnings.push(`Row ${rowNum}: unknown OUTCOME "${value}" — stored as null`)
      return null
  }
}
```

- [ ] **Step 2: Verify the helpers compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-tnr.ts
git commit -m "feat(import): scaffold TNR import script with parse helpers"
```

---

### Task 2: Phase 1 — volunteer upsert

**Files:**
- Modify: `scripts/import-tnr.ts`

- [ ] **Step 1: Add the `upsertVolunteers` function after the parse helpers**

```typescript
// ── Phase 1: Volunteer upsert ────────────────────────────────────────────────

const EXCEL_VOLUNTEER_NAMES = [
  'L MARTINEZ',
  'E HOWELL',
  'E MCDONNELL',
  'F CONNOR',
  'N. CARNEY',
  'P MCDOWELL',
  'R BORGHI',
]

export async function upsertVolunteers(
  db: Awaited<ReturnType<typeof getTenantClient>>,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const volMap = new Map<string, string>() // Excel abbrev → volunteer ID
  let created = 0
  let matched = 0

  for (const excelName of EXCEL_VOLUNTEER_NAMES) {
    const { firstName, lastName } = parseVolunteerName(excelName)
    const existing = await db.volunteer.findFirst({ where: { firstName, lastName } })

    if (existing) {
      volMap.set(excelName, existing.id)
      matched++
      console.log(`  Matched: ${excelName} → ${existing.firstName} ${existing.lastName} (${existing.id})`)
    } else if (dryRun) {
      console.log(`  [dry-run] Would create volunteer: ${firstName} ${lastName}`)
      volMap.set(excelName, `dry-run-${excelName}`)
      created++
    } else {
      const vol = await db.volunteer.create({
        data: { firstName, lastName, roles: ['VOLUNTEER'] },
      })
      volMap.set(excelName, vol.id)
      created++
      console.log(`  Created: ${excelName} → ${vol.id}`)
    }
  }

  console.log(`\nVolunteers: ${created} created, ${matched} matched`)
  return volMap
}
```

- [ ] **Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-tnr.ts
git commit -m "feat(import): add Phase 1 volunteer upsert"
```

---

### Task 3: Phase 2 — TNR row mapper and import loop

**Files:**
- Modify: `scripts/import-tnr.ts`

- [ ] **Step 1: Add the `importTnrRecords` function after `upsertVolunteers`**

```typescript
// ── Phase 2: TNR record import ───────────────────────────────────────────────

export async function importTnrRecords(
  db: Awaited<ReturnType<typeof getTenantClient>>,
  rows: Record<string, unknown>[],
  volMap: Map<string, string>,
  dryRun: boolean,
  warnings: string[],
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-based, +1 for header row

    const rawLocation = row[COL.locationName]
    const locationName =
      rawLocation === null || rawLocation === undefined || String(rawLocation).trim() === ''
        ? 'Not recorded'
        : String(rawLocation).trim()

    if (locationName === 'Not recorded') {
      warnings.push(`Row ${rowNum}: no locationName — stored as "Not recorded"`)
    }

    const dateIntoDar = parseExcelDate(row[COL.dateIntoDar], rowNum, 'DATE INTO DAR', warnings)
    const dateOutOfDar = parseExcelDate(row[COL.dateOutOfDar], rowNum, 'DATE OUT OF DAR', warnings)
    const dateNeutered = parseExcelDate(row[COL.dateNeutered], rowNum, 'DATE NEUTERED', warnings)

    if (dateIntoDar === null) {
      warnings.push(`Row ${rowNum}: missing DATE INTO DAR — stored as 1970-01-01 sentinel`)
    }

    // Deduplication check
    const existing = await db.tNRRecord.findFirst({
      where: {
        locationName,
        dateIntoDar: dateIntoDar ?? undefined,
      },
    })

    if (existing) {
      skipped++
      continue
    }

    const vol1Name = row[COL.vol1] as string | null
    const vol2Name = row[COL.vol2] as string | null
    const volunteer1Id = vol1Name ? volMap.get(vol1Name) ?? null : null
    const volunteer2Id = vol2Name ? volMap.get(vol2Name) ?? null : null

    const elapsedRaw = row[COL.elapsedDays]
    const elapsedDays =
      typeof elapsedRaw === 'number' && elapsedRaw > 0 ? Math.round(elapsedRaw) : null

    if (dryRun) {
      console.log(`  [dry-run] Would import row ${rowNum}: ${locationName}`)
      imported++
      continue
    }

    await db.tNRRecord.create({
      data: {
        locationName,
        county: (row[COL.county] as string | null) ?? 'LOUTH',
        contactName: (row[COL.contactName] as string | null) ?? null,
        contactNumber: (row[COL.contactNumber] as string | null) ?? null,
        vetHospital: (row[COL.vetHospital] as string | null) ?? null,
        apRefNumber: (row[COL.apRefNumber] as string | null) ?? null,
        ageEstimate: (row[COL.ageEstimate] as string | null) ?? null,
        coatColour: (row[COL.coatColour] as string | null) ?? null,
        elapsedDays,
        notes: (row[COL.notes] as string | null) ?? null,
        sex: parseSex(row[COL.sex]),
        fivResult: parseFivFelv(row[COL.fivResult]),
        felvResult: parseFivFelv(row[COL.felvResult]),
        status: parseStatus(row[COL.status], rowNum, warnings),
        outcome: parseOutcome(row[COL.outcome], rowNum, warnings),
        dateIntoDar: dateIntoDar ?? new Date('1970-01-01'), // fallback: required field
        dateOutOfDar,
        dateNeutered,
        volunteer1Id,
        volunteer2Id,
      },
    })
    imported++
  }

  return { imported, skipped }
}
```

- [ ] **Step 2: Verify compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-tnr.ts
git commit -m "feat(import): add Phase 2 TNR row mapper and import loop"
```

---

### Task 4: Main entrypoint, dry-run flag, and summary output

**Files:**
- Modify: `scripts/import-tnr.ts`

- [ ] **Step 1: Add the `main` function at the bottom of the file**

```typescript
// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('=== DRY RUN — no database writes ===\n')

  const db = getTenantClient('dar')
  const warnings: string[] = []

  // Read Excel
  const wb = XLSX.readFile('Support docs/DAR TNR ONLY REGISTER.xlsx')
  const ws = wb.Sheets['TNR ONLY']
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  console.log(`Read ${rows.length} rows from Excel\n`)

  // Phase 1
  console.log('=== Phase 1: Volunteers ===')
  const volMap = await upsertVolunteers(db, dryRun)

  // Phase 2
  console.log('\n=== Phase 2: TNR records ===')
  const { imported, skipped } = await importTnrRecords(db, rows, volMap, dryRun, warnings)

  // Summary
  console.log('\n=== Summary ===')
  console.log(`TNR records: ${imported} imported, ${skipped} skipped (duplicates)`)
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

- [ ] **Step 2: Verify the full file compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-tnr.ts
git commit -m "feat(import): add main entrypoint with dry-run flag and summary"
```

---

### Task 5: Run dry-run, then real import, then verify

**Files:** none

- [ ] **Step 1: Run dry-run and inspect output**

```bash
npx tsx scripts/import-tnr.ts --dry-run 2>&1 | head -60
```

Expected: reads 281 rows, Phase 1 matches L MARTINEZ, would create 6 stubs, Phase 2 would import 281 records. Any unexpected output means a bug to fix before proceeding.

- [ ] **Step 2: Run the real import**

```bash
npx tsx scripts/import-tnr.ts
```

Expected summary:
```
Volunteers: 6 created, 1 matched
TNR records: 281 imported, 0 skipped (duplicates)
Warnings: N  (some date warnings are expected)
```

- [ ] **Step 3: Verify record count in the database**

```bash
node -e "
require('dotenv/config')
const { Client } = require('pg')
const c = new Client({ connectionString: process.env.DATABASE_URL })
c.connect().then(() => c.query('SELECT COUNT(*) FROM dar.tnr_records')).then(r => {
  console.log('TNR records:', r.rows[0].count)
  return c.end()
})
"
```

Expected: `TNR records: 281`

- [ ] **Step 4: Verify volunteer count**

```bash
node -e "
require('dotenv/config')
const { Client } = require('pg')
const c = new Client({ connectionString: process.env.DATABASE_URL })
c.connect().then(() => c.query('SELECT COUNT(*) FROM dar.volunteers')).then(r => {
  console.log('Volunteers:', r.rows[0].count)
  return c.end()
})
"
```

Expected: `Volunteers: 7` (Lisa + 6 stubs)

- [ ] **Step 5: Smoke-test via the app — open the admin and confirm TNR data is visible**

Run `npm run dev`, open `http://localhost:3000`, navigate to the TNR section and confirm records appear.

- [ ] **Step 6: Commit the cleanup script alongside the importer**

```bash
git add scripts/import-tnr.ts
git commit -m "feat(import): TNR import complete — 281 records, 7 volunteers"
```
