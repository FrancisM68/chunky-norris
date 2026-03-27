import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { VALID_RESCUE_SLUGS } from "./constants";

// Only lowercase letters, numbers, and underscores — prevents SQL injection
// in the SET search_path statement.
const SLUG_PATTERN = /^[a-z0-9_]+$/;

const tenantClientCache = new Map<string, PrismaClient>();

function createTenantClient(slug: string): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Set search_path immediately on every new connection so all queries issued
  // by this client target the rescue's own schema.
  pool.on("connect", (client) => {
    // slug has already been validated against SLUG_PATTERN — safe to interpolate.
    client.query(`SET search_path TO ${slug}, public`);
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * Returns a PrismaClient scoped to the given rescue's PostgreSQL schema.
 *
 * Throws if the slug:
 *  - contains characters outside [a-z0-9_] (SQL injection guard)
 *  - is not present in VALID_RESCUE_SLUGS (unknown tenant)
 */
export function getTenantClient(slug: string): PrismaClient {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Invalid rescue slug "${slug}": only lowercase letters, numbers, and underscores are permitted.`
    );
  }

  if (!(VALID_RESCUE_SLUGS as readonly string[]).includes(slug)) {
    throw new Error(
      `Unknown rescue slug "${slug}". Add it to VALID_RESCUE_SLUGS in src/lib/constants.ts before use.`
    );
  }

  // Re-use existing client in development to avoid exhausting connections
  // across hot-reloads, matching the pattern in prisma.ts.
  if (process.env.NODE_ENV !== "production") {
    const cached = tenantClientCache.get(slug);
    if (cached) return cached;
  }

  const client = createTenantClient(slug);

  if (process.env.NODE_ENV !== "production") {
    tenantClientCache.set(slug, client);
  }

  return client;
}
