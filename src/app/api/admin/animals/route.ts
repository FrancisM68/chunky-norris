import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";
import { validateAnimalBody } from "./validate";

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

// ---------------------------------------------------------------------------
// POST /api/admin/animals
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getTenantClient("dar");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const errors = validateAnimalBody(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });
    }

    const animal = await db.animal.create({
      data: {
        officialName: body.officialName,
        nickname: body.nickname || null,
        species: body.species,
        speciesOther: body.species === "OTHER" ? (body.speciesOther || null) : null,
        breed: body.breed || null,
        description: body.description || null,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        dobIsEstimate: body.dobIsEstimate ?? false,
        ageAtIntake: body.ageAtIntake || null,
        microchipNumber: body.microchipNumber || null,
        microchipDate: body.microchipDate ? new Date(body.microchipDate) : null,
        intakeDate: new Date(body.intakeDate),
        intakeSource: body.intakeSource,
        strayLocation: body.intakeSource === "STRAY" ? (body.strayLocation || null) : null,
        infoSource: body.infoSource || null,
        darRefNumber: body.darRefNumber || null,
        vetRefNumber: body.vetRefNumber || null,
        vaccinationStatus: body.vaccinationStatus || null,
        v1Date: body.v1Date ? new Date(body.v1Date) : null,
        v2Date: body.v2Date ? new Date(body.v2Date) : null,
        vaccineType: body.vaccineType || null,
        neuteredDate: body.neuteredDate ? new Date(body.neuteredDate) : null,
        neuteredVet: body.neuteredVet || null,
        fivResult: body.species === "CAT" ? (body.fivResult || null) : null,
        felvResult: body.species === "CAT" ? (body.felvResult || null) : null,
        kennelCoughDate:
          body.species === "DOG" && body.kennelCoughDate
            ? new Date(body.kennelCoughDate)
            : null,
        rabiesDate:
          body.species === "DOG" && body.rabiesDate ? new Date(body.rabiesDate) : null,
        condition: body.species === "DOG" ? (body.condition || null) : null,
        status: body.status,
        currentLocation: body.currentLocation || null,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        disposalMethod: body.disposalMethod || null,
        notes: body.notes || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: animal.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create animal", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}
