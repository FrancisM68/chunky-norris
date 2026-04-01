export const VALID_RESCUE_SLUGS = ["dar"] as const;

export type RescueSlug = (typeof VALID_RESCUE_SLUGS)[number];

export const TERMINAL_STATUSES = [
  "ADOPTED",
  "RETURNED_TO_OWNER",
  "EUTHANISED",
  "DIED_IN_CARE",
  "TNR_RETURNED",
] as const;

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];
