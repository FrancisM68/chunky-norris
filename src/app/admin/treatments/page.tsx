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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TreatmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const db = getTenantClient("dar");

  // Fetch animals in active care with their most recent treatment log
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

  // Animals overdue (no treatment in 30 days, or never treated)
  const now = Date.now();
  const overdue = animalsInCare.filter((a) => {
    const last = a.treatmentLogs[0]?.administeredAt;
    return !last || now - new Date(last).getTime() > THIRTY_DAYS_MS;
  });

  // Recent treatments across all animals (last 20)
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
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", marginBottom: 24 }}>
        Treatments
      </h1>

      {/* Compliance flag section */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>
            Overdue — No treatment in 30+ days
          </h2>
          {overdue.length > 0 && (
            <span
              style={{
                backgroundColor: "#fff3e0",
                color: "#e65100",
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
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
              borderRadius: 8,
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            All animals in care have been treated within the last 30 days.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Animal</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Species</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>In Care Since</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Last Treatment</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}></th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((animal) => {
                  const last = animal.treatmentLogs[0]?.administeredAt;
                  const days = last ? daysSince(last) : null;
                  return (
                    <tr key={animal.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <Link
                          href={`/admin/animals/${animal.id}`}
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <div style={{ fontWeight: 600, color: "#111827" }}>
                            {animal.nickname ?? animal.officialName}
                          </div>
                          {animal.nickname && (
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                              {animal.officialName}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>
                        {speciesLabel(animal.species)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>
                        {formatDate(animal.intakeDate)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {last ? (
                          <span style={{ color: "#e65100", fontWeight: 500 }}>
                            {formatDate(last)} ({days}d ago)
                          </span>
                        ) : (
                          <span style={{ color: "#b91c1c", fontWeight: 600 }}>Never</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <Link
                          href={`/admin/animals/${animal.id}/treatments`}
                          style={{
                            fontSize: 12,
                            color: "#2D5A27",
                            textDecoration: "none",
                            fontWeight: 500,
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

      {/* Recent treatment log */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
          Recent Treatments
        </h2>

        {recentLogs.length === 0 ? (
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              color: "#6b7280",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            No treatment logs recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Date / Time</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Animal</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Species</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Medication</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Type</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>Administered By</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                      {formatDateTime(log.administeredAt)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Link
                        href={`/admin/animals/${log.animal.id}/treatments`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div style={{ fontWeight: 500, color: "#111827" }}>
                          {log.animal.nickname ?? log.animal.officialName}
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>
                      {speciesLabel(log.animal.species)}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>
                      {log.medicationNameFreeText ?? log.medicationName}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>
                      {medicationTypeLabel(log.medicationType)}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>
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
  );
}
