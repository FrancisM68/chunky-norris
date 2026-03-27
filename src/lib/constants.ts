export const VALID_RESCUE_SLUGS = ["dar"] as const;

export type RescueSlug = (typeof VALID_RESCUE_SLUGS)[number];
