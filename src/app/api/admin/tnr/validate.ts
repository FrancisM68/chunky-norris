export interface TNRBody {
  locationName?: unknown;
  county?: unknown;
  sex?: unknown;
  dateIntoDar?: unknown;
  status?: unknown;
  outcome?: unknown;
  dateOutOfDar?: unknown;
  [key: string]: unknown;
}

export function validateTNRBody(body: TNRBody): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!body.locationName || typeof body.locationName !== "string" || !body.locationName.trim()) {
    errors.locationName = "Location name is required";
  }
  if (!body.county || typeof body.county !== "string" || !body.county.trim()) {
    errors.county = "County is required";
  }
  if (!body.sex || typeof body.sex !== "string" || !body.sex.trim()) {
    errors.sex = "Sex is required";
  }
  if (!body.dateIntoDar || typeof body.dateIntoDar !== "string" || !body.dateIntoDar.trim()) {
    errors.dateIntoDar = "Date into DAR is required";
  }
  if (!body.status) {
    errors.status = "Status is required";
  }
  if (body.status === "COMPLETED") {
    if (!body.outcome) {
      errors.outcome = "Outcome is required when status is Completed";
    }
    if (!body.dateOutOfDar) {
      errors.dateOutOfDar = "Date out of DAR is required when status is Completed";
    }
  }

  return errors;
}
