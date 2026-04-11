# DESIGN.md — ChunkyNorris

> This file defines the visual design system for ChunkyNorris.
> Claude Code should read this before building any UI component, page, or layout.

---

## 1. Visual Theme & Atmosphere

ChunkyNorris is a rescue management platform — warm, purposeful, and trustworthy.
It should feel like a well-made craft publication that happens to run on a computer:
organic, not clinical; structured, not corporate; alive, not generic.

The foster-facing app and the admin back-office share the same visual soul.
The admin is denser and wider, but it is **not** a different product.
Never reach for default Tailwind greys, flat blue links, or generic dashboard chrome.

**Mood:** Warm woodland. A forest ranger's logbook, digitised.  
**Density:** Comfortable. Lisa is not very tech-savvy — generous spacing, clear labels, no information overload.  
**Personality:** Fraunces serif for character; Instrument Sans for clarity.

---

## 2. Colour Palette

| Token | Hex | Role |
|---|---|---|
| `forest` | `#2D5A27` | Primary — header bars, primary buttons, active nav, key accents |
| `forest-dark` | `#246420` | Primary hover state |
| `forest-light` | `#EEF5EC` | Tinted surface — avatar backgrounds, subtle highlights |
| `sage` | `#6B7A5E` | Secondary text, section labels, muted UI |
| `sage-light` | `#9AA890` | Placeholder text, timestamps, tertiary labels |
| `leaf` | `#A8D5A2` | Italic accent in headings, decorative green on dark backgrounds |
| `parchment` | `#F5F0E8` | **Page background** — the warm canvas everything sits on |
| `parchment-dark` | `#EDE8DF` | Slightly deeper parchment for sidebar or secondary panels |
| `ink` | `#1C2A19` | Primary text — deep forest, not pure black |
| `card` | `#FFFFFF` | Card and panel surfaces |
| `amber` | `#FFF3CD` | Warning / condition tag background |
| `amber-border` | `#F0D060` | Warning / condition tag border |
| `amber-text` | `#7A5C00` | Warning / condition tag text |
| `danger` | `#C0392B` | Destructive actions, error states |
| `border` | `rgba(0,0,0,0.06)` | Subtle dividers and card edges |

