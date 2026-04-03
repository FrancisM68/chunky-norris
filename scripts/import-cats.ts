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
