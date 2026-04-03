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

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", marginBottom: 20 }}>
        TNR Records
      </h1>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Total Records", value: stats.total },
          { label: "In Progress", value: stats.inProgress },
          { label: "Completed", value: stats.completed },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              backgroundColor: "#fff",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
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
          marginBottom: 16,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Scope toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          <a
            href={`/admin/tnr?scope=in_progress${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: scope === "in_progress" ? "#2D5A27" : "#f3f4f6",
              color: scope === "in_progress" ? "#fff" : "#374151",
            }}
          >
            In Progress
          </a>
          <a
            href={`/admin/tnr?scope=all${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
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
                  style={{ padding: "10px 12px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}
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
                  style={{ padding: "32px 12px", textAlign: "center", color: "#6b7280" }}
                >
                  No TNR records found.
                </td>
              </tr>
            )}
            {records.map((rec) => (
              <tr key={rec.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 12px", color: "#111827", fontWeight: 500, maxWidth: 220 }}>
                  {rec.locationName}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {rec.county}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {formatDate(rec.dateIntoDar)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {formatDate(rec.dateOutOfDar)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      ...tnrStatusPillStyle(rec.status),
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tnrStatusLabel(rec.status)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {rec.outcome ? tnrOutcomeLabel(rec.outcome) : "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {rec.sex ? tnrSexLabel(rec.sex) : "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {rec.fivResult && rec.felvResult ? fivFelvLabel(rec.fivResult, rec.felvResult) : "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {volunteerNames(rec.volunteer1, rec.volunteer2)}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {rec.contactName ?? "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                  {rec.contactNumber ?? "—"}
                </td>
                <td style={{ padding: "10px 12px", color: "#374151" }}>
                  {rec.vetHospital ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
