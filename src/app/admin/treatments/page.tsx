import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import { speciesLabel, medicationTypeLabel } from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IE");
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-IE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const cellStyle: React.CSSProperties = {
  padding: "14px 20px",
  fontFamily: "'Instrument Sans', sans-serif",
  fontSize: 14,
  color: "#6B7A5E",
};

const thStyle: React.CSSProperties = {
  padding: "12px 20px",
  fontFamily: "'Instrument Sans', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  color: "#6B7A5E",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  textAlign: "left",
  whiteSpace: "nowrap",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TreatmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const db = getTenantClient("dar");

  const animalsInCare = await db.animal.findMany({
    where: { status: { in: ["IN_CARE", "FOSTERED"] } },
    select: {
      id: true,
      officialName: true,
      nickname: true,
      species: true,
      status: true,
      intakeDate: true,
      treatmentLogs: {
        orderBy: { administeredAt: "desc" },
        take: 1,
        select: { administeredAt: true },
      },
    },
    orderBy: { intakeDate: "asc" },
  });

  const now = Date.now();
  const overdue = animalsInCare.filter((a) => {
    const last = a.treatmentLogs[0]?.administeredAt;
    return !last || now - new Date(last).getTime() > THIRTY_DAYS_MS;
  });

  const recentLogs = await db.treatmentLog.findMany({
    orderBy: { administeredAt: "desc" },
    take: 20,
    include: {
      animal: { select: { id: true, officialName: true, nickname: true, species: true } },
      administeredBy: { select: { firstName: true, lastName: true } },
    },
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
          Treatments
        </h1>
        <div
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            marginTop: 4,
          }}
        >
          Compliance log · Department of Agriculture reporting
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: "28px 32px" }}>

        {/* Overdue section */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#1C2A19",
                margin: 0,
              }}
            >
              Overdue
            </h2>
            <span
              style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 11,
                color: "#6B7A5E",
              }}
            >
              No treatment in 30+ days
            </span>
            {overdue.length > 0 && (
              <span
                style={{
                  backgroundColor: "#FFF3CD",
                  color: "#7A5C00",
                  border: "1px solid #F0D060",
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 6,
                }}
              >
                {overdue.length} animal{overdue.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {overdue.length === 0 ? (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                backgroundColor: "#EEF5EC",
                border: "1px solid #A8D5A2",
                color: "#2D5A27",
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              All animals in care have been treated within the last 30 days.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#EEF5EC" }}>
                    {["Animal", "Species", "In Care Since", "Last Treatment", ""].map((col) => (
                      <th key={col} style={thStyle}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((animal) => {
                    const last = animal.treatmentLogs[0]?.administeredAt;
                    const days = last ? daysSince(last) : null;
                    return (
                      <tr
                        key={animal.id}
                        style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                        className="table-row"
                      >
                        <td style={{ padding: "14px 20px" }}>
                          <Link href={`/admin/animals/${animal.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: "#1C2A19" }}>
                              {animal.nickname ?? animal.officialName}
                            </div>
                            {animal.nickname && (
                              <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 11, color: "#9AA890", marginTop: 2 }}>
                                {animal.officialName}
                              </div>
                            )}
                          </Link>
                        </td>
                        <td style={cellStyle}>{speciesLabel(animal.species)}</td>
                        <td style={cellStyle}>{formatDate(animal.intakeDate)}</td>
                        <td style={{ padding: "14px 20px" }}>
                          {last ? (
                            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#7A5C00", fontWeight: 500 }}>
                              {formatDate(last)} ({days}d ago)
                            </span>
                          ) : (
                            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#922B21", fontWeight: 600 }}>
                              Never
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <Link
                            href={`/admin/animals/${animal.id}/treatments`}
                            style={{
                              fontFamily: "'Instrument Sans', sans-serif",
                              fontSize: 13,
                              color: "#2D5A27",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            View logs →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent treatments section */}
        <section>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 20,
              fontWeight: 600,
              color: "#1C2A19",
              marginBottom: 16,
              marginTop: 0,
            }}
          >
            Recent Treatments
          </h2>

          {recentLogs.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "#9AA890",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 16,
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 14,
                backgroundColor: "#fff",
              }}
            >
              No treatment logs recorded yet.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#EEF5EC" }}>
                    {["Date / Time", "Animal", "Species", "Medication", "Type", "Administered By"].map((col) => (
                      <th key={col} style={thStyle}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F9F7F3"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ""; }}
                    >
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatDateTime(log.administeredAt)}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <Link href={`/admin/animals/${log.animal.id}/treatments`} style={{ textDecoration: "none", color: "inherit" }}>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: "#1C2A19" }}>
                            {log.animal.nickname ?? log.animal.officialName}
                          </div>
                        </Link>
                      </td>
                      <td style={cellStyle}>{speciesLabel(log.animal.species)}</td>
                      <td style={{ ...cellStyle, color: "#1C2A19" }}>
                        {log.medicationNameFreeText ?? log.medicationName}
                      </td>
                      <td style={cellStyle}>{medicationTypeLabel(log.medicationType)}</td>
                      <td style={cellStyle}>
                        {log.administeredBy.firstName} {log.administeredBy.lastName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
