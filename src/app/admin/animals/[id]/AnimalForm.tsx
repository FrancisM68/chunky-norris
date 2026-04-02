"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TERMINAL_STATUSES } from "@/lib/constants";
import {
  speciesLabel,
  genderLabel,
  statusLabel,
  statusPillStyle,
  disposalMethodLabel,
} from "@/lib/display-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnimalDetail {
  id: string;
  officialName: string;
  nickname: string | null;
  species: string;
  speciesOther: string | null;
  breed: string | null;
  description: string | null;
  gender: string;
  dateOfBirth: string | null;
  dobIsEstimate: boolean;
  ageAtIntake: string | null;
  microchipNumber: string | null;
  microchipDate: string | null;
  intakeDate: string;
  intakeSource: string;
  strayLocation: string | null;
  infoSource: string | null;
  darRefNumber: string | null;
  vetRefNumber: string | null;
  vaccinationStatus: string | null;
  v1Date: string | null;
  v2Date: string | null;
  vaccineType: string | null;
  neuteredDate: string | null;
  neuteredVet: string | null;
  fivResult: string | null;
  felvResult: string | null;
  kennelCoughDate: string | null;
  rabiesDate: string | null;
  condition: string | null;
  status: string;
  currentLocation: string | null;
  departureDate: string | null;
  disposalMethod: string | null;
  notes: string | null;
  legacyNotes: string | null;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const SPECIES_OPTIONS = ["CAT", "DOG", "RABBIT", "FERRET", "OTHER"] as const;

const GENDER_OPTIONS = [
  { value: "MALE_INTACT", label: "Male / Intact" },
  { value: "MALE_NEUTERED", label: "Male / Neutered" },
  { value: "FEMALE_INTACT", label: "Female / Intact" },
  { value: "FEMALE_NEUTERED", label: "Female / Neutered" },
  { value: "UNKNOWN", label: "Unknown" },
];

const INTAKE_SOURCE_OPTIONS = [
  { value: "STRAY", label: "Stray" },
  { value: "SURRENDER", label: "Surrender" },
  { value: "TNR", label: "TNR" },
  { value: "ABANDONED", label: "Abandoned" },
  { value: "ORPHANED", label: "Orphaned" },
  { value: "RTA", label: "Road Traffic Accident" },
  { value: "POUND", label: "Pound" },
];

const VACCINATION_STATUS_OPTIONS = [
  { value: "NOT_VACCINATED", label: "Not Vaccinated" },
  { value: "V1_ONLY", label: "V1 Only" },
  { value: "V1_AND_V2", label: "V1 and V2" },
  { value: "FULLY_VACCINATED", label: "Fully Vaccinated" },
  { value: "UNKNOWN", label: "Unknown" },
];

const STATUS_OPTIONS = [
  { value: "IN_CARE", label: "In Care" },
  { value: "FOSTERED", label: "Fostered" },
  { value: "ADOPTED", label: "Adopted" },
  { value: "RETURNED_TO_OWNER", label: "Returned to Owner" },
  { value: "EUTHANISED", label: "Euthanised" },
  { value: "DIED_IN_CARE", label: "Died in Care" },
  { value: "TNR_RETURNED", label: "TNR Returned" },
];

const TEST_RESULT_OPTIONS = [
  { value: "POSITIVE", label: "Positive" },
  { value: "NEGATIVE", label: "Negative" },
  { value: "NOT_TESTED", label: "Not Tested" },
];

const CONDITION_OPTIONS = [
  { value: "GOOD", label: "Good" },
  { value: "OK", label: "OK" },
  { value: "POOR", label: "Poor" },
];

