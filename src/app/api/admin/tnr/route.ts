import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantClient } from "@/lib/tenant";

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
