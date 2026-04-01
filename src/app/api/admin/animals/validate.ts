import { TERMINAL_STATUSES } from "@/lib/constants";

export interface AnimalBody {
  officialName?: unknown;
  species?: unknown;
  speciesOther?: unknown;
  gender?: unknown;
  intakeDate?: unknown;
  intakeSource?: unknown;
  strayLocation?: unknown;
  status?: unknown;
  departureDate?: unknown;
  disposalMethod?: unknown;
  [key: string]: unknown;
}

/**
 * Validates a request body for animal create or update.
 * Returns a map of field → error message. Empty map = valid.
 */
export function validateAnimalBody(body: AnimalBody): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!body.officialName || typeof body.officialName !== "string" || !body.officialName.trim()) {
    errors.officialName = "Official name is required";
  }
  if (!body.species) {
    errors.species = "Species is required";
  }
  if (body.species === "OTHER" && (!body.speciesOther || !(body.speciesOther as string).trim())) {
    errors.speciesOther = "Please specify the species";
  }
  if (!body.gender) {
    errors.gender = "Gender is required";
  }
  if (!body.intakeDate) {
    errors.intakeDate = "Intake date is required";
  }
  if (!body.intakeSource) {
    errors.intakeSource = "Intake source is required";
  }
  if (
    body.intakeSource === "STRAY" &&
    (!body.strayLocation || !(body.strayLocation as string).trim())
  ) {
    errors.strayLocation = "Stray location is required when intake source is Stray";
  }
  if (!body.status) {
    errors.status = "Status is required";
  }
  if ((TERMINAL_STATUSES as readonly string[]).includes(body.status as string)) {
    if (!body.departureDate) {
      errors.departureDate = "Departure date is required";
    }
    if (!body.disposalMethod) {
      errors.disposalMethod = "Disposal method is required (DoA compliance)";
    }
  }

  return errors;
}
