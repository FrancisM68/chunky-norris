import { NextRequest, NextResponse } from "next/server";
import { MedicationType, DosageUnit, MedicationDisposal } from "@prisma/client";
import { getTenantClient } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// P0 compliance fields — every one of these is required by the Department of
// Agriculture. Do not make them optional without explicit stakeholder approval.
// ---------------------------------------------------------------------------
const P0_FIELDS = [
  "animalId",
  "medicationType",
  "medicationName",
  "dosageAmount",
  "dosageUnit",
  "administeredAt",
  "administeredById",
  "animalWeightKg",
  "medicationDisposal",
] as const;

type P0Field = (typeof P0_FIELDS)[number];

function missingP0Fields(body: Record<string, unknown>): P0Field[] {
  return P0_FIELDS.filter(
    (field) =>
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
  );
}

function rescueSlug(req: NextRequest): string | null {
  return req.headers.get("x-rescue-slug");
}

// ---------------------------------------------------------------------------
// POST /api/treatment-logs
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest): Promise<NextResponse> {
  const slug = rescueSlug(req);
  if (!slug) {
    return NextResponse.json(
      { error: "Missing required header: x-rescue-slug" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const missing = missingP0Fields(body);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Missing required compliance fields",
        missingFields: missing,
        detail: `The following fields are required by the Department of Agriculture: ${missing.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (
    !Object.values(MedicationType).includes(body.medicationType as MedicationType)
  ) {
    return NextResponse.json(
      { error: `Invalid medicationType: "${body.medicationType}"` },
      { status: 400 }
    );
  }

  if (!Object.values(DosageUnit).includes(body.dosageUnit as DosageUnit)) {
    return NextResponse.json(
      { error: `Invalid dosageUnit: "${body.dosageUnit}"` },
      { status: 400 }
    );
  }

  if (
    !Object.values(MedicationDisposal).includes(
      body.medicationDisposal as MedicationDisposal
    )
  ) {
    return NextResponse.json(
      { error: `Invalid medicationDisposal: "${body.medicationDisposal}"` },
      { status: 400 }
    );
  }

  let prisma;
  try {
    prisma = getTenantClient(slug);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid rescue slug" },
      { status: 400 }
    );
  }

  try {
    const log = await prisma.treatmentLog.create({
      data: {
        animalId: body.animalId as string,
        administeredById: body.administeredById as string,
        medicationType: body.medicationType as MedicationType,
        medicationName: body.medicationName as string,
        medicationNameFreeText:
          (body.medicationNameFreeText as string | undefined) ?? null,
        dosageAmount: Number(body.dosageAmount),
        dosageUnit: body.dosageUnit as DosageUnit,
        batchNumber: (body.batchNumber as string | undefined) ?? null,
        administeredAt: new Date(body.administeredAt as string),
        animalWeightKg: Number(body.animalWeightKg),
        medicationDisposal: body.medicationDisposal as MedicationDisposal,
        treatmentReason: (body.treatmentReason as string | undefined) ?? null,
        notes: (body.notes as string | undefined) ?? null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to create treatment log",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/treatment-logs?animalId=<id>
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest): Promise<NextResponse> {
  const slug = rescueSlug(req);
  if (!slug) {
    return NextResponse.json(
      { error: "Missing required header: x-rescue-slug" },
      { status: 400 }
    );
  }

  const animalId = new URL(req.url).searchParams.get("animalId");
  if (!animalId) {
    return NextResponse.json(
      { error: "Missing required query parameter: animalId" },
      { status: 400 }
    );
  }

  let prisma;
  try {
    prisma = getTenantClient(slug);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid rescue slug" },
      { status: 400 }
    );
  }

  try {
    const logs = await prisma.treatmentLog.findMany({
      where: { animalId },
      orderBy: { administeredAt: "desc" },
      include: {
        administeredBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch treatment logs",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
