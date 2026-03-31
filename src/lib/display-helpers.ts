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
} {
  const map: Record<string, { backgroundColor: string; color: string }> = {
    IN_CARE: { backgroundColor: "#fff3e0", color: "#e65100" },
    FOSTERED: { backgroundColor: "#e8f5e9", color: "#2D5A27" },
    ADOPTED: { backgroundColor: "#e3f2fd", color: "#1565c0" },
    RETURNED_TO_OWNER: { backgroundColor: "#f3e5f5", color: "#6a1b9a" },
    EUTHANISED: { backgroundColor: "#fce4ec", color: "#b71c1c" },
    DIED_IN_CARE: { backgroundColor: "#fce4ec", color: "#b71c1c" },
    TNR_RETURNED: { backgroundColor: "#f1f8e9", color: "#558b2f" },
  };
  return map[status] ?? { backgroundColor: "#f3f4f6", color: "#374151" };
}
