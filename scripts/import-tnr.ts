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
