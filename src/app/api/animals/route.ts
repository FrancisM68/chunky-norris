import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/tenant";

// GET /api/animals?fosterId=<id>
// Returns the volunteer's name and their currently active foster animals.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const slug = req.headers.get("x-rescue-slug");
  if (!slug) {
    return NextResponse.json(
      { error: "Missing required header: x-rescue-slug" },
      { status: 400 }
    );
  }

  const fosterId = new URL(req.url).searchParams.get("fosterId");
  if (!fosterId) {
    return NextResponse.json(
      { error: "Missing required query parameter: fosterId" },
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
    const [volunteer, assignments] = await Promise.all([
      prisma.volunteer.findUnique({
        where: { id: fosterId },
        select: { firstName: true, lastName: true },
      }),
      prisma.fosterAssignment.findMany({
        where: { fosterId, isActive: true },
        include: { animal: true },
        orderBy: { startDate: "desc" },
      }),
    ]);

    if (!volunteer) {
      return NextResponse.json(
        { error: `No volunteer found with id "${fosterId}" in rescue "${slug}"` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      volunteer: { firstName: volunteer.firstName, lastName: volunteer.lastName },
      animals: assignments.map((a) => a.animal),
    });
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
