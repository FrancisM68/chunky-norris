"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tnrStatusLabel, tnrOutcomeLabel } from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TNRDetail {
  id: string;
  locationName: string;
  county: string;
  contactName: string | null;
  contactNumber: string | null;
  sex: string;
  ageEstimate: string | null;
  coatColour: string | null;
  earTipped: boolean;
  dateIntoDar: string;
  dateOutOfDar: string | null;
  dateNeutered: string | null;
  vetHospital: string | null;
  apRefNumber: string | null;
  vaccinationStatus: string | null;
  vaccineType: string | null;
  fivResult: string | null;
  felvResult: string | null;
  status: string;
  outcome: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const SEX_OPTIONS = [
  { value: "FEMALE_INTACT", label: "Female" },
  { value: "MALE_INTACT", label: "Male" },
  { value: "UNKNOWN", label: "Unknown" },
];

const STATUS_OPTIONS = ["IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const;

const OUTCOME_OPTIONS = [
  "RETURNED_RELEASED",
  "REHOMED",
  "EUTHANISED",
  "DIED_IN_CARE",
  "TRANSFERRED",
] as const;

const VACCINATION_OPTIONS = [
  { value: "VACCINATED", label: "Vaccinated" },
  { value: "UNVACCINATED", label: "Unvaccinated" },
  { value: "UNKNOWN", label: "Unknown" },
];

const TEST_RESULT_OPTIONS = [
  { value: "POSITIVE", label: "Positive" },
  { value: "NEGATIVE", label: "Negative" },
  { value: "NOT_TESTED", label: "Not Tested" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1.5px solid rgba(0,0,0,0.12)",
  fontFamily: "'Instrument Sans', sans-serif",
  fontSize: 14,
  color: "#1C2A19",
  backgroundColor: "#fff",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Instrument Sans', sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: "#6B7A5E",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: 6,
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: 20,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "'Fraunces', serif",
  fontSize: 16,
  fontWeight: 600,
  color: "#1C2A19",
  marginBottom: 16,
  marginTop: 28,
  paddingBottom: 8,
  borderBottom: "1px solid rgba(0,0,0,0.08)",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "'Instrument Sans', sans-serif",
  fontSize: 12,
  color: "#b91c1c",
  marginTop: 4,
};

const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TNRForm({ record }: { record: TNRDetail | null }) {
  const router = useRouter();
  const isNew = record === null;

  const [form, setForm] = useState({
    locationName: record?.locationName ?? "",
    county: record?.county ?? "",
    contactName: record?.contactName ?? "",
    contactNumber: record?.contactNumber ?? "",
    sex: record?.sex ?? "",
    ageEstimate: record?.ageEstimate ?? "",
    coatColour: record?.coatColour ?? "",
    earTipped: record?.earTipped ?? false,
    dateIntoDar: toDateInput(record?.dateIntoDar ?? null),
    dateOutOfDar: toDateInput(record?.dateOutOfDar ?? null),
    dateNeutered: toDateInput(record?.dateNeutered ?? null),
    vetHospital: record?.vetHospital ?? "",
    apRefNumber: record?.apRefNumber ?? "",
    vaccinationStatus: record?.vaccinationStatus ?? "",
    vaccineType: record?.vaccineType ?? "",
    fivResult: record?.fivResult ?? "",
    felvResult: record?.felvResult ?? "",
    status: record?.status ?? "IN_PROGRESS",
    outcome: record?.outcome ?? "",
    notes: record?.notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Client-side validation
    const clientErrors: Record<string, string> = {};
    if (!form.locationName.trim()) clientErrors.locationName = "Location name is required";
    if (!form.county.trim()) clientErrors.county = "County is required";
    if (!form.sex) clientErrors.sex = "Sex is required";
    if (!form.dateIntoDar) clientErrors.dateIntoDar = "Date into DAR is required";
    if (!form.status) clientErrors.status = "Status is required";
    if (form.status === "COMPLETED") {
      if (!form.outcome) clientErrors.outcome = "Outcome is required when status is Completed";
      if (!form.dateOutOfDar) clientErrors.dateOutOfDar = "Date out of DAR is required when status is Completed";
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setSaving(false);
      return;
    }

    const url = isNew ? "/api/admin/tnr" : `/api/admin/tnr/${record!.id}`;
    const method = isNew ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contactName: form.contactName || null,
          contactNumber: form.contactNumber || null,
          ageEstimate: form.ageEstimate || null,
          coatColour: form.coatColour || null,
          dateOutOfDar: form.dateOutOfDar || null,
          dateNeutered: form.dateNeutered || null,
          vetHospital: form.vetHospital || null,
          apRefNumber: form.apRefNumber || null,
          vaccinationStatus: form.vaccinationStatus || null,
          vaccineType: form.vaccineType || null,
          fivResult: form.fivResult || null,
          felvResult: form.felvResult || null,
          outcome: form.outcome || null,
          notes: form.notes || null,
        }),
      });

      if (res.status === 422) {
        const json = await res.json();
        setErrors(json.fields ?? {});
        setSaving(false);
        return;
      }

      if (!res.ok) {
        setSaving(false);
        alert("Failed to save. Please try again.");
        return;
      }

      if (isNew) {
        const json = await res.json();
        router.push(`/admin/tnr/${json.id}`);
      } else {
        router.refresh();
      }
    } catch {
      alert("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ backgroundColor: "#2D5A27", padding: "24px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <Link
            href="/admin/tnr"
            style={{
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
            }}
          >
            ← TNR Records
          </Link>
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#fff",
            margin: 0,
          }}
        >
          {isNew ? "New TNR Record" : record!.locationName}
        </h1>
      </div>

      {/* Form */}
      <div style={{ padding: "28px 32px", maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>

          {/* Section: Location */}
          <div style={sectionHeadingStyle}>Location</div>
          <div style={twoColGrid}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Location Name *</label>
              <input
                style={{ ...inputStyle, borderColor: errors.locationName ? "#b91c1c" : "rgba(0,0,0,0.12)" }}
                value={form.locationName}
                onChange={(e) => set("locationName", e.target.value)}
              />
              {errors.locationName && <div style={errorStyle}>{errors.locationName}</div>}
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>County *</label>
              <input
                style={{ ...inputStyle, borderColor: errors.county ? "#b91c1c" : "rgba(0,0,0,0.12)" }}
                value={form.county}
                onChange={(e) => set("county", e.target.value)}
              />
              {errors.county && <div style={errorStyle}>{errors.county}</div>}
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Contact Name</label>
              <input style={inputStyle} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Contact Number</label>
              <input style={inputStyle} value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
            </div>
          </div>

          {/* Section: Animal */}
          <div style={sectionHeadingStyle}>Animal Details</div>
          <div style={twoColGrid}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Sex *</label>
              <select
                style={{ ...inputStyle, borderColor: errors.sex ? "#b91c1c" : "rgba(0,0,0,0.12)" }}
                value={form.sex}
                onChange={(e) => set("sex", e.target.value)}
              >
                <option value="">— Select —</option>
                {SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.sex && <div style={errorStyle}>{errors.sex}</div>}
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Age Estimate</label>
              <input style={inputStyle} value={form.ageEstimate} placeholder="e.g. Kitten, Young Adult" onChange={(e) => set("ageEstimate", e.target.value)} />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Coat Colour</label>
              <input style={inputStyle} value={form.coatColour} onChange={(e) => set("coatColour", e.target.value)} />
            </div>
            <div style={{ ...fieldGroupStyle, display: "flex", alignItems: "center", gap: 10, paddingTop: 24 }}>
              <input
                type="checkbox"
                id="earTipped"
                checked={form.earTipped}
                onChange={(e) => set("earTipped", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="earTipped" style={{ ...labelStyle, marginBottom: 0, textTransform: "none", letterSpacing: 0, fontSize: 14 }}>
                Ear Tipped
              </label>
            </div>
          </div>

          {/* Section: Dates */}
          <div style={sectionHeadingStyle}>Dates</div>
          <div style={twoColGrid}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Date Into DAR *</label>
              <input
                type="date"
                style={{ ...inputStyle, borderColor: errors.dateIntoDar ? "#b91c1c" : "rgba(0,0,0,0.12)" }}
                value={form.dateIntoDar}
                onChange={(e) => set("dateIntoDar", e.target.value)}
              />
              {errors.dateIntoDar && <div style={errorStyle}>{errors.dateIntoDar}</div>}
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Date Out of DAR</label>
              <input
                type="date"
                style={{ ...inputStyle, borderColor: errors.dateOutOfDar ? "#b91c1c" : "rgba(0,0,0,0.12)" }}
                value={form.dateOutOfDar}
                onChange={(e) => set("dateOutOfDar", e.target.value)}
              />
              {errors.dateOutOfDar && <div style={errorStyle}>{errors.dateOutOfDar}</div>}
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Date Neutered</label>
              <input
                type="date"
                style={inputStyle}
                value={form.dateNeutered}
                onChange={(e) => set("dateNeutered", e.target.value)}
              />
            </div>
          </div>

          {/* Section: Medical */}
          <div style={sectionHeadingStyle}>Medical</div>
          <div style={twoColGrid}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Vet Hospital</label>
              <input style={inputStyle} value={form.vetHospital} onChange={(e) => set("vetHospital", e.target.value)} />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>AllPets Ref Number</label>
              <input style={inputStyle} value={form.apRefNumber} onChange={(e) => set("apRefNumber", e.target.value)} />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Vaccination Status</label>
              <select style={inputStyle} value={form.vaccinationStatus} onChange={(e) => set("vaccinationStatus", e.target.value)}>
                <option value="">— Select —</option>
                {VACCINATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {form.vaccinationStatus && (
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Vaccine Type</label>
                <input style={inputStyle} value={form.vaccineType} onChange={(e) => set("vaccineType", e.target.value)} />
              </div>
            )}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>FIV Result</label>
              <select style={inputStyle} value={form.fivResult} onChange={(e) => set("fivResult", e.target.value)}>
                <option value="">— Select —</option>
                {TEST_RESULT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>FeLV Result</label>
              <select style={inputStyle} value={form.felvResult} onChange={(e) => set("felvResult", e.target.value)}>
                <option value="">— Select —</option>
                {TEST_RESULT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Outcome */}
          <div style={sectionHeadingStyle}>Status & Outcome</div>
          <div style={twoColGrid}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Status *</label>
              <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{tnrStatusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div style={fieldGroupStyle}>
              <label style={{ ...labelStyle, color: errors.outcome ? "#b91c1c" : "#6B7A5E" }}>
                Outcome{form.status === "COMPLETED" ? " *" : ""}
              </label>
              <select
                style={{ ...inputStyle, borderColor: errors.outcome ? "#b91c1c" : "rgba(0,0,0,0.12)" }}
                value={form.outcome}
                onChange={(e) => set("outcome", e.target.value)}
              >
                <option value="">— Select —</option>
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o} value={o}>{tnrOutcomeLabel(o)}</option>
                ))}
              </select>
              {errors.outcome && <div style={errorStyle}>{errors.outcome}</div>}
            </div>
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, height: 100, resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 28px",
                borderRadius: 10,
                border: "none",
                backgroundColor: "#2D5A27",
                color: "#fff",
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : isNew ? "Create Record" : "Save Changes"}
            </button>
            <Link
              href="/admin/tnr"
              style={{
                padding: "12px 28px",
                borderRadius: 10,
                border: "1.5px solid rgba(0,0,0,0.12)",
                backgroundColor: "#fff",
                color: "#6B7A5E",
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}
