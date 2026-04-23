import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";
import { validateTNRBody } from "./validate";

// ---------------------------------------------------------------------------
// GET /api/admin/tnr?scope=in_progress|all&q=searchterm
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "in_progress";
  const q = searchParams.get("q") ?? "";

  const db = getTenantClient("dar");

  try {
    const statusFilter =
      scope === "all"
        ? undefined
        : { in: ["IN_PROGRESS", "ON_HOLD"] };

    const locationFilter = q
      ? { locationName: { contains: q, mode: "insensitive" as const } }
      : {};

    const where: any = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...locationFilter,
    };

    const [records, total, inProgress, completed] = await Promise.all([
      db.tNRRecord.findMany({
        where,
        select: {
          id: true,
          locationName: true,
          county: true,
          dateIntoDar: true,
          dateOutOfDar: true,
          status: true,
          outcome: true,
          sex: true,
          fivResult: true,
          felvResult: true,
          contactName: true,
          contactNumber: true,
          vetHospital: true,
          volunteer1: { select: { lastName: true } },
          volunteer2: { select: { lastName: true } },
        },
        orderBy: { dateIntoDar: "desc" },
      }),
      db.tNRRecord.count(),
      db.tNRRecord.count({ where: { status: { in: ["IN_PROGRESS", "ON_HOLD"] } } }),
      db.tNRRecord.count({ where: { status: "COMPLETED" } }),
    ]);

    return NextResponse.json({
      records,
      stats: { total, inProgress, completed },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch TNR records",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/tnr
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
    const errors = validateTNRBody(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });
    }

    const dateIn = new Date(body.dateIntoDar);
    const dateOut = body.dateOutOfDar ? new Date(body.dateOutOfDar) : null;
    const elapsedDays = dateOut
      ? Math.floor((dateOut.getTime() - dateIn.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const record = await db.tNRRecord.create({
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
      select: { id: true },
    });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create TNR record", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}
