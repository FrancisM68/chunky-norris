"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Animal = {
  id: string;
  officialName: string;
  nickname: string | null;
  species: string;
  gender: string;
  ageAtIntake: string | null;
  dateOfBirth: string | null;
  description: string | null;
  microchipNumber: string | null;
  intakeDate: string;
  intakeSource: string;
  vaccinationStatus: string | null;
  fivResult: string | null;
  felvResult: string | null;
  vetRefNumber: string | null;
  darRefNumber: string | null;
  legacyNotes: string | null;
  status: string;
};

type RecentLog = {
  id: string;
  animalNickname: string;
  medicationName: string;
  dosageAmount: number;
  dosageUnit: string;
  administeredAt: string;
};

type FormState = {
  medication: string;
  medicationFreeText: string;
  dosageAmount: string;
  dosageUnit: string;
  weight: string;
  date: string;
  time: string;
  disposal: string;
  notes: string;
};

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const SPECIES_EMOJI: Record<string, string> = {
  CAT: "🐱",
  DOG: "🐶",
  RABBIT: "🐰",
  FERRET: "🦡",
};

const SPECIES_LABEL: Record<string, string> = {
  CAT: "Cat",
  DOG: "Dog",
  RABBIT: "Rabbit",
  FERRET: "Ferret",
};

const GENDER_LABEL: Record<string, string> = {
  MALE_INTACT: "Male (intact)",
  MALE_NEUTERED: "Male (neutered)",
  FEMALE_INTACT: "Female (intact)",
  FEMALE_NEUTERED: "Female (neutered)",
  UNKNOWN: "Unknown",
};

const DOSAGE_UNIT_LABELS: Record<string, string> = {
  ML: "ml",
  MG: "mg",
  TABLET: "Tablet",
  HALF_TABLET: "½ tablet",
  PIPETTE: "Pipette",
  SPOT_ON: "Spot-on",
  SPRAY_DOSE: "Spray dose",
  OTHER: "Other",
};

function animalNickname(a: Animal): string {
  return a.nickname ?? a.officialName;
}

function animalPhoto(a: Animal): string {
  return SPECIES_EMOJI[a.species] ?? "🐾";
}

function animalSpeciesLabel(a: Animal): string {
  return SPECIES_LABEL[a.species] ?? a.species;
}

