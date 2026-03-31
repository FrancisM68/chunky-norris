import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import {
  speciesLabel,
  genderLabel,
  statusLabel,
  statusPillStyle,
} from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnimalRow {
  id: string;
  officialName: string;
  nickname: string | null;
  species: string;
  status: string;
  breed: string | null;
  gender: string;
  intakeDate: Date;
  departureDate: Date | null;
  fosterName: string | null;
  daysInCare: number;
}

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
// Data fetching
// ---------------------------------------------------------------------------

async function fetchAnimals(scope: string, q: string): Promise<AnimalRow[]> {
  const db = getTenantClient("dar");

  const animals = await db.animal.findMany({
    where: {
      ...(scope === "all"
        ? {}
        : { status: { in: ["IN_CARE", "FOSTERED"] } }),
      ...(q
        ? {
            OR: [
              { officialName: { contains: q, mode: "insensitive" as const } },
              { nickname: { contains: q, mode: "insensitive" as const } },
              {
                fosterAssignments: {
                  some: {
                    isActive: true,
                    foster: {
                      OR: [
                        { firstName: { contains: q, mode: "insensitive" as const } },
                        { lastName: { contains: q, mode: "insensitive" as const } },
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

  return animals.map((animal) => ({
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
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = params.scope ?? "in_care";
  const q = params.q ?? "";

  const animals = await fetchAnimals(scope, q);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", marginBottom: 20 }}>
        Animals
      </h1>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Left: scope toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          <Link
            href="/admin/animals?scope=in_care"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: scope === "in_care" ? "#2D5A27" : "#f3f4f6",
              color: scope === "in_care" ? "#fff" : "#374151",
            }}
          >
            In Care
          </Link>
          <Link
            href="/admin/animals?scope=all"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: scope === "all" ? "#2D5A27" : "#f3f4f6",
              color: scope === "all" ? "#fff" : "#374151",
            }}
          >
            All Animals
          </Link>
        </div>

        {/* Right: search + add button */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <form method="GET" action="/admin/animals" style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="scope" value={scope} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name or foster..."
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 13,
                width: 240,
              }}
            />
            <button
              type="submit"
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                backgroundColor: "#fff",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </form>
          <Link
            href="/admin/animals/new"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: "#2D5A27",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            + Add Animal
          </Link>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #e5e7eb",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Name</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Species</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Status</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Foster</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Intake</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Breed</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Gender</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Days in Care</th>
            </tr>
          </thead>
          <tbody>
            {animals.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "32px 12px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No animals found.
                </td>
              </tr>
            )}
            {animals.map((animal) => (
              <tr
                key={animal.id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer",
                }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    href={`/admin/animals/${animal.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontWeight: 600, color: "#111827" }}>
                      {animal.nickname ?? animal.officialName}
                    </div>
                    {animal.nickname && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        {animal.officialName}
                      </div>
                    )}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {speciesLabel(animal.species)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      ...statusPillStyle(animal.status),
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-block",
                    }}
                  >
                    {statusLabel(animal.status)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {animal.fosterName ?? "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {new Date(animal.intakeDate).toLocaleDateString("en-IE")}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {animal.breed ?? "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {genderLabel(animal.gender)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {animal.daysInCare}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
