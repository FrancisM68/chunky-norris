import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import {
  tnrStatusLabel,
  tnrStatusPillStyle,
  tnrOutcomeLabel,
  tnrSexLabel,
  fivFelvLabel,
} from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENTINEL_DATE = "1970-01-01";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (d.toISOString().startsWith(SENTINEL_DATE)) return "—";
  return d.toLocaleDateString("en-IE");
}

function volunteerNames(
  v1: { lastName: string } | null,
  v2: { lastName: string } | null
): string {
  const names = [v1?.lastName, v2?.lastName].filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchTnrData(scope: string, q: string) {
  const db = getTenantClient("dar");

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
      include: {
        volunteer1: { select: { lastName: true } },
        volunteer2: { select: { lastName: true } },
      },
      orderBy: { dateIntoDar: "desc" },
    }),
    db.tNRRecord.count(),
    db.tNRRecord.count({ where: { status: { in: ["IN_PROGRESS", "ON_HOLD"] } } }),
    db.tNRRecord.count({ where: { status: "COMPLETED" } }),
  ]);

  return { records, stats: { total, inProgress, completed } };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function TNRPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = params.scope ?? "in_progress";
  const q = params.q ?? "";

  const { records, stats } = await fetchTnrData(scope, q);

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
  });

  return (
    <div>
      {/* Green page header */}
      <div style={{ backgroundColor: "#2D5A27", padding: "24px 32px" }}>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#fff",
            margin: 0,
          }}
        >
          TNR Records
        </h1>
        <div
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            marginTop: 4,
          }}
        >
          Trap, Neuter, Return operations
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: "28px 32px" }}>

        {/* Stats cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "Total Records", value: stats.total },
            { label: "In Progress", value: stats.inProgress },
            { label: "Completed", value: stats.completed },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                backgroundColor: "#fff",
                minWidth: 140,
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#1C2A19",
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 12,
                  color: "#6B7A5E",
                  marginTop: 6,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

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
            <a
              href={`/admin/tnr?scope=in_progress${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              style={scopeButtonStyle(scope === "in_progress")}
            >
              In Progress
            </a>
            <a
              href={`/admin/tnr?scope=all${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              style={scopeButtonStyle(scope === "all")}
            >
              All Records
            </a>
          </div>

          {/* Search */}
          <form method="GET" action="/admin/tnr" style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="scope" value={scope} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by location..."
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
                  {[
                    "Location",
                    "County",
                    "Date In",
                    "Date Out",
                    "Status",
                    "Outcome",
                    "Sex",
                    "FIV/FeLV",
                    "Volunteer(s)",
                    "Contact",
                    "Phone",
                    "Vet",
                  ].map((col) => (
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
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      style={{
                        padding: "48px 20px",
                        textAlign: "center",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#9AA890",
                      }}
                    >
                      No TNR records found.
                    </td>
                  </tr>
                )}
                {records.map((rec) => (
                  <tr
                    key={rec.id}
                    className="table-row"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                  >
                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        color: "#1C2A19",
                        fontWeight: 500,
                        maxWidth: 220,
                      }}
                    >
                      {rec.locationName}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E" }}>
                      {rec.county}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E", whiteSpace: "nowrap" }}>
                      {formatDate(rec.dateIntoDar)}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E", whiteSpace: "nowrap" }}>
                      {formatDate(rec.dateOutOfDar)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          ...tnrStatusPillStyle(rec.status),
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontFamily: "'Instrument Sans', sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tnrStatusLabel(rec.status)}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E", whiteSpace: "nowrap" }}>
                      {rec.outcome ? tnrOutcomeLabel(rec.outcome) : "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E" }}>
                      {rec.sex ? tnrSexLabel(rec.sex) : "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E", whiteSpace: "nowrap" }}>
                      {rec.fivResult && rec.felvResult ? fivFelvLabel(rec.fivResult, rec.felvResult) : "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E" }}>
                      {volunteerNames(rec.volunteer1, rec.volunteer2)}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E" }}>
                      {rec.contactName ?? "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E", whiteSpace: "nowrap" }}>
                      {rec.contactNumber ?? "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#6B7A5E" }}>
                      {rec.vetHospital ?? "—"}
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
