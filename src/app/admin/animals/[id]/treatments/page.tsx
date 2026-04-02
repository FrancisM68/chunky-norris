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
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
        <Link href="/admin/animals" style={{ color: "#6b7280", textDecoration: "none" }}>
          Animals
        </Link>
        {" / "}
        <Link
          href={`/admin/animals/${id}`}
          style={{ color: "#6b7280", textDecoration: "none" }}
        >
          {displayName}
        </Link>
        {" / Treatments"}
      </div>

      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#111827", margin: 0 }}>
          Treatment History — {displayName}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={`/admin/animals/${id}`}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              color: "#374151",
            }}
          >
            ← Animal Profile
          </Link>
        </div>
      </div>

      {/* 30-day compliance warning */}
      {noTreatmentIn30Days && (
        <div
          style={{
            backgroundColor: "#fff3e0",
            border: "1px solid #fb8c00",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 600, color: "#e65100", fontSize: 13 }}>
              No treatments in the last 30 days
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {logs.length === 0
                ? "No treatment logs recorded for this animal yet."
                : `Last treatment was ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`}
              {" "}Department of Agriculture compliance may require review.
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "12px 20px",
            backgroundColor: "#fff",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
            {logs.length}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Total treatments
          </div>
        </div>
        {logs.length > 0 && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "12px 20px",
              backgroundColor: "#fff",
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              {formatDateTime(logs[0].administeredAt)}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
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
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            backgroundColor: "#fff",
          }}
        >
          No treatment logs recorded yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              backgroundColor: "#fff",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Date / Time</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Medication</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Type</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Dosage</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Weight (kg)</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Administered By</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Disposal</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, color: "#374151" }}>Reason / Notes</th>
              </tr>
            </thead>
            <tbody>
              {(logs as TreatmentRow[]).map((log) => (
                <tr
                  key={log.id}
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                    {formatDateTime(log.administeredAt)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#111827", fontWeight: 500 }}>
                    {log.medicationNameFreeText ?? log.medicationName}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#374151" }}>
                    {medicationTypeLabel(log.medicationType)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                    {log.dosageAmount} {dosageUnitLabel(log.dosageUnit)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#374151" }}>
                    {log.animalWeightKg} kg
                  </td>
                  <td style={{ padding: "10px 12px", color: "#374151" }}>
                    {log.administeredBy.firstName} {log.administeredBy.lastName}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#374151" }}>
                    {medicationDisposalLabel(log.medicationDisposal)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#6b7280", maxWidth: 200 }}>
                    {log.treatmentReason || log.notes
                      ? [log.treatmentReason, log.notes].filter(Boolean).join(" — ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
