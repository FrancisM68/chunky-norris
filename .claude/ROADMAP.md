# ChunkyNorris — Development Roadmap

## What's done (Day 1)

- Next.js project scaffolded with TypeScript, Tailwind, ESLint
- Prisma schema — all 8 entities defined and migrated
- PostgreSQL running locally, all tables created
- Multi-tenant middleware with SQL injection protection
- Treatment log API — POST + GET, 16 tests passing
- Animals API — fetches active foster assignments by volunteer
- Foster mobile app — wired to real backend, 3-step flow intact
- CLAUDE.md — complete with compliance rules, conventions, lessons learned

---

## Next session (Morning, Day 2)

**Goal: See the app run for the first time with real data**

### Step 1 — Create a test volunteer record
Claude Code will seed the database with a Lisa Martinez volunteer record
so the foster app has something to log in as.

### Step 2 — First run
```
npm run dev
```
Open http://localhost:3000/foster, set the localStorage key in the browser
console, and log a real treatment for the first time.

### Step 3 — Auth system (NextAuth)
This is the most important architectural piece before any other UI work.
Every screen depends on knowing who is logged in and what role they have.

Claude Code will set up:
- NextAuth with credentials provider (email + password for now)
- Role-based middleware — admin routes locked to ADMIN role,
  foster routes locked to FOSTER role
- Session includes volunteer ID and role — replaces the localStorage hack
- Protected route wrapper component

### Step 4 — Commit and tag
Tag this commit as `v0.1.0-foundation` — the first working end-to-end
slice of the compliance system.

---

## Next week objectives (Days 2–7)

### Day 2–3: Auth + Admin foundations
- NextAuth setup with RBAC (see Next session above)
- Basic admin layout — sidebar navigation, header, responsive shell
- Animal list page — searchable, filterable table of all animals in care
- Add/edit animal form — all fields from the schema, species-driven
  field visibility (FIV/FeLV for cats, kennel cough for dogs)

### Day 4: Treatment log admin view
- Treatment history page per animal — lists all TreatmentLog entries
- Admin can add treatments on behalf of fosters (bulk entry mode)
- Flag animals with no treatment logs in the last 30 days
- This directly addresses the DoA compliance gap

### Day 5: Legacy data migration
- Import script for DAR_CAT_REGISTER_MASTER.xlsx (1,172 records)
- Import script for DAR_TNR_ONLY_REGISTER.xlsx (281 records)
- All structured fields map to schema columns
- NOTES field → legacyNotes (plain text, no parsing)
- Run migration against local DB, verify record counts
- This gives Lisa real data to work with immediately

### Day 6: CSV export
- Export endpoint: all animals with their treatment logs
- Format matches what the Department of Agriculture expects
- Filters: date range, species, outcome, foster name
- Download button in admin UI
- This completes the P0 compliance picture end-to-end

### Day 7: Review + buffer
- Fix anything that broke during the week
- Manual test the full foster flow end-to-end with real data
- Review CLAUDE.md — update with any new conventions or lessons
- Prepare demo for Lisa

---

## Milestones and releases

### v0.1.0 — Foundation ✅ Released 2026-03-30
The first slice that actually works end-to-end.
- Foster can log a treatment in 3 steps
- Treatment is stored in the database with all P0 fields
- Auth.js v5 credentials login with RBAC middleware
- Session includes volunteerId and roles — localStorage hack removed
- Sign out with redirect to /login
**Significance:** Proves the architecture works. First moment DAR
could theoretically use this instead of paper notebooks.

### v0.2.0 — Auth + Animal Register (End of Day 3–4)
- Real login — no more localStorage hack
- Admin can manage animals and view treatment history
- Species-driven field visibility working
**Significance:** Lisa can log in and see DAR's animals.

### v0.3.0 — Real Data (End of Day 5)
- 1,172 cat records imported from Excel
- 281 TNR records imported
- Legacy notes preserved
**Significance:** The app stops being a demo and becomes DAR's
actual system. This is the migration milestone.

### v0.4.0 — Compliance Complete (End of Day 6)
- CSV export working
- All P0 requirements demonstrably met end-to-end
- Treatment log → export → DoA report flow complete
**Significance:** DAR could pass a Department of Agriculture
audit with this version. Grant funding is protected.

### v0.5.0 — Demo-Ready MVP (End of Week 2)
- TNR module
- Adoption workflow with treatment history handoff
- Home check module (35-question form)
- Polish and bug fixes
**Significance:** Full feature set for Lisa to demo to the
DAR board and other volunteers.

### v1.0.0 — Production (Target: 4–6 weeks)
- Hetzner VPS set up and configured
- Domain, SSL, backups in place
- DAR fully migrated off Excel
- At least 2 weeks of parallel running (Excel + app simultaneously)
  before Excel is retired
**Significance:** ChunkyNorris is live. DAR is compliant.

---

## Risks to watch

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Legacy data is messier than expected | High | Budget Day 5 fully for migration, don't rush it |
| Lisa finds UX issues in the foster app | Medium | Demo to her after v0.1.0, before building more |
| Auth complexity delays everything | Medium | Keep auth simple — credentials only, no OAuth yet |
| Prisma 7 surprises us again | Low | Documented in CLAUDE.md now, should be smoother |

---

## What's NOT in scope yet (P3 / future)

- Hetzner setup — after v0.4.0
- Multi-rescue onboarding (rescue #2) — after v1.0.0
- Payment processing for adoption fees
- Email notifications to fosters
- Mobile app (native) — the web app is mobile-optimised for now
