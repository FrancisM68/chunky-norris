import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";
import { validateTNRBody } from "../validate";

type Context = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/tnr/[id]
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getTenantClient("dar");

  try {
    const record = await db.tNRRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch TNR record", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/tnr/[id]
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getTenantClient("dar");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const existing = await db.tNRRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const errors = validateTNRBody(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });
    }

    const dateIn = new Date(body.dateIntoDar);
    const dateOut = body.dateOutOfDar ? new Date(body.dateOutOfDar) : null;
    const elapsedDays = dateOut
      ? Math.floor((dateOut.getTime() - dateIn.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const updated = await db.tNRRecord.update({
      where: { id },
      data: {
        locationName: body.locationName,
        county: body.county,
        contactName: body.contactName || null,
        contactNumber: body.contactNumber || null,
        sex: body.sex,
        ageEstimate: body.ageEstimate || null,
        coatColour: body.coatColour || null,
        earTipped: body.earTipped ?? false,
        dateIntoDar: dateIn,
        dateOutOfDar: dateOut,
        dateNeutered: body.dateNeutered ? new Date(body.dateNeutered) : null,
        elapsedDays,
        vetHospital: body.vetHospital || null,
        apRefNumber: body.apRefNumber || null,
        vaccinationStatus: body.vaccinationStatus || null,
        vaccineType: body.vaccineType || null,
        fivResult: body.fivResult || null,
        felvResult: body.felvResult || null,
        status: body.status,
        outcome: body.outcome || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update TNR record", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}