const DISPOSAL_METHOD_OPTIONS = [
  { value: "REHOMED", label: "Rehomed" },
  { value: "RECLAIMED", label: "Reclaimed" },
  { value: "EUTHANISED", label: "Euthanised" },
  { value: "DIED_IN_CARE", label: "Died in Care" },
  { value: "TNR_RETURNED", label: "TNR Returned" },
  { value: "TRANSFERRED", label: "Transferred" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE");
}

// ---------------------------------------------------------------------------
// Primitive UI components
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, color: "#374151", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

// Two fields side-by-side within a section
function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
      {children}
    </div>
  );
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "6px 10px", border: `1px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 5, fontSize: 13, boxSizing: "border-box", backgroundColor: "#fff",
  };
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{msg}</div>;
}

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

function ViewRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
      <span style={{ color: value ? "#111827" : "#9ca3af", fontSize: 13 }}>{value || "—"}</span>
    </>
  );
}

function ViewMode({ animal, onEdit }: { animal: AnimalDetail; onEdit: () => void }) {
  const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(animal.status);
  const speciesDisplay =
    animal.species === "OTHER"
      ? `Other — ${animal.speciesOther ?? ""}`
      : speciesLabel(animal.species);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
            {animal.nickname ?? animal.officialName}
          </h1>
          {animal.nickname && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{animal.officialName}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ ...statusPillStyle(animal.status), padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {statusLabel(animal.status)}
          </span>
          <Link
            href={`/admin/animals/${animal.id}/treatments`}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #d1d5db", backgroundColor: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
          >
            Treatments
          </Link>
          <button onClick={onEdit} style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: "#2D5A27", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Edit
          </button>
        </div>
      </div>

      {/* Two-column section grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>

        {/* Left column: Identity + Medical */}
        <div>
          <SectionCard title="Identity">
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "5px 12px" }}>
              <ViewRow label="Species" value={speciesDisplay} />
              <ViewRow label="Gender" value={genderLabel(animal.gender)} />
              <ViewRow label="Breed" value={animal.breed} />
              <ViewRow label="Description" value={animal.description} />
              <ViewRow label="Date of Birth" value={toDisplayDate(animal.dateOfBirth)} />
              {animal.dobIsEstimate && animal.dateOfBirth && (
                <>
                  <span />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>estimated</span>
                </>
              )}
              <ViewRow label="Age at Intake" value={animal.ageAtIntake} />
              <ViewRow label="Microchip" value={animal.microchipNumber} />
              <ViewRow label="Microchip Date" value={toDisplayDate(animal.microchipDate)} />
            </div>
          </SectionCard>

          <SectionCard title="Medical">
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "5px 12px" }}>
              <ViewRow label="Vaccination" value={VACCINATION_STATUS_OPTIONS.find(o => o.value === animal.vaccinationStatus)?.label ?? animal.vaccinationStatus} />
              <ViewRow label="V1 Date" value={toDisplayDate(animal.v1Date)} />
              <ViewRow label="V2 Date" value={toDisplayDate(animal.v2Date)} />
              <ViewRow label="Vaccine Type" value={animal.vaccineType} />
              <ViewRow label="Neutered Date" value={toDisplayDate(animal.neuteredDate)} />
              <ViewRow label="Neutered Vet" value={animal.neuteredVet} />
              {animal.species === "CAT" && (
                <>
                  <ViewRow label="FIV" value={TEST_RESULT_OPTIONS.find(o => o.value === animal.fivResult)?.label ?? animal.fivResult} />
                  <ViewRow label="FeLV" value={TEST_RESULT_OPTIONS.find(o => o.value === animal.felvResult)?.label ?? animal.felvResult} />
                </>
              )}
              {animal.species === "DOG" && (
                <>
                  <ViewRow label="Kennel Cough" value={toDisplayDate(animal.kennelCoughDate)} />
                  <ViewRow label="Rabies Date" value={toDisplayDate(animal.rabiesDate)} />
                  <ViewRow label="Condition" value={CONDITION_OPTIONS.find(o => o.value === animal.condition)?.label ?? animal.condition} />
                </>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Right column: Intake + Status + Notes */}
        <div>
          <SectionCard title="Intake">
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "5px 12px" }}>
              <ViewRow label="Date" value={toDisplayDate(animal.intakeDate)} />
              <ViewRow label="Source" value={INTAKE_SOURCE_OPTIONS.find(o => o.value === animal.intakeSource)?.label ?? animal.intakeSource} />
              {animal.intakeSource === "STRAY" && <ViewRow label="Location" value={animal.strayLocation} />}
              <ViewRow label="Info Source" value={animal.infoSource} />
              <ViewRow label="DAR Ref" value={animal.darRefNumber} />
              <ViewRow label="Vet Ref" value={animal.vetRefNumber} />
            </div>
          </SectionCard>

          <SectionCard title="Status">
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "5px 12px" }}>
              <ViewRow label="Status" value={statusLabel(animal.status)} />
              <ViewRow label="Location" value={animal.currentLocation} />
              {isTerminal && (
                <>
                  <ViewRow label="Departure Date" value={toDisplayDate(animal.departureDate)} />
                  <ViewRow label="Disposal Method" value={animal.disposalMethod ? disposalMethodLabel(animal.disposalMethod) : null} />
                </>
              )}
            </div>
          </SectionCard>

          {animal.notes && (
            <SectionCard title="Notes">
              <p style={{ margin: 0, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>{animal.notes}</p>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Legacy notes — full width below both columns */}
      {animal.legacyNotes !== null && (
        <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: "12px 16px", backgroundColor: "#f9fafb", marginTop: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Legacy Notes — imported record
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", whiteSpace: "pre-wrap" }}>{animal.legacyNotes}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form state helpers
// ---------------------------------------------------------------------------

type FormData = {
  officialName: string; nickname: string; speciesOther: string;
  breed: string; description: string; gender: string;
  dateOfBirth: string; dobIsEstimate: boolean; ageAtIntake: string;
  microchipNumber: string; microchipDate: string; intakeDate: string;
  strayLocation: string; infoSource: string; darRefNumber: string; vetRefNumber: string;
  vaccinationStatus: string; v1Date: string; v2Date: string; vaccineType: string;
  neuteredDate: string; neuteredVet: string; fivResult: string; felvResult: string;
  kennelCoughDate: string; rabiesDate: string; condition: string;
  currentLocation: string; departureDate: string; disposalMethod: string; notes: string;
};

function initForm(a: AnimalDetail | null): FormData {
  return {
    officialName: a?.officialName ?? "",
    nickname: a?.nickname ?? "",
    speciesOther: a?.speciesOther ?? "",
    breed: a?.breed ?? "",
    description: a?.description ?? "",
    gender: a?.gender ?? "",
    dateOfBirth: toDateInput(a?.dateOfBirth),
    dobIsEstimate: a?.dobIsEstimate ?? true,
    ageAtIntake: a?.ageAtIntake ?? "",
    microchipNumber: a?.microchipNumber ?? "",
    microchipDate: toDateInput(a?.microchipDate),
    intakeDate: toDateInput(a?.intakeDate),
    strayLocation: a?.strayLocation ?? "",
    infoSource: a?.infoSource ?? "",
    darRefNumber: a?.darRefNumber ?? "",
    vetRefNumber: a?.vetRefNumber ?? "",
    vaccinationStatus: a?.vaccinationStatus ?? "",
    v1Date: toDateInput(a?.v1Date),
    v2Date: toDateInput(a?.v2Date),
    vaccineType: a?.vaccineType ?? "",
    neuteredDate: toDateInput(a?.neuteredDate),
    neuteredVet: a?.neuteredVet ?? "",
    fivResult: a?.fivResult ?? "",
    felvResult: a?.felvResult ?? "",
    kennelCoughDate: toDateInput(a?.kennelCoughDate),
    rabiesDate: toDateInput(a?.rabiesDate),
    condition: a?.condition ?? "",
    currentLocation: a?.currentLocation ?? "",
    departureDate: toDateInput(a?.departureDate),
    disposalMethod: a?.disposalMethod ?? "",
    notes: a?.notes ?? "",
  };
}

function validateForm(
  form: FormData,
  species: string,
  intakeSource: string,
  status: string
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.officialName.trim()) e.officialName = "Required";
  if (!form.gender) e.gender = "Required";
  if (!form.intakeDate) e.intakeDate = "Required";
  if (!intakeSource) e.intakeSource = "Required";
  if (intakeSource === "STRAY" && !form.strayLocation.trim()) e.strayLocation = "Required";
  if (species === "OTHER" && !form.speciesOther.trim()) e.speciesOther = "Required";
  if (!status) e.status = "Required";
  if ((TERMINAL_STATUSES as readonly string[]).includes(status)) {
    if (!form.departureDate) e.departureDate = "Required";
    if (!form.disposalMethod) e.disposalMethod = "Required (DoA compliance)";
  }
  return e;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnimalForm({ animal }: { animal: AnimalDetail | null }) {
  const router = useRouter();
  const isCreate = animal === null;

  const [isEditing, setIsEditing] = useState(isCreate);
  const [species, setSpecies] = useState(animal?.species ?? "CAT");
  const [intakeSource, setIntakeSource] = useState(animal?.intakeSource ?? "");
  const [status, setStatus] = useState(animal?.status ?? "IN_CARE");
  const [form, setForm] = useState<FormData>(() => initForm(animal));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    if (isCreate) {
      router.push("/admin/animals");
    } else {
      setForm(initForm(animal));
      setSpecies(animal!.species);
      setIntakeSource(animal!.intakeSource);
      setStatus(animal!.status);
      setErrors({});
      setIsEditing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateForm(form, species, intakeSource, status);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);

    const body = { ...form, species, intakeSource, status };
    const url = animal ? `/api/admin/animals/${animal.id}` : "/api/admin/animals";
    const method = animal ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        setErrors(json.fields ?? { _global: json.error ?? "Save failed" });
        setSaving(false);
        return;
      }
      const data = await res.json();
      router.push(`/admin/animals/${isCreate ? data.id : animal!.id}`);
    } catch {
      setErrors({ _global: "Network error — please try again" });
      setSaving(false);
    }
  }

  if (!isEditing && animal) {
    return <ViewMode animal={animal} onEdit={() => setIsEditing(true)} />;
  }

  const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(status);

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
          {isCreate ? "Add Animal" : `Editing: ${animal?.nickname ?? animal?.officialName}`}
        </h1>
        <button type="button" onClick={handleCancel}
          style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>

      {errors._global && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#b91c1c" }}>
          {errors._global}
        </div>
      )}

      {/* Species — full width */}
      <div style={{ background: "#2D5A27", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Species *
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {SPECIES_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setSpecies(s)}
              style={{
                flex: 1, padding: "6px 4px", borderRadius: 4, cursor: "pointer",
                border: species === s ? "2px solid #fff" : "1px solid rgba(255,255,255,.4)",
                backgroundColor: species === s ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.1)",
                color: "#fff", fontSize: 12, fontWeight: species === s ? 700 : 400,
              }}>
              {speciesLabel(s)}
            </button>
          ))}
        </div>
        {species === "OTHER" && (
          <div style={{ marginTop: 8 }}>
            <input type="text" value={form.speciesOther} onChange={(e) => set("speciesOther", e.target.value)}
              placeholder="Please specify *"
              style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: `1px solid ${errors.speciesOther ? "#fca5a5" : "rgba(255,255,255,.4)"}`, backgroundColor: "rgba(255,255,255,.9)", fontSize: 13, boxSizing: "border-box" }} />
            <ErrorMsg msg={errors.speciesOther} />
          </div>
        )}
      </div>

      {/* Two-column section grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>

        {/* Left column: Identity + Medical */}
        <div>
          <SectionCard title="Identity">
            <TwoCol>
              <FieldRow label="Official Name *">
                <input type="text" value={form.officialName} onChange={(e) => set("officialName", e.target.value)}
                  placeholder='"Moneymore Kitten1 - Snoopy"' style={inputStyle(!!errors.officialName)} />
                <ErrorMsg msg={errors.officialName} />
              </FieldRow>
              <FieldRow label="Nickname">
                <input type="text" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} style={inputStyle()} />
              </FieldRow>
            </TwoCol>
            <TwoCol>
              <FieldRow label="Gender *">
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)} style={inputStyle(!!errors.gender)}>
                  <option value="">— Select —</option>
                  {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ErrorMsg msg={errors.gender} />
              </FieldRow>
              <FieldRow label="Breed">
                <input type="text" value={form.breed} onChange={(e) => set("breed", e.target.value)} style={inputStyle()} />
              </FieldRow>
            </TwoCol>
            <FieldRow label="Description">
              <input type="text" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Coat colour/pattern" style={inputStyle()} />
            </FieldRow>
            <TwoCol>
              <FieldRow label="Date of Birth">
                <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Age at Intake">
                <input type="text" value={form.ageAtIntake} onChange={(e) => set("ageAtIntake", e.target.value)} placeholder='"~6 weeks"' style={inputStyle()} />
              </FieldRow>
            </TwoCol>
            {form.dateOfBirth && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13, color: "#374151" }}>
                <input type="checkbox" id="dobEst" checked={form.dobIsEstimate} onChange={(e) => set("dobIsEstimate", e.target.checked)} />
                <label htmlFor="dobEst">Date of birth is estimated</label>
              </div>
            )}
            <TwoCol>
              <FieldRow label="Microchip Number">
                <input type="text" value={form.microchipNumber} onChange={(e) => set("microchipNumber", e.target.value)} style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Microchip Date">
                <input type="date" value={form.microchipDate} onChange={(e) => set("microchipDate", e.target.value)} style={inputStyle()} />
              </FieldRow>
            </TwoCol>
          </SectionCard>

          <SectionCard title="Medical">
            <TwoCol>
              <FieldRow label="Vaccination Status">
                <select value={form.vaccinationStatus} onChange={(e) => set("vaccinationStatus", e.target.value)} style={inputStyle()}>
                  <option value="">— Select —</option>
                  {VACCINATION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Vaccine Type">
                <input type="text" value={form.vaccineType} onChange={(e) => set("vaccineType", e.target.value)} placeholder='"Nobivac Tri-Cat"' style={inputStyle()} />
              </FieldRow>
            </TwoCol>
            <TwoCol>
              <FieldRow label="V1 Date"><input type="date" value={form.v1Date} onChange={(e) => set("v1Date", e.target.value)} style={inputStyle()} /></FieldRow>
              <FieldRow label="V2 Date"><input type="date" value={form.v2Date} onChange={(e) => set("v2Date", e.target.value)} style={inputStyle()} /></FieldRow>
            </TwoCol>
            <TwoCol>
              <FieldRow label="Neutered Date"><input type="date" value={form.neuteredDate} onChange={(e) => set("neuteredDate", e.target.value)} style={inputStyle()} /></FieldRow>
              <FieldRow label="Neutered Vet"><input type="text" value={form.neuteredVet} onChange={(e) => set("neuteredVet", e.target.value)} style={inputStyle()} /></FieldRow>
            </TwoCol>

            {species === "CAT" && (
              <div style={{ background: "#fef9ec", border: "1px solid #fde68a", borderRadius: 6, padding: "10px 12px", marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>Cat-specific</div>
                <TwoCol>
                  <FieldRow label="FIV Result">
                    <select value={form.fivResult} onChange={(e) => set("fivResult", e.target.value)} style={inputStyle()}>
                      <option value="">— Select —</option>
                      {TEST_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="FeLV Result">
                    <select value={form.felvResult} onChange={(e) => set("felvResult", e.target.value)} style={inputStyle()}>
                      <option value="">— Select —</option>
                      {TEST_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </FieldRow>
                </TwoCol>
              </div>
            )}

            {species === "DOG" && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "10px 12px", marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 8 }}>Dog-specific</div>
                <TwoCol>
                  <FieldRow label="Kennel Cough Date"><input type="date" value={form.kennelCoughDate} onChange={(e) => set("kennelCoughDate", e.target.value)} style={inputStyle()} /></FieldRow>
                  <FieldRow label="Rabies Date"><input type="date" value={form.rabiesDate} onChange={(e) => set("rabiesDate", e.target.value)} style={inputStyle()} /></FieldRow>
                </TwoCol>
                <FieldRow label="Condition">
                  <select value={form.condition} onChange={(e) => set("condition", e.target.value)} style={inputStyle()}>
                    <option value="">— Select —</option>
                    {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FieldRow>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column: Intake + Status + Notes */}
        <div>
          <SectionCard title="Intake">
            <TwoCol>
              <FieldRow label="Intake Date *">
                <input type="date" value={form.intakeDate} onChange={(e) => set("intakeDate", e.target.value)} style={inputStyle(!!errors.intakeDate)} />
                <ErrorMsg msg={errors.intakeDate} />
              </FieldRow>
              <FieldRow label="Intake Source *">
                <select value={intakeSource}
                  onChange={(e) => { setIntakeSource(e.target.value); if (e.target.value !== "STRAY") set("strayLocation", ""); }}
                  style={inputStyle(!!errors.intakeSource)}>
                  <option value="">— Select —</option>
                  {INTAKE_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ErrorMsg msg={errors.intakeSource} />
              </FieldRow>
            </TwoCol>
            {intakeSource === "STRAY" && (
              <FieldRow label="Stray Location *">
                <input type="text" value={form.strayLocation} onChange={(e) => set("strayLocation", e.target.value)} style={inputStyle(!!errors.strayLocation)} />
                <ErrorMsg msg={errors.strayLocation} />
              </FieldRow>
            )}
            <TwoCol>
              <FieldRow label="DAR Ref Number">
                <input type="text" value={form.darRefNumber} onChange={(e) => set("darRefNumber", e.target.value)} style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Vet Ref Number">
                <input type="text" value={form.vetRefNumber} onChange={(e) => set("vetRefNumber", e.target.value)} style={inputStyle()} />
              </FieldRow>
            </TwoCol>
            <FieldRow label="Info Source">
              <input type="text" value={form.infoSource} onChange={(e) => set("infoSource", e.target.value)} style={inputStyle()} />
            </FieldRow>
          </SectionCard>

          <SectionCard title="Status">
            <TwoCol>
              <FieldRow label="Status *">
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle(!!errors.status)}>
                  <option value="">— Select —</option>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ErrorMsg msg={errors.status} />
              </FieldRow>
              <FieldRow label="Current Location">
                <input type="text" value={form.currentLocation} onChange={(e) => set("currentLocation", e.target.value)} placeholder='"Foster Care", "Vet"' style={inputStyle()} />
              </FieldRow>
            </TwoCol>

            {isTerminal && (
              <div style={{ background: "#fce7f3", border: "1px solid #f9a8d4", borderRadius: 6, padding: "10px 12px", marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", marginBottom: 8 }}>Departure details — required</div>
                <TwoCol>
                  <FieldRow label="Departure Date *">
                    <input type="date" value={form.departureDate} onChange={(e) => set("departureDate", e.target.value)} style={inputStyle(!!errors.departureDate)} />
                    <ErrorMsg msg={errors.departureDate} />
                  </FieldRow>
                  <FieldRow label="Disposal Method *">
                    <select value={form.disposalMethod} onChange={(e) => set("disposalMethod", e.target.value)} style={inputStyle(!!errors.disposalMethod)}>
                      <option value="">— Select —</option>
                      {DISPOSAL_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ErrorMsg msg={errors.disposalMethod} />
                  </FieldRow>
                </TwoCol>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Notes">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder='"Afraid of males", "Only pet household", "Not suitable for young children"'
              rows={4}
              style={{ width: "100%", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
          </SectionCard>

          {/* Legacy Notes — read-only */}
          {animal?.legacyNotes != null && (
            <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: "12px 16px", backgroundColor: "#f9fafb" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Legacy Notes — read-only
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280", whiteSpace: "pre-wrap" }}>{animal.legacyNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit — full width */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button type="button" onClick={handleCancel}
          style={{ padding: "8px 18px", borderRadius: 6, backgroundColor: "#fff", color: "#374151", border: "1px solid #d1d5db", fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{ padding: "8px 18px", borderRadius: 6, backgroundColor: saving ? "#6b9e65" : "#2D5A27", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving…" : isCreate ? "Add Animal" : "Save Animal"}
        </button>
      </div>
    </form>
  );
}
