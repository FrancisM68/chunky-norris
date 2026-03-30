import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

type Credentials = {
  email: string;
  password: string;
};

type AuthUser = {
  id: string;
  roles: Role[];
};

/**
 * Verifies email + password against a volunteer record.
 * Returns { id, roles } on success, null on any failure.
 * Accepts a db client so this function can be tested without Auth.js.
 */
export async function authorizeCredentials(
  credentials: Credentials,
  db: Pick<PrismaClient, "volunteer">
): Promise<AuthUser | null> {
  const volunteer = await db.volunteer.findUnique({
    where: { email: credentials.email },
    select: { id: true, roles: true, passwordHash: true },
  });

  if (!volunteer || !volunteer.passwordHash) return null;

  const valid = await bcrypt.compare(credentials.password, volunteer.passwordHash);
  if (!valid) return null;

  return { id: volunteer.id, roles: volunteer.roles };
}
