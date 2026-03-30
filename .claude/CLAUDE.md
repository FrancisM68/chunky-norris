# ChunkyNorris — AI Instructions

## What this project is

ChunkyNorris is a pet rescue management web application built initially for
**Drogheda Animal Rescue (DAR)** in Ireland, with **Lisa Martinez** as the
primary stakeholder. It replaces DAR's Excel-based system to ensure compliance
with **Department of Agriculture** medication tracking requirements — which are
directly tied to DAR's annual grant funding.

The longer-term goal is to offer ChunkyNorris as a paid SaaS product to other
small animal rescue organisations across Ireland.

---

## Tech stack

- **Frontend**: Next.js (React)
- **Database**: PostgreSQL with Prisma ORM
- **Multi-tenancy**: Schema-per-rescue (each rescue gets its own Postgres schema)
- **Hosting**: Hetzner VPS (self-hosted for cost efficiency)
- **Auth**: Role-based access control (admin, foster, volunteer, home checker)

---

## User interfaces

Three distinct interfaces exist in this system:

1. **Back office admin** — Full data entry, reporting, CSV export, animal
   management. Used by Lisa and a small number of tech-confident volunteers.

2. **Mobile admin** — Streamlined version of the admin for field operations.
   Used when inputting data during phone calls or on-site visits.

3. **Foster mobile app** — Radically simplified. Maximum 3 steps to log a
   treatment. Designed for volunteers who are wary of technology.

---

## Core data model (8 entities)

- **Animal** — Supports cats, dogs, rabbits, ferrets. Dual naming: structured
  official name + foster-friendly nickname. Species drives which fields appear.
- **TreatmentLog** — The compliance-critical entity. Must capture: medication,
  dosage, date, administrator identity, animal weight, disposal method.
- **Volunteer** — Covers fosters, admins, TNR operators, home check inspectors.
- **FosterAssignment** — Links animals to fosters with start/end dates.
- **TNRRecord** — Separate from main animal records as required by Department
  of Agriculture. Tracks trap, neuter, return operations for feral cats.
- **HomeCheck** — 35-question assessment for dog adoptions. Required for DoA
  compliance. Captures property inspection results.
- **Adoption** — Adopter details, handoff documentation, treatment history
  summary for new owner.
- **Rescue** (tenant) — Top-level entity per organisation in the multi-tenant
  schema.

---

## Multi-tenancy architecture

- Each rescue organisation gets its own **PostgreSQL schema** (e.g.
  `dar.animals`, `lhac.animals`)
- Tenant switching is handled via `SET search_path` in Prisma middleware
- **Never** mix tenant data — always confirm the active schema before writes
- SQL injection prevention is required in all tenant-switching functions
- Connection pooling must respect `search_path` settings

---

## Prioritisation framework

| Level | Meaning |
|-------|---------|
| P0 | Department of Agriculture compliance — grant funding depends on this |
| P1 | Core MVP operations — DAR cannot function without this |
| P2 | Enhanced operations (adoption module, home checks) |
| P3 | Scalability and commercial features |

**Always complete P0 items before touching P1. Never let a P2/P3 feature
compromise a P0 requirement.**

---

## Department of Agriculture compliance rules

These are non-negotiable. Every TreatmentLog entry MUST capture:
- Specific medication name (structured field, not free text)
- Dosage and unit
- Date and time administered
- Identity of the person who administered it
- Animal weight at time of treatment
- Disposal method for the medication

TNR records must be stored separately from general animal records.

Species-specific fields must load dynamically — FIV/FeLV testing fields appear
for cats only, kennel cough vaccination for dogs only, etc.

---

## Key business rules

- Foster app must log a treatment in **3 steps or fewer**
- Animals can have multiple simultaneous fosters (handoff tracking)
- Legacy medication notes from Excel migration are stored as plain text — do
  not attempt to parse them into structured schema
- All animals must have a disposal method recorded when they leave care
  (rehomed, reclaimed, euthanised, died in care)
- CSV export must be available for all core data for DoA reporting

---

## What Claude should NOT do

- Do not modify `.env` files
- Do not refactor working, tested code unless explicitly asked
- Do not attempt to parse legacy free-text medication notes into structured data
- Do not mix data across tenant schemas under any circumstances
- Do not skip disposal method fields — they are P0 compliance requirements
- Do not simplify the TreatmentLog entity to fewer fields — every field exists
  for a regulatory reason
- Do not create a single shared database schema — the architecture is
  schema-per-rescue by design

---

## Coding conventions

- TypeScript throughout (frontend and backend)
- Prisma for all database access — no raw SQL except for tenant-switching
  middleware
- Named exports preferred
- Components live in `src/components`, pages in `src/app` (Next.js App Router)
- Shared types in `src/types`
- API routes in `src/app/api`
- Write tests for all API routes and compliance-critical functions

---

## Context on DAR's scale

- ~330–350 animal intakes per year
- 1,100+ cat records since 2022
- 280+ TNR operations since mid-2024
- Small volunteer base — most are not tech-savvy
- Data input resistance is a known problem — UI simplicity is critical for
  foster-facing screens

---

## Reference files

- `reference/foster-app-prototype.jsx` — Working UI prototype for the foster
  mobile app. Use this as the design reference when building the real component.
- `reference/DAR_CAT_REGISTER_MASTER.xlsx` — Live DAR data (1,172 cat records).
  Column mapping documented in `docs/migration-notes.md`.
- `reference/DAR_TNR_ONLY_REGISTER.xlsx` — 281 TNR records. Separate schema
  required per DoA rules.

## Environment setup

Before starting any project work, verify runtime prerequisites: `node --version`,
`npm --version`, and check PATH configuration. On Windows, Node.js may need to be
added to system PATH manually if using Git Bash.

## Prisma & database

- Prisma 7 uses driver adapters — do not use direct `url` in the datasource block
- Always load `.env` explicitly in Prisma scripts: `import 'dotenv/config'`
- Run `prisma generate` then `prisma db push` after any schema change before proceeding

## Project naming

Always use lowercase, hyphen-separated names for directories and npm packages.
npm rejects capitalised package names — `chunky-norris` not `ChunkyNorris`.

## Roadmap

See `.claude/ROADMAP.md` for the current development plan, milestones,
and session objectives. Check this before starting work to stay aligned
with priorities.