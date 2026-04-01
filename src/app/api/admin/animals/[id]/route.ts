import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";
import { validateAnimalBody } from "../validate";

type Context = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/animals/[id]
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getTenantClient("dar");

  try {
    const animal = await db.animal.findUnique({ where: { id } });
    if (!animal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(animal);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch animal", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/animals/[id]
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getTenantClient("dar");

  try {
    const existing = await db.animal.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const errors = validateAnimalBody(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });
    }

    const updated = await db.animal.update({
      where: { id },
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
        fivResult: body.species === "CAT" ? (body.fivResult || null) : existing.fivResult,
        felvResult: body.species === "CAT" ? (body.felvResult || null) : existing.felvResult,
        kennelCoughDate:
          body.species === "DOG"
            ? body.kennelCoughDate ? new Date(body.kennelCoughDate) : null
            : existing.kennelCoughDate,
        rabiesDate:
          body.species === "DOG"
            ? body.rabiesDate ? new Date(body.rabiesDate) : null
            : existing.rabiesDate,
        condition: body.species === "DOG" ? (body.condition || null) : existing.condition,
        status: body.status,
        currentLocation: body.currentLocation || null,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        disposalMethod: body.disposalMethod || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update animal", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}
