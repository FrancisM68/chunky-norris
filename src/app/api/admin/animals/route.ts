import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInCare(intakeDate: Date, departureDate: Date | null): number {
  const end = departureDate ?? new Date();
  return Math.floor(
    (end.getTime() - new Date(intakeDate).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/animals?scope=in_care|all&q=searchterm
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Parse query params ---
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "in_care";
  const q = searchParams.get("q") ?? "";

  // --- Query ---
  const db = getTenantClient("dar");

  try {
    const animals = await db.animal.findMany({
      where: {
        ...(scope === "all"
          ? {}
          : { status: { in: ["IN_CARE", "FOSTERED"] } }),
        ...(q
          ? {
              OR: [
                { officialName: { contains: q, mode: "insensitive" } },
                { nickname: { contains: q, mode: "insensitive" } },
                {
                  fosterAssignments: {
                    some: {
                      isActive: true,
                      foster: {
                        OR: [
                          {
                            firstName: { contains: q, mode: "insensitive" },
                          },
                          {
                            lastName: { contains: q, mode: "insensitive" },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        officialName: true,
        nickname: true,
        species: true,
        status: true,
        breed: true,
        gender: true,
        intakeDate: true,
        departureDate: true,
        fosterAssignments: {
          where: { isActive: true },
          select: {
            foster: { select: { firstName: true, lastName: true } },
          },
          take: 1,
        },
      },
      orderBy: { intakeDate: "desc" },
    });

    const rows = animals.map((animal) => ({
      id: animal.id,
      officialName: animal.officialName,
      nickname: animal.nickname,
      species: animal.species,
      status: animal.status,
      breed: animal.breed,
      gender: animal.gender,
      intakeDate: animal.intakeDate,
      departureDate: animal.departureDate,
      fosterName:
        animal.fosterAssignments.length > 0
          ? `${animal.fosterAssignments[0].foster.firstName} ${animal.fosterAssignments[0].foster.lastName}`
          : null,
      daysInCare: daysInCare(animal.intakeDate, animal.departureDate),
    }));

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch animals",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
