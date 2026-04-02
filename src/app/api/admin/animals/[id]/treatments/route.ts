import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";

type Context = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/animals/[id]/treatments
// Returns all treatment logs for a specific animal, newest first.
// Includes the volunteer name (administeredBy).
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Context): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getTenantClient("dar");

  try {
    const animal = await db.animal.findUnique({ where: { id }, select: { id: true } });
    if (!animal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const logs = await db.treatmentLog.findMany({
      where: { animalId: id },
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
      { error: "Failed to fetch treatment logs", detail: err instanceof Error ? err.message : undefined },
      { status: 500 }
    );
  }
}
