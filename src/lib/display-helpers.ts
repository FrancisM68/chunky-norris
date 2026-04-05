// ---------------------------------------------------------------------------
// Display helpers for enum values in the admin UI.
// Pure functions — no side effects, no database access.
// ---------------------------------------------------------------------------

export function speciesLabel(species: string): string {
  const map: Record<string, string> = {
    CAT: "Cat",
    DOG: "Dog",
    RABBIT: "Rabbit",
    FERRET: "Ferret",
    OTHER: "Other",
  };
  return map[species] ?? species;
}

export function genderLabel(gender: string): string {
  const map: Record<string, string> = {
    MALE_INTACT: "M/I",
    MALE_NEUTERED: "M/N",
    FEMALE_INTACT: "F/I",
    FEMALE_NEUTERED: "F/N",
    UNKNOWN: "?",
  };
  return map[gender] ?? gender;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    IN_CARE: "In Care",
    FOSTERED: "Fostered",
    ADOPTED: "Adopted",
    RETURNED_TO_OWNER: "Returned to Owner",
    EUTHANISED: "Euthanised",
    DIED_IN_CARE: "Died in Care",
    TNR_RETURNED: "TNR Returned",
  };
  return map[status] ?? status;
}

export function statusPillStyle(status: string): {
  backgroundColor: string;
  color: string;
  border: string;
} {
  const map: Record<string, { backgroundColor: string; color: string; border: string }> = {
    IN_CARE: { backgroundColor: "#EEF5EC", color: "#2D5A27", border: "1px solid #A8D5A2" },
    FOSTERED: { backgroundColor: "#FFF3CD", color: "#7A5C00", border: "1px solid #F0D060" },
    ADOPTED: { backgroundColor: "#E8F4FD", color: "#1A5276", border: "1px solid #AED6F1" },
    RETURNED_TO_OWNER: { backgroundColor: "#F4ECF7", color: "#6C3483", border: "1px solid #D7BDE2" },
    EUTHANISED: { backgroundColor: "#FDECEA", color: "#922B21", border: "1px solid #F1948A" },
    DIED_IN_CARE: { backgroundColor: "#FDECEA", color: "#922B21", border: "1px solid #F1948A" },
    TNR_RETURNED: { backgroundColor: "#F4ECF7", color: "#6C3483", border: "1px solid #D7BDE2" },
  };
  return map[status] ?? { backgroundColor: "#f3f4f6", color: "#6B7A5E", border: "1px solid rgba(0,0,0,0.1)" };
}

export function disposalMethodLabel(method: string): string {
  const map: Record<string, string> = {
    REHOMED: "Rehomed",
    RECLAIMED: "Reclaimed",
    EUTHANISED: "Euthanised",
    DIED_IN_CARE: "Died in Care",
    TNR_RETURNED: "TNR Returned",
    TRANSFERRED: "Transferred",
  };
  return map[method] ?? method;
}

export function medicationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    DEWORMING: "Deworming",
    FLEA_TREATMENT: "Flea Treatment",
    TICK_TREATMENT: "Tick Treatment",
    VACCINATION: "Vaccination",
    ANTIBIOTIC: "Antibiotic",
    ANTI_INFLAMMATORY: "Anti-inflammatory",
    EYE_DROPS: "Eye Drops",
    EAR_DROPS: "Ear Drops",
    LONG_TERM_MEDICATION: "Long-term Medication",
    OTHER: "Other",
  };
  return map[type] ?? type;
}

export function dosageUnitLabel(unit: string): string {
  const map: Record<string, string> = {
    ML: "ml",
    MG: "mg",
    TABLET: "tablet",
    HALF_TABLET: "½ tablet",
    PIPETTE: "pipette",
    SPOT_ON: "spot-on",
    SPRAY_DOSE: "spray dose",
    OTHER: "other",
  };
  return map[unit] ?? unit;
}

export function medicationDisposalLabel(disposal: string): string {
  const map: Record<string, string> = {
    ADMINISTERED_IN_FULL: "Administered in full",
    PARTIAL_RETURNED: "Partial — returned to stock",
    DISPOSED_OF: "Remainder disposed of",
    COURSE_ONGOING: "Course ongoing",
  };
  return map[disposal] ?? disposal;
}

export function tnrStatusLabel(status: string): string {
  const map: Record<string, string> = {
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    ON_HOLD: "On Hold",
  };
  return map[status] ?? status;
}

export function tnrStatusPillStyle(status: string): {
  backgroundColor: string;
  color: string;
} {
  const map: Record<string, { backgroundColor: string; color: string }> = {
    IN_PROGRESS: { backgroundColor: "#fff3e0", color: "#e65100" },
    COMPLETED: { backgroundColor: "#f0fdf4", color: "#15803d" },
    ON_HOLD: { backgroundColor: "#f3f4f6", color: "#6b7280" },
  };
  return map[status] ?? { backgroundColor: "#f3f4f6", color: "#374151" };
}

export function tnrOutcomeLabel(outcome: string): string {
  const map: Record<string, string> = {
    RETURNED_RELEASED: "Returned / Released",
    REHOMED: "Rehomed",
    EUTHANISED: "PTS",
    DIED_IN_CARE: "Passed Away",
    TRANSFERRED: "Transferred",
  };
  return map[outcome] ?? outcome;
}

export function tnrSexLabel(sex: string): string {
  const map: Record<string, string> = {
    FEMALE_INTACT: "Female",
    MALE_INTACT: "Male",
    UNKNOWN: "Unknown",
  };
  return map[sex] ?? sex;
}

export function fivFelvLabel(fiv: string, felv: string): string {
  const fmt = (v: string) =>
    v === "POSITIVE" ? "+" : v === "NEGATIVE" ? "–" : "n/t";

  // Both not tested — compact form
  if (fiv === "NOT_TESTED" && felv === "NOT_TESTED") return "n/t";

  return `${fmt(fiv)}/${fmt(felv)}`;
}
