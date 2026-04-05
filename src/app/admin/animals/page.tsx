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

function fosterNameFilter(q: string) {
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return {
      OR: [
        { firstName: { contains: q, mode: "insensitive" as const } },
        { lastName: { contains: q, mode: "insensitive" as const } },
      ],
    };
  }
  return {
    AND: parts.map((part) => ({
      OR: [
        { firstName: { contains: part, mode: "insensitive" as const } },
        { lastName: { contains: part, mode: "insensitive" as const } },
      ],
    })),
  };
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
                    foster: fosterNameFilter(q),
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
// Shared styles
// ---------------------------------------------------------------------------

const scopeButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'Instrument Sans', sans-serif",
  textDecoration: "none",
  border: active ? "none" : "1.5px solid rgba(0,0,0,0.12)",
  backgroundColor: active ? "#2D5A27" : "#fff",
  color: active ? "#fff" : "#6B7A5E",
  display: "inline-block",
  cursor: "pointer",
});

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
      {/* Green page header */}
      <div
        style={{
          backgroundColor: "#2D5A27",
          padding: "24px 32px",
        }}
      >
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#fff",
            margin: 0,
          }}
        >
          Animals
        </h1>
        <div
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            marginTop: 4,
          }}
        >
          {scope === "in_care" ? "Animals currently in care or fostered" : "All animal records"}
          {q ? ` · searching "${q}"` : ""}
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: "28px 32px" }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {/* Scope toggle */}
          <div style={{ display: "flex", gap: 6 }}>
            <Link href="/admin/animals?scope=in_care" style={scopeButtonStyle(scope === "in_care")}>
              In Care
            </Link>
            <Link href="/admin/animals?scope=all" style={scopeButtonStyle(scope === "all")}>
              All Animals
            </Link>
          </div>

          {/* Search + add */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <form method="GET" action="/admin/animals" style={{ display: "flex", gap: 8 }}>
              <input type="hidden" name="scope" value={scope} />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by name or foster..."
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(0,0,0,0.12)",
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 13,
                  color: "#1C2A19",
                  width: 240,
                  backgroundColor: "#fff",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: "1.5px solid #2D5A27",
                  backgroundColor: "transparent",
                  color: "#2D5A27",
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Search
              </button>
            </form>
            <Link
              href="/admin/animals/new"
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                backgroundColor: "#2D5A27",
                color: "#fff",
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              + Add Animal
            </Link>
          </div>
        </div>

        {/* Table card */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#EEF5EC" }}>
                  {["Name", "Species", "Status", "Foster", "Intake", "Breed", "Gender", "Days in Care"].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "12px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6B7A5E",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "48px 20px",
                        textAlign: "center",
                        color: "#9AA890",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                      }}
                    >
                      No animals found.
                    </td>
                  </tr>
                )}
                {animals.map((animal) => (
                  <tr
                    key={animal.id}
                    className="table-row"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <Link
                        href={`/admin/animals/${animal.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            fontFamily: "'Fraunces', serif",
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#1C2A19",
                          }}
                        >
                          {animal.nickname ?? animal.officialName}
                        </div>
                        {animal.nickname && (
                          <div
                            style={{
                              fontFamily: "'Instrument Sans', sans-serif",
                              fontSize: 11,
                              color: "#9AA890",
                              marginTop: 2,
                            }}
                          >
                            {animal.officialName}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#6B7A5E",
                      }}
                    >
                      {speciesLabel(animal.species)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          ...statusPillStyle(animal.status),
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontFamily: "'Instrument Sans', sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel(animal.status)}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#6B7A5E",
                      }}
                    >
                      {animal.fosterName ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#6B7A5E",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(animal.intakeDate).toLocaleDateString("en-IE")}
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#6B7A5E",
                      }}
                    >
                      {animal.breed ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#6B7A5E",
                      }}
                    >
                      {genderLabel(animal.gender)}
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#6B7A5E",
                        textAlign: "right",
                        paddingRight: 24,
                      }}
                    >
                      {animal.daysInCare}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