function animalGenderLabel(a: Animal): string {
  return GENDER_LABEL[a.gender] ?? a.gender;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(isoDate: string): string {
  const [y, m, day] = isoDate.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

// ---------------------------------------------------------------------------
// Medication catalogue
// Prototype display labels → { API medicationName, API medicationType }
// ---------------------------------------------------------------------------

type MedicationEntry = { name: string; type: string };

const MEDICATION_MAP: Record<string, MedicationEntry> = {
  "Milbemax (deworming)":                  { name: "Milbemax",        type: "DEWORMING" },
  "Milpro (deworming)":                    { name: "Milpro",          type: "DEWORMING" },
  "Locuperazol (deworming — kittens)":     { name: "Locuperazol",     type: "DEWORMING" },
  "NexGard Combo (flea/parasite)":         { name: "NexGard Combo",   type: "FLEA_TREATMENT" },
  "Bravecto Plus (flea/parasite)":         { name: "Bravecto Plus",   type: "FLEA_TREATMENT" },
  "Bravecto (flea/parasite)":              { name: "Bravecto",        type: "FLEA_TREATMENT" },
  "Advocate (flea/parasite)":              { name: "Advocate",        type: "FLEA_TREATMENT" },
  "Vibravet (antibiotic)":                 { name: "Vibravet",        type: "ANTIBIOTIC" },
  "Antibiotic — other (specify below)":    { name: "",                type: "ANTIBIOTIC" },
  "Prednisone (steroid)":                  { name: "Prednisone",      type: "ANTI_INFLAMMATORY" },
  "Moxicone (anti-inflammatory)":          { name: "Moxicone",        type: "ANTI_INFLAMMATORY" },
  "Eye drops (specify below)":             { name: "",                type: "EYE_DROPS" },
  "Eye gel (specify below)":               { name: "",                type: "EYE_DROPS" },
  "Cat flu medication (specify below)":    { name: "",                type: "OTHER" },
  "Inhaler":                               { name: "Inhaler",         type: "LONG_TERM_MEDICATION" },
  "Kennel cough vaccine":                  { name: "Kennel cough vaccine", type: "VACCINATION" },
  "Other (specify below)":                 { name: "",                type: "OTHER" },
};

const MEDICATIONS: Record<string, string[]> = {
  Cat: [
    "Milbemax (deworming)",
    "Milpro (deworming)",
    "Locuperazol (deworming — kittens)",
    "NexGard Combo (flea/parasite)",
    "Bravecto Plus (flea/parasite)",
    "Advocate (flea/parasite)",
    "Vibravet (antibiotic)",
    "Antibiotic — other (specify below)",
    "Prednisone (steroid)",
    "Moxicone (anti-inflammatory)",
    "Eye drops (specify below)",
    "Eye gel (specify below)",
    "Cat flu medication (specify below)",
    "Inhaler",
    "Other (specify below)",
  ],
  Dog: [
    "Milbemax (deworming)",
    "Milpro (deworming)",
    "NexGard Combo (flea/parasite)",
    "Bravecto (flea/parasite)",
    "Kennel cough vaccine",
    "Antibiotic — other (specify below)",
    "Prednisone (steroid)",
    "Moxicone (anti-inflammatory)",
    "Other (specify below)",
  ],
};

// ---------------------------------------------------------------------------
// Disposal mapping — prototype display label → MedicationDisposal enum value
// ---------------------------------------------------------------------------

const DISPOSAL_MAP: Record<string, string> = {
  "Completed full course":                "ADMINISTERED_IN_FULL",
  "Remaining returned to vet":            "PARTIAL_RETURNED",
  "Remaining disposed — household waste": "DISPOSED_OF",
  "Remaining retained for next course":   "COURSE_ONGOING",
  "Ongoing course (not finished)":        "COURSE_ONGOING",
  "Other (specify in notes)":             "DISPOSED_OF",
};

const DISPOSAL_OPTIONS = Object.keys(DISPOSAL_MAP);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function needsFreeText(med: string): boolean {
  return med.includes("(specify below)");
}

function resolvedMedicationName(form: FormState): string {
  return needsFreeText(form.medication)
    ? form.medicationFreeText
    : (MEDICATION_MAP[form.medication]?.name ?? form.medication);
}

function displayMedication(form: FormState): string {
  if (!needsFreeText(form.medication)) return form.medication;
  const base = form.medication.replace(" (specify below)", "");
  return form.medicationFreeText ? `${base} — ${form.medicationFreeText}` : base;
}

const RESCUE_SLUG = "dar";
const RESCUE_HEADER = { "x-rescue-slug": RESCUE_SLUG };

// ---------------------------------------------------------------------------
// Styles (ported verbatim from prototype, body/reset selectors removed)
// ---------------------------------------------------------------------------

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Instrument+Sans:wght@400;500;600&display=swap');

  .phone-shell {
    width: 390px;
    min-height: 844px;
    background: #F5F0E8;
    border-radius: 44px;
    overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    font-family: 'Instrument Sans', sans-serif;
  }

  .status-bar {
    background: #2D5A27;
    color: #c8e6c4;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 28px 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: #F5F0E8;
  }

  /* ── HOME ── */
  .home-header {
    background: #2D5A27;
    padding: 20px 24px 32px;
    position: relative;
    overflow: hidden;
  }
  .home-header::before {
    content:''; position:absolute; top:-40px; right:-40px;
    width:160px; height:160px; border-radius:50%;
    background:rgba(255,255,255,0.06);
  }
  .dar-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2);
    border-radius: 20px; padding: 5px 12px; font-size: 11px;
    color: rgba(255,255,255,0.85); margin-bottom: 16px; font-weight:500;
    letter-spacing:.06em; text-transform:uppercase; position:relative;
  }
  .greeting { font-family:'Fraunces',serif; font-size:26px; color:#fff; font-weight:600; line-height:1.2; margin-bottom:4px; position:relative; }
  .greeting span { font-style:italic; color:#A8D5A2; }
  .greeting-sub { color:rgba(255,255,255,0.6); font-size:13px; font-weight:400; position:relative; }

  .section-label {
    font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase;
    color:#6B7A5E; padding:20px 24px 12px;
  }
  .animal-cards { padding: 0 24px; display: flex; flex-direction: column; gap: 12px; }
  .animal-card {
    background:#fff; border-radius:18px; padding:16px;
    display:flex; align-items:center; gap:14px;
    box-shadow:0 2px 12px rgba(0,0,0,0.06); cursor:pointer;
    transition:transform .15s,box-shadow .15s; border:1px solid rgba(0,0,0,0.04);
  }
  .animal-card:active { transform:scale(0.98); box-shadow:0 1px 6px rgba(0,0,0,0.08); }
  .animal-avatar {
    width:52px; height:52px; border-radius:14px; background:#EEF5EC;
    display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0;
  }
  .animal-info { flex:1; min-width:0; }
  .animal-nickname { font-family:'Fraunces',serif; font-size:17px; font-weight:600; color:#1C2A19; margin-bottom:1px; }
  .animal-official { font-size:10px; color:#9AA890; margin-bottom:4px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .animal-meta { font-size:12px; color:#7A8C74; margin-bottom:6px; }
  .condition-tag {
    display:inline-block; background:#FFF3CD; color:#7A5C00;
    border:1px solid #F0D060; border-radius:6px; padding:2px 8px;
    font-size:10px; font-weight:600;
  }
  .log-btn {
    background:#2D5A27; color:#fff; border:none; border-radius:12px;
    padding:10px 16px; font-size:12px; font-weight:600; cursor:pointer;
    white-space:nowrap; font-family:'Instrument Sans',sans-serif; flex-shrink:0;
    transition:background .15s;
  }
  .log-btn:hover { background:#246420; }

  .recent-section { padding: 0 24px 24px; }
  .recent-card {
    background:#fff; border-radius:14px; padding:12px 16px; margin-bottom:8px;
    border:1px solid rgba(0,0,0,0.04); box-shadow:0 1px 6px rgba(0,0,0,0.04);
  }
  .recent-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }
  .recent-animal { font-size:13px; font-weight:600; color:#1C2A19; }
  .recent-date { font-size:11px; color:#9AA890; }
  .recent-med { font-size:12px; color:#5A6E54; }

  /* ── NAV ── */
  .nav-bar {
    background:#fff; border-top:1px solid rgba(0,0,0,0.06);
    display:flex; padding:10px 0 24px; flex-shrink:0;
  }
  .nav-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; padding:4px 0; }
  .nav-icon { font-size:20px; }
  .nav-label { font-size:10px; font-weight:600; letter-spacing:.04em; color:#9AA890; }
  .nav-item.active .nav-label { color:#2D5A27; }

  /* ── LOG SCREEN ── */
  .log-header {
    background:#2D5A27; padding:16px 24px 24px;
    display:flex; align-items:center; gap:14px; flex-shrink:0;
  }
  .back-btn {
    width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.15);
    border:none; color:#fff; font-size:18px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .log-header-text { color:#fff; }
  .log-header-title { font-family:'Fraunces',serif; font-size:20px; font-weight:600; line-height:1.2; }
  .log-header-sub { font-size:12px; color:rgba(255,255,255,0.6); margin-top:2px; }

  .step-indicator { display:flex; gap:6px; padding:18px 24px 0; flex-shrink:0; }
  .step-dot { height:4px; border-radius:2px; flex:1; background:#D5CEBD; transition:background .3s; }
  .step-dot.active { background:#2D5A27; }
  .step-dot.done { background:#7AB872; }

  .form-body { flex:1; padding:20px 24px; display:flex; flex-direction:column; gap:16px; }
  .field-group { display:flex; flex-direction:column; gap:6px; }
  .field-label {
    font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#6B7A5E;
  }
  .field-label span { color:#C0392B; margin-left:2px; }
  .field-input, .field-select {
    background:#fff; border:1.5px solid #D5CEBD; border-radius:12px;
    padding:13px 16px; font-size:15px; color:#1C2A19;
    font-family:'Instrument Sans',sans-serif; outline:none;
    transition:border-color .2s,box-shadow .2s; width:100%;
  }
  .field-input:focus, .field-select:focus {
    border-color:#2D5A27; box-shadow:0 0 0 3px rgba(45,90,39,0.12);
  }
  .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  .animal-select-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
  .animal-select-card {
    background:#fff; border:2px solid #D5CEBD; border-radius:14px;
    padding:12px 8px; display:flex; flex-direction:column;
    align-items:center; gap:5px; cursor:pointer; transition:all .15s;
  }
  .animal-select-card.selected {
    border-color:#2D5A27; background:#EEF5EC;
    box-shadow:0 0 0 2px rgba(45,90,39,0.15);
  }
  .asc-emoji { font-size:26px; }
  .asc-name { font-size:12px; font-weight:600; color:#1C2A19; text-align:center; }
  .asc-species { font-size:10px; color:#7A8C74; }

  .next-btn, .submit-btn {
    background:#2D5A27; color:#fff; border:none; border-radius:14px;
    padding:16px; font-size:15px; font-weight:600; cursor:pointer; width:100%;
    font-family:'Instrument Sans',sans-serif; transition:background .15s,transform .1s;
    margin-top:4px;
  }
  .next-btn:hover, .submit-btn:hover { background:#246420; }
  .next-btn:active, .submit-btn:active { transform:scale(0.98); }
  .next-btn:disabled, .submit-btn:disabled { background:#B0C4AC; cursor:not-allowed; }

  .review-block {
    background:#fff; border-radius:16px; padding:16px;
    border:1px solid rgba(0,0,0,0.06);
  }
  .review-row {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding:8px 0; border-bottom:1px solid #F0EBE0;
  }
  .review-row:last-child { border-bottom:none; }
  .review-key { font-size:12px; color:#7A8C74; font-weight:500; flex-shrink:0; padding-right:8px; }
  .review-val { font-size:12px; color:#1C2A19; font-weight:600; text-align:right; max-width:62%; line-height:1.3; }

  .doa-banner {
    background:#EEF5EC; border:1px solid #7AB872; border-radius:12px;
    padding:12px 14px; display:flex; gap:10px; align-items:flex-start;
    margin-top:4px;
  }
  .doa-icon { font-size:18px; flex-shrink:0; }
  .doa-text { font-size:11px; color:#2D5A27; line-height:1.5; }
  .doa-text strong { font-weight:700; display:block; margin-bottom:2px; }

  .hint { font-size:11px; color:#9AA890; text-align:center; margin-top:-6px; }

  .error-banner {
    background:#FDECEA; border:1px solid #F5A79A; border-radius:12px;
    padding:12px 14px; font-size:12px; color:#B71C1C; line-height:1.5;
  }

  /* ── PET PROFILE ── */
  .pet-hero {
    background:#2D5A27; padding:0 24px 0; position:relative; overflow:hidden; flex-shrink:0;
  }
  .pet-hero::before {
    content:''; position:absolute; top:-60px; right:-60px;
    width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.05);
  }
  .hero-top { display:flex; align-items:center; gap:12px; padding:14px 0 20px; }
  .hero-title { font-size:13px; color:rgba(255,255,255,0.6); font-weight:500; flex:1; }
  .hero-action {
    width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.15);
    border:none; color:#fff; font-size:16px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
  }
  .pet-profile-block { display:flex; gap:18px; align-items:flex-end; }
  .pet-avatar-large {
    width:88px; height:88px; border-radius:22px; background:rgba(255,255,255,0.12);
    border:2px solid rgba(255,255,255,0.2); display:flex; align-items:center;
    justify-content:center; font-size:46px; flex-shrink:0;
  }
  .pet-identity { flex:1; padding-bottom:4px; }
  .pet-nickname { font-family:'Fraunces',serif; font-size:30px; font-weight:700; color:#fff; line-height:1.1; margin-bottom:2px; font-style:italic; }
  .pet-official-name { font-size:10px; color:rgba(255,255,255,0.5); margin-bottom:8px; line-height:1.4; font-weight:500; }
  .pet-subtitle { font-size:13px; color:rgba(255,255,255,0.65); margin-bottom:10px; }
  .status-pill {
    display:inline-flex; align-items:center; gap:5px;
    background:rgba(168,213,162,0.2); border:1px solid rgba(168,213,162,0.4);
    border-radius:20px; padding:4px 10px; font-size:11px; font-weight:600;
    color:#A8D5A2; letter-spacing:.04em; text-transform:uppercase;
  }
  .profile-tabs {
    background:#2D5A27; display:flex; padding:12px 24px 0; gap:4px; flex-shrink:0;
  }
  .p-tab {
    flex:1; padding:9px 4px; font-size:11px; font-weight:600; letter-spacing:.04em;
    color:rgba(255,255,255,0.45); text-align:center; cursor:pointer;
    border-bottom:2px solid transparent; transition:all .15s; white-space:nowrap;
  }
  .p-tab.active { color:#fff; border-bottom-color:#A8D5A2; }
  .tab-content { flex:1; padding:20px 24px 32px; display:flex; flex-direction:column; gap:14px; }
  .info-card {
    background:#fff; border-radius:18px; padding:16px;
    box-shadow:0 2px 12px rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.04);
  }
  .card-heading {
    font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
    color:#2D5A27; margin-bottom:12px; display:flex; align-items:center; gap:6px;
  }
  .card-heading::after { content:''; flex:1; height:1px; background:#EEF5EC; }
  .info-row {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding:7px 0; border-bottom:1px solid #F5F0E8;
  }
  .info-row:last-child { border-bottom:none; padding-bottom:0; }
  .info-key { font-size:12px; color:#8A9A84; font-weight:500; flex-shrink:0; padding-right:12px; }
  .info-val { font-size:12px; color:#1C2A19; font-weight:600; text-align:right; line-height:1.3; }
  .info-val.mono { font-family:monospace; font-size:11px; background:#F5F0E8; padding:2px 7px; border-radius:5px; }
  .tag { display:inline-block; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:600; }
  .tag-green { background:#EEF5EC; color:#2D5A27; }
  .tag-yellow { background:#FFF8E1; color:#7A5C00; }
  .tag-red { background:#FDECEA; color:#B71C1C; }
  .tag-grey { background:#F0EDE8; color:#5A6E54; }

  .action-btn {
    background:#2D5A27; color:#fff; border:none; border-radius:14px;
    padding:15px; font-size:14px; font-weight:600; cursor:pointer; width:100%;
    font-family:'Instrument Sans',sans-serif; display:flex; align-items:center;
    justify-content:center; gap:8px; transition:background .15s;
  }
  .action-btn:hover { background:#246420; }
  .action-btn.outline {
    background:transparent; color:#2D5A27; border:2px solid #2D5A27;
  }
  .action-btn.outline:hover { background:#EEF5EC; }

  /* ── SUCCESS ── */
  .success-screen {
    flex:1; display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:40px 32px; text-align:center; gap:16px;
  }
  .success-icon {
    width:90px; height:90px; background:#EEF5EC; border-radius:28px;
    display:flex; align-items:center; justify-content:center; font-size:44px;
    animation:pop .4s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes pop {
    0% { transform:scale(.5); opacity:0; }
    100% { transform:scale(1); opacity:1; }
  }
  .success-title { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:#1C2A19; line-height:1.2; }
  .success-sub { font-size:14px; color:#7A8C74; line-height:1.5; max-width:280px; }
  .success-summary {
    background:#fff; border-radius:16px; padding:14px 18px; width:100%;
    border:1px solid rgba(0,0,0,0.06); text-align:left;
  }

  .screen::-webkit-scrollbar { width:3px; }
  .screen::-webkit-scrollbar-track { background:transparent; }
  .screen::-webkit-scrollbar-thumb { background:#D5CEBD; border-radius:2px; }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function blankForm(): FormState {
  return {
    medication: "",
    medicationFreeText: "",
    dosageAmount: "",
    dosageUnit: "",
    weight: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    disposal: "",
    notes: "",
  };
}

export default function FosterApp() {
  // ── Auth ──
  const [fosterId, setFosterId] = useState<string | null>(null);
  const [fosterName, setFosterName] = useState<string>("");

  // ── Data ──
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Navigation ──
  const [screen, setScreen] = useState<"home" | "log" | "profile" | "success">("home");
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [profileAnimal, setProfileAnimal] = useState<Animal | null>(null);
  const [profileTab, setProfileTab] = useState("Profile");

  // ── Form ──
  const [form, setForm] = useState<FormState>(blankForm());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: session, status } = useSession();

  // ── Load data on mount ──
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.volunteerId) {
      setFetchError("Not authenticated.");
      setLoading(false);
      return;
    }

    const id = session.user.volunteerId;
    setFosterId(id);

    fetch(`/api/animals?fosterId=${encodeURIComponent(id)}`, {
      headers: RESCUE_HEADER,
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (data.error) throw new Error(data.error);

        setFosterName(data.volunteer.firstName ?? "");
        setAnimals(data.animals);

        const logGroups = await Promise.all(
          data.animals.map((a: Animal) =>
            fetch(`/api/treatment-logs?animalId=${encodeURIComponent(a.id)}`, {
              headers: RESCUE_HEADER,
            })
              .then((r) => r.json())
              .then((logs: Array<{ id: string; medicationName: string; dosageAmount: number; dosageUnit: string; administeredAt: string }>) =>
                logs.map((l) => ({
                  id: l.id,
                  animalNickname: animalNickname(a),
                  medicationName: l.medicationName,
                  dosageAmount: l.dosageAmount,
                  dosageUnit: l.dosageUnit,
                  administeredAt: l.administeredAt,
                }))
              )
              .catch(() => [] as RecentLog[])
          )
        );

        const sorted = logGroups
          .flat()
          .sort(
            (a, b) =>
              new Date(b.administeredAt).getTime() -
              new Date(a.administeredAt).getTime()
          );
        setRecentLogs(sorted);
      })
      .catch((err: Error) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, [status, session]);

  // ── Actions ──
  function startLog(animal: Animal) {
    setSelectedAnimal(animal);
    setStep(1);
    setForm(blankForm());
    setSubmitError(null);
    setScreen("log");
  }

  function openProfile(animal: Animal) {
    setProfileAnimal(animal);
    setProfileTab("Profile");
    setScreen("profile");
  }

  async function handleSubmit() {
    if (!selectedAnimal || !fosterId) return;
    setSubmitting(true);
    setSubmitError(null);

    const medEntry = MEDICATION_MAP[form.medication];

    try {
      const res = await fetch("/api/treatment-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...RESCUE_HEADER,
        },
        body: JSON.stringify({
          animalId: selectedAnimal.id,
          administeredById: fosterId,
          medicationType: medEntry.type,
          medicationName: resolvedMedicationName(form),
          medicationNameFreeText: needsFreeText(form.medication)
            ? form.medicationFreeText
            : null,
          dosageAmount: parseFloat(form.dosageAmount),
          dosageUnit: form.dosageUnit,
          administeredAt: new Date(
            `${form.date}T${form.time}`
          ).toISOString(),
          animalWeightKg: parseFloat(form.weight),
          medicationDisposal: DISPOSAL_MAP[form.disposal],
          notes: form.notes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? "Submission failed. Please try again.");
        return;
      }

      // Prepend to recent logs so the home screen reflects the new entry
      setRecentLogs((prev) => [
        {
          id: json.id,
          animalNickname: animalNickname(selectedAnimal),
          medicationName: json.medicationName,
          dosageAmount: json.dosageAmount,
          dosageUnit: json.dosageUnit,
          administeredAt: json.administeredAt,
        },
        ...prev,
      ]);

      setScreen("success");
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canAdvance2 =
    form.medication &&
    form.dosageAmount &&
    form.dosageUnit &&
    form.weight &&
    form.disposal &&
    (!needsFreeText(form.medication) || form.medicationFreeText);

  // ── Loading / error states ──
  if (loading) {
    return (
      <div style={{ background: "#1a1a18", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <style>{styles}</style>
        <div className="phone-shell" style={{ alignItems: "center", justifyContent: "center", color: "#7A8C74", fontSize: 14 }}>
          Loading…
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ background: "#1a1a18", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <style>{styles}</style>
        <div className="phone-shell" style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: "#1C2A19", marginBottom: 12 }}>
            Setup required
          </p>
          <pre style={{ fontSize: 12, color: "#B71C1C", background: "#FDECEA", padding: 14, borderRadius: 12, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {fetchError}
          </pre>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div style={{ background: "#1a1a18", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 20 }}>
      <style>{styles}</style>
      <div className="phone-shell">
        <div className="status-bar">
          <span>9:41</span>
          <span>DAR Foster</span>
          <span>●●●</span>
        </div>

        {/* ── HOME ── */}
        {screen === "home" && (
          <>
            <div className="screen">
              <div className="home-header">
                <div className="dar-badge">🐾 DAR · Drogheda Animal Rescue</div>
                <div className="greeting">
                  {getTimeGreeting()},<br />
                  <span>{fosterName || "there"}!</span>
                </div>
                <div className="greeting-sub">
                  You have {animals.length} animal{animals.length !== 1 ? "s" : ""} in your care
                </div>
              </div>

              <div className="section-label">Your Animals</div>
              <div className="animal-cards">
                {animals.map((a) => (
                  <div className="animal-card" key={a.id} onClick={() => openProfile(a)}>
                    <div className="animal-avatar">{animalPhoto(a)}</div>
                    <div className="animal-info">
                      <div className="animal-nickname">{animalNickname(a)}</div>
                      <div className="animal-official">{a.officialName}</div>
                      <div className="animal-meta">
                        {animalSpeciesLabel(a)}
                        {a.ageAtIntake ? ` · ${a.ageAtIntake}` : ""}
                        {a.description ? ` · ${a.description}` : ""}
                      </div>
                    </div>
                    <button
                      className="log-btn"
                      onClick={(e) => { e.stopPropagation(); startLog(a); }}
                    >
                      + Log
                    </button>
                  </div>
                ))}
              </div>

              <div className="section-label" style={{ paddingTop: 24 }}>Recent Treatments</div>
              <div className="recent-section">
                {recentLogs.length === 0 && (
                  <p style={{ fontSize: 13, color: "#9AA890", paddingBottom: 8 }}>No treatments logged yet.</p>
                )}
                {recentLogs.slice(0, 3).map((l) => (
                  <div className="recent-card" key={l.id}>
                    <div className="recent-top">
                      <div className="recent-animal">{l.animalNickname}</div>
                      <div className="recent-date">{formatDate(l.administeredAt.split("T")[0])}</div>
                    </div>
                    <div className="recent-med">
                      {l.medicationName} · {l.dosageAmount} {DOSAGE_UNIT_LABELS[l.dosageUnit] ?? l.dosageUnit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="nav-bar">
              <div className="nav-item active"><span className="nav-icon">🐾</span><span className="nav-label">Animals</span></div>
              <div className="nav-item"><span className="nav-icon">💊</span><span className="nav-label">Treatments</span></div>
              <div className="nav-item"><span className="nav-icon">📋</span><span className="nav-label">History</span></div>
              <div className="nav-item"><span className="nav-icon">👤</span><span className="nav-label">Profile</span></div>
            </div>
          </>
        )}

        {/* ── PET PROFILE ── */}
        {screen === "profile" && profileAnimal && (
          <>
            <div className="screen">
              <div className="pet-hero">
                <div className="hero-top">
                  <button className="back-btn" onClick={() => setScreen("home")}>←</button>
                  <span className="hero-title">Animal File</span>
                  <button className="hero-action">⋯</button>
                </div>
                <div className="pet-profile-block">
                  <div className="pet-avatar-large">{animalPhoto(profileAnimal)}</div>
                  <div className="pet-identity">
                    <div className="pet-nickname">{animalNickname(profileAnimal)}</div>
                    <div className="pet-official-name">{profileAnimal.officialName}</div>
                    <div className="pet-subtitle">
                      {animalSpeciesLabel(profileAnimal)} · {animalGenderLabel(profileAnimal)}
                      {profileAnimal.ageAtIntake ? ` · ${profileAnimal.ageAtIntake}` : ""}
                    </div>
                    <span className="status-pill">✓ {profileAnimal.status.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="profile-tabs">
                  {["Profile", "Medical", "Notes"].map((t) => (
                    <div
                      key={t}
                      className={`p-tab ${profileTab === t ? "active" : ""}`}
                      onClick={() => setProfileTab(t)}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              <div className="tab-content">
                {profileTab === "Profile" && (
                  <>
                    <div className="info-card">
                      <div className="card-heading">🗂 Intake</div>
                      {profileAnimal.darRefNumber && (
                        <div className="info-row">
                          <span className="info-key">DAR ID</span>
                          <span className="info-val mono">{profileAnimal.darRefNumber}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="info-key">Official name</span>
                        <span className="info-val" style={{ fontSize: 10, lineHeight: 1.4 }}>{profileAnimal.officialName}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-key">Intake date</span>
                        <span className="info-val">{formatDate(profileAnimal.intakeDate.split("T")[0])}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-key">Source</span>
                        <span className="info-val">
                          <span className="tag tag-grey">{profileAnimal.intakeSource.replace(/_/g, " ")}</span>
                        </span>
                      </div>
                    </div>
                    <div className="info-card">
                      <div className="card-heading">🐾 Details</div>
                      <div className="info-row">
                        <span className="info-key">Species</span>
                        <span className="info-val">{animalSpeciesLabel(profileAnimal)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-key">Gender</span>
                        <span className="info-val">{animalGenderLabel(profileAnimal)}</span>
                      </div>
                      {profileAnimal.ageAtIntake && (
                        <div className="info-row">
                          <span className="info-key">Age at intake</span>
                          <span className="info-val">{profileAnimal.ageAtIntake}</span>
                        </div>
                      )}
                      {profileAnimal.description && (
                        <div className="info-row">
                          <span className="info-key">Coat</span>
                          <span className="info-val">{profileAnimal.description}</span>
                        </div>
                      )}
                    </div>
                    {(profileAnimal.vetRefNumber || profileAnimal.microchipNumber) && (
                      <div className="info-card">
                        <div className="card-heading">🏥 Vet References</div>
                        {profileAnimal.vetRefNumber && (
                          <div className="info-row">
                            <span className="info-key">Vet ref</span>
                            <span className="info-val mono">{profileAnimal.vetRefNumber}</span>
                          </div>
                        )}
                        {profileAnimal.microchipNumber && (
                          <div className="info-row">
                            <span className="info-key">Microchip</span>
                            <span className="info-val mono" style={{ fontSize: 10 }}>{profileAnimal.microchipNumber}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {profileTab === "Medical" && (
                  <>
                    <div className="info-card">
                      <div className="card-heading">🔬 Test Results</div>
                      {profileAnimal.fivResult && (
                        <div className="info-row">
                          <span className="info-key">FIV</span>
                          <span className="info-val">
                            <span className={`tag ${profileAnimal.fivResult === "NEGATIVE" ? "tag-green" : profileAnimal.fivResult === "POSITIVE" ? "tag-red" : "tag-grey"}`}>
                              {profileAnimal.fivResult.replace(/_/g, " ")}
                            </span>
                          </span>
                        </div>
                      )}
                      {profileAnimal.felvResult && (
                        <div className="info-row">
                          <span className="info-key">FeLV</span>
                          <span className="info-val">
                            <span className={`tag ${profileAnimal.felvResult === "NEGATIVE" ? "tag-green" : profileAnimal.felvResult === "POSITIVE" ? "tag-red" : "tag-grey"}`}>
                              {profileAnimal.felvResult.replace(/_/g, " ")}
                            </span>
                          </span>
                        </div>
                      )}
                      {profileAnimal.vaccinationStatus && (
                        <div className="info-row">
                          <span className="info-key">Vaccinations</span>
                          <span className="info-val">
                            <span className={`tag ${profileAnimal.vaccinationStatus === "FULLY_VACCINATED" || profileAnimal.vaccinationStatus === "V1_AND_V2" ? "tag-green" : "tag-yellow"}`}>
                              {profileAnimal.vaccinationStatus.replace(/_/g, " ")}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    <button className="action-btn" onClick={() => startLog(profileAnimal)}>
                      💊 Log new treatment
                    </button>
                  </>
                )}

                {profileTab === "Notes" && (
                  <div className="info-card">
                    <div className="card-heading">📝 Legacy Notes</div>
                    {profileAnimal.legacyNotes ? (
                      <p style={{ fontSize: 13, color: "#3A4A35", lineHeight: 1.6 }}>{profileAnimal.legacyNotes}</p>
                    ) : (
                      <p style={{ fontSize: 13, color: "#9AA890" }}>No notes on file.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="nav-bar">
              <div className="nav-item active"><span className="nav-icon">🐾</span><span className="nav-label">Animals</span></div>
              <div className="nav-item"><span className="nav-icon">💊</span><span className="nav-label">Treatments</span></div>
              <div className="nav-item"><span className="nav-icon">📋</span><span className="nav-label">History</span></div>
              <div className="nav-item"><span className="nav-icon">👤</span><span className="nav-label">Profile</span></div>
            </div>
          </>
        )}

        {/* ── LOG TREATMENT ── */}
        {screen === "log" && selectedAnimal && (
          <div className="screen">
            <div className="log-header">
              <button
                className="back-btn"
                onClick={() => step === 1 ? setScreen("home") : setStep((s) => s - 1)}
              >
                ←
              </button>
              <div className="log-header-text">
                <div className="log-header-title">Log Treatment</div>
                <div className="log-header-sub">
                  {step === 1 && "Select animal"}
                  {step === 2 && `Treatment for ${animalNickname(selectedAnimal)}`}
                  {step === 3 && "Review & confirm"}
                </div>
              </div>
            </div>

            <div className="step-indicator">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`step-dot ${i < step ? "done" : i === step ? "active" : ""}`} />
              ))}
            </div>

            <div className="form-body">
              {/* Step 1: Select animal */}
              {step === 1 && (
                <>
                  <div className="field-group">
                    <div className="field-label">Which animal?</div>
                    <div className="animal-select-grid">
                      {animals.map((a) => (
                        <div
                          key={a.id}
                          className={`animal-select-card ${selectedAnimal?.id === a.id ? "selected" : ""}`}
                          onClick={() => setSelectedAnimal(a)}
                        >
                          <span className="asc-emoji">{animalPhoto(a)}</span>
                          <span className="asc-name">{animalNickname(a)}</span>
                          <span className="asc-species">{animalSpeciesLabel(a)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="next-btn" onClick={() => setStep(2)} disabled={!selectedAnimal}>
                    Continue →
                  </button>
                  <p className="hint">Step 1 of 3</p>
                </>
              )}

              {/* Step 2: Treatment details */}
              {step === 2 && (
                <>
                  <div className="field-group">
                    <div className="field-label">Medication<span>*</span></div>
                    <select
                      className="field-select"
                      value={form.medication}
                      onChange={(e) => setForm({ ...form, medication: e.target.value, medicationFreeText: "" })}
                    >
                      <option value="">Select medication…</option>
                      {(MEDICATIONS[animalSpeciesLabel(selectedAnimal)] ?? MEDICATIONS.Cat).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {needsFreeText(form.medication) && (
                    <div className="field-group">
                      <div className="field-label">Specify medication<span>*</span></div>
                      <input
                        className="field-input"
                        placeholder="e.g. Amoxicillin 50mg"
                        value={form.medicationFreeText}
                        onChange={(e) => setForm({ ...form, medicationFreeText: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Dosage: split into amount + unit (required by schema) */}
                  <div className="field-row">
                    <div className="field-group">
                      <div className="field-label">Amount<span>*</span></div>
                      <input
                        className="field-input"
                        type="number"
                        placeholder="e.g. 1"
                        step="0.25"
                        min="0"
                        value={form.dosageAmount}
                        onChange={(e) => setForm({ ...form, dosageAmount: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <div className="field-label">Unit<span>*</span></div>
                      <select
                        className="field-select"
                        value={form.dosageUnit}
                        onChange={(e) => setForm({ ...form, dosageUnit: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {Object.entries(DOSAGE_UNIT_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <div className="field-label">Weight (kg)<span>*</span></div>
                      <input
                        className="field-input"
                        type="number"
                        placeholder="e.g. 2.1"
                        step="0.1"
                        min="0"
                        value={form.weight}
                        onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <div className="field-label">Date<span>*</span></div>
                      <input
                        className="field-input"
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <div className="field-label">Time</div>
                    <input
                      className="field-input"
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </div>

                  <div className="field-group">
                    <div className="field-label">Disposal of remainder<span>*</span></div>
                    <select
                      className="field-select"
                      value={form.disposal}
                      onChange={(e) => setForm({ ...form, disposal: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {DISPOSAL_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <div className="field-label">Notes (optional)</div>
                    <input
                      className="field-input"
                      placeholder="Observations, reactions…"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  <div className="doa-banner">
                    <span className="doa-icon">🏛</span>
                    <div className="doa-text">
                      <strong>Department of Agriculture requirement</strong>
                      Weight, dosage, disposal method, and administrator are required for compliance. This record will be available for inspection.
                    </div>
                  </div>

                  <button className="next-btn" onClick={() => setStep(3)} disabled={!canAdvance2}>
                    Review →
                  </button>
                  <p className="hint">Step 2 of 3</p>
                </>
              )}

              {/* Step 3: Review & confirm */}
              {step === 3 && (
                <>
                  <div className="field-group">
                    <div className="field-label">Review treatment log</div>
                    <div className="review-block">
                      <div className="review-row">
                        <span className="review-key">Animal</span>
                        <span className="review-val">{animalPhoto(selectedAnimal)} {animalNickname(selectedAnimal)}</span>
                      </div>
                      <div className="review-row">
                        <span className="review-key">Official name</span>
                        <span className="review-val" style={{ fontSize: 10, lineHeight: 1.4 }}>{selectedAnimal.officialName}</span>
                      </div>
                      <div className="review-row">
                        <span className="review-key">Medication</span>
                        <span className="review-val">{displayMedication(form)}</span>
                      </div>
                      <div className="review-row">
                        <span className="review-key">Dosage</span>
                        <span className="review-val">{form.dosageAmount} {DOSAGE_UNIT_LABELS[form.dosageUnit]}</span>
                      </div>
                      <div className="review-row">
                        <span className="review-key">Animal weight</span>
                        <span className="review-val">{form.weight} kg</span>
                      </div>
                      <div className="review-row">
                        <span className="review-key">Date & time</span>
                        <span className="review-val">{formatDate(form.date)}, {form.time}</span>
                      </div>
                      <div className="review-row">
                        <span className="review-key">Administered by</span>
                        <span className="review-val">{fosterName || fosterId}</span>
                      </div>
                      <div className="review-row">
                        <span className="review-key">Disposal</span>
                        <span className="review-val">{form.disposal}</span>
                      </div>
                      {form.notes && (
                        <div className="review-row">
                          <span className="review-key">Notes</span>
                          <span className="review-val">{form.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {submitError && (
                    <div className="error-banner">{submitError}</div>
                  )}

                  <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "✓ Submit Treatment Log"}
                  </button>
                  <p className="hint">Step 3 of 3 · Saved to DAR records & DoA-ready</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {screen === "success" && selectedAnimal && (
          <div className="screen">
            <div className="success-screen">
              <div className="success-icon">✅</div>
              <div className="success-title">Treatment<br />Logged!</div>
              <div className="success-sub">
                Saved to DAR&apos;s records and available for Department of Agriculture inspection.
              </div>
              <div className="success-summary">
                <div className="review-row" style={{ paddingTop: 0 }}>
                  <span className="review-key">Animal</span>
                  <span className="review-val">{animalPhoto(selectedAnimal)} {animalNickname(selectedAnimal)}</span>
                </div>
                <div className="review-row">
                  <span className="review-key">Treatment</span>
                  <span className="review-val" style={{ fontSize: 11 }}>{displayMedication(form)}</span>
                </div>
                <div className="review-row" style={{ paddingBottom: 0 }}>
                  <span className="review-key">Logged by</span>
                  <span className="review-val">{fosterName || fosterId}</span>
                </div>
              </div>
              <button className="action-btn outline" onClick={() => startLog(selectedAnimal)}>
                + Log another treatment
              </button>
              <button className="action-btn" onClick={() => setScreen("home")}>
                Back to my animals
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