**Rules:**
- Page background is always `parchment` (#F5F0E8). Never white, never grey-100.
- Primary action buttons are always `forest` green. Never blue, never indigo.
- Do not introduce purple, teal, or any colour not in this palette.

---

## 3. Typography

| Font | Source | Usage |
|---|---|---|
| **Fraunces** | Google Fonts | Display headings, animal names, page titles, greeting text |
| **Instrument Sans** | Google Fonts | All UI text — labels, body, buttons, inputs, tables |

```
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=Instrument+Sans:wght@400;500;600&display=swap');
```

### Type Scale

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Page title | Fraunces | 28px / 1.75rem | 600 | Can use italic span for animal names |
| Section heading | Fraunces | 20px / 1.25rem | 600 | |
| Card title / animal name | Fraunces | 17px / 1.0625rem | 600 | |
| Section label | Instrument Sans | 11px / 0.6875rem | 600 | Uppercase, letter-spacing 0.1em, `sage` colour |
| Body / table cell | Instrument Sans | 14px / 0.875rem | 400 | `ink` colour |
| Secondary / meta | Instrument Sans | 12px / 0.75rem | 400 | `sage` colour |
| Button | Instrument Sans | 13px / 0.8125rem | 600 | |
| Timestamp / tertiary | Instrument Sans | 11px / 0.6875rem | 400 | `sage-light` colour |

**Rules:**
- Fraunces is used **only** for headings and proper names. Never for body text, labels, or buttons.
- Animal names in headings may use `font-style: italic` in `leaf` (#A8D5A2) when on a dark background.
- Section labels are always uppercase with `letter-spacing: 0.1em`.

---

## 4. Component Styling

### Buttons

```
Primary:
  background: #2D5A27  color: #fff  border-radius: 10px
  padding: 10px 20px  font: 600 13px Instrument Sans
  hover: background #246420  transition: 0.15s

Secondary / Ghost:
  background: transparent  color: #2D5A27
  border: 1.5px solid #2D5A27  border-radius: 10px
  padding: 9px 18px  hover: background #EEF5EC

Danger:
  background: #C0392B  color: #fff  border-radius: 10px
  padding: 10px 20px  hover: background #a93226

Disabled:
  opacity: 0.45  cursor: not-allowed
```

### Cards & Panels

```
background: #FFFFFF
border-radius: 16px
border: 1px solid rgba(0,0,0,0.06)
box-shadow: 0 2px 12px rgba(0,0,0,0.06)
padding: 20px 24px
```
- Cards sit on the parchment background — the contrast between warm cream and white is deliberate.
- Do not add heavy drop shadows. Elevation is expressed subtly.

### Form Inputs

```
background: #FFFFFF
border: 1.5px solid rgba(0,0,0,0.12)
border-radius: 10px
padding: 10px 14px
font: 400 14px Instrument Sans  color: #1C2A19
focus: border-color #2D5A27, outline none, box-shadow 0 0 0 3px rgba(45,90,39,0.12)
placeholder: color #9AA890
```

### Tables

```
background: #FFFFFF
border-radius: 16px
border: 1px solid rgba(0,0,0,0.06)
overflow: hidden

thead:
  background: #EEF5EC
  font: 600 11px Instrument Sans  color: #6B7A5E
  text-transform: uppercase  letter-spacing: 0.08em
  padding: 12px 20px

tbody tr:
  border-top: 1px solid rgba(0,0,0,0.05)
  padding: 14px 20px
  font: 400 14px Instrument Sans  color: #1C2A19

tbody tr:hover:
  background: #F9F7F3
```
- Tables have a `forest-light` (`#EEF5EC`) header, not grey.
- Row hover uses a slightly deeper parchment, not blue.

### Status / Condition Tags

```
In Care:
  background #EEF5EC  color #2D5A27  border 1px solid #A8D5A2
  border-radius 6px  padding 3px 10px  font 600 11px

Fostered:
  background #FFF3CD  color #7A5C00  border 1px solid #F0D060

Adopted:
  background #E8F4FD  color #1A5276  border 1px solid #AED6F1

Medical / Condition:
  background #FFF3CD  color #7A5C00  border 1px solid #F0D060

TNR:
  background #F4ECF7  color #6C3483  border 1px solid #D7BDE2
```

### Navigation (Admin Sidebar)

```
background: #2D5A27
width: 220px  min-height: 100vh

Logo area:
  padding: 24px 20px 20px
  font: Fraunces 600 20px  color: #fff
  sub-label: Instrument Sans 11px  color rgba(255,255,255,0.55)

Nav item:
  padding: 10px 16px  border-radius: 10px  margin: 2px 8px
  font: Instrument Sans 600 13px  color: rgba(255,255,255,0.7)

Nav item active/hover:
  background: rgba(255,255,255,0.12)  color: #fff

Section label in sidebar:
  font: Instrument Sans 600 10px  color rgba(255,255,255,0.35)
  text-transform uppercase  letter-spacing 0.12em
  padding: 16px 16px 6px
```

### Page Header (Admin content area)

```
background: #2D5A27
padding: 24px 32px
color: #fff
title: Fraunces 600 28px
subtitle: Instrument Sans 400 13px  color rgba(255,255,255,0.6)
```
- Every main content page has a forest-green page header strip — this ties it to the foster app and eliminates the bland generic dashboard look.

---

## 5. Layout Principles

- **Page background:** Always `parchment` (#F5F0E8). Content cards float on it.
- **Content max-width:** 1200px, centred. Never full-bleed content on large screens.
- **Content padding:** 32px horizontal, 28px vertical on desktop.
- **Card gap:** 16px between sibling cards.
- **Section spacing:** 32px between major sections.
- **Sidebar + content:** Sidebar fixed at 220px, content area fills remainder.
- **Touch targets / click targets:** Minimum 40px tall for interactive rows and buttons — Lisa needs comfortable tap targets.

---

## 6. Depth & Elevation

Three levels only:

| Level | Usage | Shadow |
|---|---|---|
| 0 | Page background | none |
| 1 | Cards, panels, tables | `0 2px 12px rgba(0,0,0,0.06)` + 1px border |
| 2 | Dropdowns, modals, toasts | `0 8px 32px rgba(0,0,0,0.14)` |

- Do not use heavy shadows. Depth comes from the parchment-to-white contrast, not from shadow intensity.
- Modals use a backdrop of `rgba(28,42,25,0.4)` — tinted with `ink`, not pure black.

---

## 7. Do's and Don'ts

### Do
- Use Fraunces for all page titles, card headings, and animal names
- Use `parchment` as the page background everywhere — both foster and admin
- Use `forest` green for all primary actions and active states
- Give every admin page a `forest` green header bar
- Use `forest-light` (#EEF5EC) for table headers and avatar backgrounds
- Keep status tags small, bordered, and colour-coded (see tag palette above)
- Give inputs a green focus ring — `box-shadow: 0 0 0 3px rgba(45,90,39,0.12)`
- Keep spacing generous — this is used by non-technical volunteers

### Don't
- Don't use Tailwind's default `gray-*`, `blue-*`, or `indigo-*` colours for any visible UI element
- Don't use white as a page background
- Don't use pure black (`#000`) for text — use `ink` (#1C2A19)
- Don't add heavy box shadows — keep elevation subtle
- Don't use Fraunces for body text, labels, or button text
- Don't introduce new accent colours not in this palette
- Don't make tables full-bleed to the viewport — wrap them in a card with border-radius

---

## 8. Responsive Behaviour

- **Desktop (≥1024px):** Sidebar + content layout. Full table views.
- **Tablet (768–1023px):** Sidebar collapses to icon rail or hamburger. Content full width.
- **Mobile (≤767px):** Admin is not a primary mobile surface — foster app covers that. A basic responsive fallback is acceptable, not a priority.
- Form fields stack to full-width below 640px.
- Minimum touch target: 40px height on all interactive elements.

---

## 9. Agent Prompt Guide

### Quick colour reference for prompts
```
Page background:  #F5F0E8  (parchment)
Primary green:    #2D5A27  (forest)
Primary hover:    #246420
Light green tint: #EEF5EC  (forest-light)
Primary text:     #1C2A19  (ink)
Secondary text:   #6B7A5E  (sage)
Card surface:     #FFFFFF
Heading font:     Fraunces (serif)
Body font:        Instrument Sans (sans-serif)
```

### Ready-to-use prompts for CC

**New page:**
> "Build this page following DESIGN.md. Background is parchment (#F5F0E8). Include a forest green (#2D5A27) page header with a Fraunces title. Content in white cards with border-radius 16px."

**Data table:**
> "Build a data table following DESIGN.md. Table wrapped in a white card. Header row uses forest-light (#EEF5EC) background with sage uppercase labels. Row hover is #F9F7F3."

**Form:**
> "Build this form following DESIGN.md. Inputs have 1.5px border, border-radius 10px, green focus ring. Primary submit button is forest green. Form sits in a white card on parchment background."

**Status badge:**
> "Use status tags from DESIGN.md — small, border-radius 6px, colour-coded by status. In Care = green, Fostered = amber, Adopted = blue, Medical = amber, TNR = purple."
