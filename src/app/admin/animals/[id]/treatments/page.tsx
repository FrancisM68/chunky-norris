import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantClient } from "@/lib/tenant";
import {
  medicationTypeLabel,
  dosageUnitLabel,
  medicationDisposalLabel,
} from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreatmentRow {
  id: string;
  administeredAt: Date;
  medicationType: string;
  medicationName: string;
  medicationNameFreeText: string | null;
  dosageAmount: number;
  dosageUnit: string;
  animalWeightKg: number;
  medicationDisposal: string;
  treatmentReason: string | null;
  notes: string | null;
  batchNumber: string | null;
  administeredBy: { id: string; firstName: string; lastName: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function daysSinceLastTreatment(logs: TreatmentRow[]): number | null {
  if (logs.length === 0) return null;
  const latest = logs[0].administeredAt;
  return Math.floor((Date.now() - new Date(latest).getTime()) / (1000 * 60 * 60 * 24));
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

const cellStyle: React.CSSProperties = {
  padding: "14px 20px",
  fontFamily: "'Instrument Sans', sans-serif",
  fontSize: 14,
  color: "#6B7A5E",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TreatmentHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const db = getTenantClient("dar");

  const animal = await db.animal.findUnique({
    where: { id },
    select: { id: true, officialName: true, nickname: true, status: true },
  });
  if (!animal) notFound();

  const logs = await db.treatmentLog.findMany({
    where: { animalId: id },
    orderBy: { administeredAt: "desc" },
    include: {
      administeredBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const daysSince = daysSinceLastTreatment(logs as TreatmentRow[]);
  const noTreatmentIn30Days =
    logs.length === 0 || Date.now() - new Date(logs[0].administeredAt).getTime() > THIRTY_DAYS_MS;

  const displayName = animal.nickname ?? animal.officialName;

  return (
    <div>
      {/* Green page header */}
      <div style={{ backgroundColor: "#2D5A27", padding: "24px 32px" }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.55)",
            marginBottom: 8,
          }}
        >
          <Link href="/admin/animals" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
            Animals
          </Link>
          {" / "}
          <Link href={`/admin/animals/${id}`} style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
            {displayName}
          </Link>
          {" / Treatments"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 28,
              fontWeight: 600,
              color: "#fff",
              margin: 0,
            }}
          >
            Treatment History
          </h1>
          <Link
            href={`/admin/animals/${id}`}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1.5px solid rgba(255,255,255,0.35)",
              backgroundColor: "transparent",
              color: "#fff",
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ← Animal Profile
          </Link>
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: "28px 32px" }}>

        {/* 30-day compliance warning */}
        {noTreatmentIn30Days && (
          <div
            style={{
              backgroundColor: "#FFF3CD",
              border: "1px solid #F0D060",
              borderRadius: 12,
              padding: "14px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚠</span>
            <div>
              <div
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontWeight: 600,
                  color: "#7A5C00",
                  fontSize: 14,
                }}
              >
                No treatments in the last 30 days
              </div>
              <div
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 13,
                  color: "#9AA890",
                  marginTop: 2,
                }}
              >
                {logs.length === 0
                  ? "No treatment logs recorded for this animal yet."
                  : `Last treatment was ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`}
                {" "}Department of Agriculture compliance may require review.
              </div>
            </div>
          </div>
        )}

        {/* Summary stat cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 16,
              padding: "16px 24px",
              backgroundColor: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              minWidth: 130,
            }}
          >
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: "#1C2A19", lineHeight: 1 }}>
              {logs.length}
            </div>
            <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: "#6B7A5E", marginTop: 6 }}>
              Total treatments
            </div>
          </div>
          {logs.length > 0 && (
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 16,
                padding: "16px 24px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                minWidth: 180,
              }}
            >
              <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 15, fontWeight: 600, color: "#1C2A19" }}>
                {formatDateTime(logs[0].administeredAt)}
              </div>
              <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: "#6B7A5E", marginTop: 6 }}>
                Last treatment
              </div>
            </div>
          )}
        </div>

        {/* Treatment log table */}
        {logs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#9AA890",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 16,
              backgroundColor: "#fff",
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 14,
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
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#EEF5EC" }}>
                    {[
                      "Date / Time",
                      "Medication",
                      "Type",
                      "Dosage",
                      "Weight (kg)",
                      "Administered By",
                      "Disposal",
                      "Reason / Notes",
                    ].map((col) => (
                      <th key={col} style={thStyle}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(logs as TreatmentRow[]).map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                      className="table-row"
                    >
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatDateTime(log.administeredAt)}
                      </td>
                      <td style={{ ...cellStyle, color: "#1C2A19", fontWeight: 500 }}>
                        {log.medicationNameFreeText ?? log.medicationName}
                      </td>
                      <td style={cellStyle}>{medicationTypeLabel(log.medicationType)}</td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {log.dosageAmount} {dosageUnitLabel(log.dosageUnit)}
                      </td>
                      <td style={cellStyle}>{log.animalWeightKg} kg</td>
                      <td style={cellStyle}>
                        {log.administeredBy.firstName} {log.administeredBy.lastName}
                      </td>
                      <td style={cellStyle}>{medicationDisposalLabel(log.medicationDisposal)}</td>
                      <td style={{ ...cellStyle, maxWidth: 200 }}>
                        {log.treatmentReason || log.notes
                          ? [log.treatmentReason, log.notes].filter(Boolean).join(" — ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
