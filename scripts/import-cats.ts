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
      console.log(`  Matched fosterer: ${raw} → ${existing.firstName} ${existing.lastName} (${existing.id})`)
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
        ageAtIntake:       row[COL.ageAtIntake] != null ? String(row[COL.ageAtIntake]) : null,
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
