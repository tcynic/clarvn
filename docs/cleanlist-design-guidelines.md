# CleanList Design Guidelines

**Version:** 2.0 · **Status:** Living document · **Date:** March 2026 · Confidential

**Primary:** Teal-Emerald `#0BA888` · **Base:** Clean white · **Fonts:** DM Serif Display · DM Sans

---

## Contents

1. [Brand Identity](#1-brand-identity)
2. [Colour System](#2-colour-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Components](#5-components)
6. [Patterns](#6-patterns)
7. [UX Principles](#7-ux-principles)

---

## 1. Brand Identity

CleanList sits at the intersection of scientific rigour and everyday shopping. V2 sharpens that positioning: clean white surfaces, bold teal-emerald energy, and vivid tier colours that create immediate legibility at a glance.

### What Changed in v2

V1 used warm parchment backgrounds and a muted forest green — evocative, but soft in digital contexts. V2 replaces the warm base with clean white surfaces and introduces a vivid teal-emerald primary. The four score tier colours are significantly more saturated, giving scores immediate visual weight without needing to read the label.

**v1 — Warm Parchment + Forest Green**
- Background: `#f8f5ef` · Primary: `#2b5c3f`
- Tier badges: muted greens, ambers, oranges, reds

**v2 — Clean White + Teal-Emerald**
- Background: `#FFFFFF` · Primary: `#0BA888`
- Tier badges: vivid emerald, amber, orange, red (fully saturated)

### Brand Voice

| We are | We are not |
|--------|------------|
| **Confident but not alarmist.** We state risks clearly without stoking fear. | Sensationalist. We don't use red-flag language to drive engagement. |
| **Scientific but accessible.** Evidence-based language a parent can parse. | Clinical. We don't hide behind jargon. |
| **Empowering.** We give users information to make their own calls. | Prescriptive. We don't tell users what to eat. |
| **Transparent.** We show our methodology. Scores are explainable. | Opaque. No black-box ratings. |

### Logo Usage

The CleanList wordmark uses **DM Serif Display Regular**. On white/light surfaces it appears in `--ink`. On the dark site header it appears in `--white`. The teal italic emphasis form may be used in display headlines. Never apply gradients, shadows, or teal fill to the full wordmark.

---

## 2. Colour System

A clean white base, one vivid primary, and four fully saturated tier colours. Every token has a single job — none of the semantic colours are interchangeable.

### Ink Scale — Text & Icons

Neutral near-black with a faint cool undertone. Crisper on white than v1's warm ink.

| Token | Hex | Usage |
|-------|-----|-------|
| `--ink` | `#0D0F14` | Primary text, headings |
| `--ink-2` | `#363840` | Body text, table content |
| `--ink-3` | `#60636E` | Secondary labels, captions |
| `--ink-4` | `#9CA0AC` | Placeholders, disabled, metadata |

### Surface Scale — Backgrounds

Pure white is the page background. Surface steps are used for hover states, table headers, component shells, and disabled inputs. These replace the warm parchment tones entirely.

| Token | Hex | Usage |
|-------|-----|-------|
| `--white` | `#FFFFFF` | Page background, component cell background |
| `--surface` | `#F5F6F8` | Hover states, table headers, component shells |
| `--surface-2` | `#ECEEF2` | Secondary surfaces, disabled inputs |
| `--surface-3` | `#DEE1E8` | Dividers, strong borders |

### Primary — Teal-Emerald

`#0BA888` sits between emerald and teal — vivid enough to pop on white, saturated enough to convey freshness and confidence without reading as a medical blue-green. Use `--teal` for interactive elements, active states, links, section eyebrows, and H3 headings. `--teal-light` is the tint for callout backgrounds and hover fills.

| Token | Hex | Usage |
|-------|-----|-------|
| `--teal-dark` | `#077A62` | Body-copy links (AA contrast), pressed states |
| `--teal` | `#0BA888` | Primary brand colour, interactive elements |
| `--teal-mid` | `#33C4A4` | Header eyebrow text on dark, secondary moments |
| `--teal-pale` | `#8DDECE` | Decorative, large backgrounds |
| `--teal-light` | `#E4F8F4` | Callout backgrounds, hover fills, tinted surfaces |

### Score Tier Colours

The four most important colours in the system. V2 makes them significantly more saturated than v1 for instant legibility. Derived from Tailwind 600/100 equivalents, ensuring accessible contrast ratios at 12px bold or larger.

| Tier | Score | Full colour | Tint | CSS variables |
|------|-------|-------------|------|---------------|
| **Clean** | 1–3 | `#059669` | `#D1FAE5` | `--tier-clean` / `--tier-clean-light` |
| **Watch** | 4–5 | `#D97706` | `#FEF3C7` | `--tier-watch` / `--tier-watch-light` |
| **Caution** | 6–7 | `#EA580C` | `#FFEDD5` | `--tier-caution` / `--tier-caution-light` |
| **Avoid** | 8–10 | `#DC2626` | `#FEE2E2` | `--tier-avoid` / `--tier-avoid-light` |

> **Tier colour discipline:** Never repurpose tier colours for non-tier UI states — especially don't use `--tier-avoid` red for form errors, as users will conflate it with an "Avoid" score. Use `--ink-3` or neutral system states for generic errors instead.

### Supporting Semantic Colours

Used for callouts, data classification in tables, and UI system states. Never substitute these for tier colours.

| Token | Hex | Usage |
|-------|-----|-------|
| `--purple` | `#7C3AED` | Evidence tier 1 classification |
| `--purple-light` | `#EDE9FE` | Purple tint |
| `--blue` | `#2563EB` | Technical callouts, info states |
| `--blue-light` | `#EFF6FF` | Blue tint |

### Border

```css
--border:        rgba(13, 15, 20, 0.09)   /* standard */
--border-strong: rgba(13, 15, 20, 0.16)   /* focus rings, selected states */
```

> **Accessibility note:** `--teal` (`#0BA888` on white) has a contrast ratio of ~4.6:1 — passes AA for large text and UI components. For body-copy teal links, use `--teal-dark` (`#077A62`, ~6.8:1) to maintain AA compliance at small sizes.

---

## 3. Typography

The typeface pairing is unchanged from v1. On white, the contrast between DM Serif Display and DM Sans reads sharper and more modern than it did on warm parchment.

### Typefaces

| Family | Weights | Role |
|--------|---------|------|
| **DM Serif Display** | 400 Regular, 400 Italic | H1 display, H2 section titles, score numerals, logo |
| **DM Sans** | 300 Light, 400 Regular, 500 Medium, 600 SemiBold | All body, UI labels, metadata, subheadings, navigation |

**Google Fonts import:**
```
https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap
```

### Type Scale

| Role | Family | Size | Weight | Line-height | Colour |
|------|--------|------|--------|-------------|--------|
| Display / H1 | DM Serif Display | `clamp(2.4rem, 5vw, 3.6rem)` | 400 | 1.1 | `--ink` |
| H2 / Section Title | DM Serif Display | `clamp(1.5rem, 3vw, 2.1rem)` | 400 | 1.2 | `--ink` |
| H3 / Subsection | DM Sans | `1rem` | 600 | 1.4 | `--teal` |
| Body / Section Intro | DM Sans | `0.975rem` | 400 | 1.8 | `--ink-2` |
| Small / Supporting | DM Sans | `0.875rem` | 400 | 1.7 | `--ink-3` |
| Eyebrow / Section Label | DM Sans | `10px` | 600 | — | `--teal` · `0.14em` tracking · uppercase |
| Table Header / UI Label | DM Sans | `11px` | 600 | — | `--ink-3` · `0.06em` tracking · uppercase |
| Monospace / Formula | Courier New | `0.88rem` | 500 | 1.7 | `--ink` · `--surface` background |

### Typography Rules

**✓ Do**
- Use DM Serif Display for H1 and H2 only.
- The teal italic emphasis (`em`) within display headlines is the primary brand signature — use it for the product name or a key differentiating phrase.

**✗ Don't**
- Don't use DM Serif Display below H2, and never bold it — weight is always 400.
- Don't use teal italic in body copy, tables, or navigation. It belongs only in display-level headlines.

---

## 4. Spacing & Layout

All spacing is built on a 4px base unit. The grid and container widths are unchanged from v1.

### Content Widths

| Context | Max-width | Notes |
|---------|-----------|-------|
| Document pages | `900px` | Primary container for all docs |
| Admin / data-dense UI | `860px` | Slightly narrower for denser data layouts |
| Section intro prose | `680px` | Hard max on reading width |
| Header description | `560–580px` | Prevents taglines spanning too wide |

### Section Rhythm

| Token | Value | Used for |
|-------|-------|----------|
| Section padding | `3.5rem` / `2.5rem` mobile | Each `.section` |
| Section divider | `1px solid var(--border)` | Bottom of every section except last |
| H3 top margin | `2.5rem` | Before every H3 subsection |
| Component gap | `1rem` standard / `1.5rem` chart grids | All grid layouts |

### Border Radius

| Variable | Value | Used for |
|----------|-------|----------|
| `--radius` | `8px` | Badges, small elements |
| `--radius-lg` | `12px` | Cards, tables, component blocks, tier grids |
| `--radius-xl` | `16px` | Modal / sheet containers |
| Pills | `20px` | Chip / pill elements only |
| Badges | `5px` | Status badges |

### Hairline Grid Pattern

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(MIN, 1fr));
  gap: 1px;
  background: var(--border);   /* gap colour shows through */
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.grid-cell { background: var(--white); }
```

---

## 5. Components

### Site Header

Dark background using `--ink`. Dot-grid texture via `radial-gradient`. Teal radial glow in the top-right corner via `::after`. Eyebrow uses `--teal-mid`; italic serif title emphasis uses `--teal-mid`.

```css
/* Dot-grid texture */
.site-header::before {
  background-image: radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px);
  background-size: 24px 24px;
}
/* Teal glow */
.site-header::after {
  top: -80px; right: -80px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(11,168,136,.18) 0%, transparent 70%);
}
```

**Classes:** `.site-header` · `.header-inner` · `.header-eyebrow` · `.header-title` · `.header-desc` · `.header-meta`

---

### Badges

Inline status indicators. Tier badges must only be used for score tier classification.

| Class | Background | Colour | Use |
|-------|-----------|--------|-----|
| `.b-clean` | `--tier-clean-light` | `--tier-clean` | Score tier 1–3 |
| `.b-watch` | `--tier-watch-light` | `--tier-watch` | Score tier 4–5 |
| `.b-caution` | `--tier-caution-light` | `--tier-caution` | Score tier 6–7 |
| `.b-avoid` | `--tier-avoid-light` | `--tier-avoid` | Score tier 8–10 |
| `.b-teal` | `--teal-light` | `--teal-dark` | Active / selected states |
| `.b-purple` | `--purple-light` | `--purple` | Evidence tier classification |
| `.b-blue` | `--blue-light` | `--blue` | Informational |
| `.b-gray` | `--surface-2` | `--ink-3` | Not scored / inactive / N/A |

---

### Pills / Chips

For user health profile attributes, category tags, and filter chips. Always use the teal variant for active/selected states.

| Class | Usage |
|-------|-------|
| `.pill` | Active tag — teal background, teal-dark text |
| `.pill-neutral` | Inactive / add action — surface background, ink-3 text |

---

### Callouts

Left-bordered inline notices. Use sparingly — no more than one per H3 block.

| Class | Accent | Background | Use |
|-------|--------|-----------|-----|
| `.callout.teal` | `--teal` | `--teal-light` | Design/product principles |
| `.callout.amber` | `--tier-watch` | `--tier-watch-light` | Scoring/methodology notes |
| `.callout.red` | `--tier-avoid` | `--tier-avoid-light` | Risks and watch-outs |
| `.callout.blue` | `--blue` | `--blue-light` | Technical notes |

**Structure:** `.callout` > `.callout-accent` + `.callout-body`

---

### Score Tier Cards

A compact grid mapping all four tiers at a glance. Coloured top border (3px) is the primary signal. The range numeral uses DM Serif Display.

| Class | Border + text colour |
|-------|---------------------|
| `.tier-card.tc-clean` | `--tier-clean` |
| `.tier-card.tc-watch` | `--tier-watch` |
| `.tier-card.tc-caution` | `--tier-caution` |
| `.tier-card.tc-avoid` | `--tier-avoid` |

**Grid:** `.tier-grid` (hairline grid, `minmax(160px, 1fr)`)

---

### Score Display

Shows base score (strikethrough when elevated) and personal score side by side. Tier label is uppercase bold.

| Class | Background | Text colour |
|-------|-----------|------------|
| `.score-display.sd-clean` | `--tier-clean-light` | `--tier-clean` |
| `.score-display.sd-watch` | `--tier-watch-light` | `--tier-watch` |
| `.score-display.sd-caution` | `--tier-caution-light` | `--tier-caution` |
| `.score-display.sd-avoid` | `--tier-avoid-light` | `--tier-avoid` |

**Child classes:** `.base-score` (strikethrough, `--ink-4`) · `.personal-score` (DM Serif Display, 2.1rem) · `.tier-label` (DM Sans 700, 0.78rem, uppercase)

---

### Metric Cards

Hairline-divided grid for key statistics. Display serif numeral is the focal point. Maximum 4–5 cards per row.

**Classes:** `.metrics-grid` · `.metric-card` · `.m-label` · `.m-val` · `.m-sub`

- `.m-label` — 11px, 500 weight, `--ink-3`, 0.04em tracking
- `.m-val` — DM Serif Display, 2.1rem, `--ink`
- `.m-sub` — 11px, `--ink-4`

---

### Risk Blocks

Heavier than a callout — for named risks with a header, numbered identifier, and body content.

**Classes:** `.risk-block` · `.risk-header` · `.risk-num` (28px circle, `--ink` background) · `.risk-title` (DM Serif Display) · `.risk-body`

---

### Step / Numbered List

Hairline-divided ordered list with optional timing labels on the right.

**Classes:** `.steps-grid` · `.step-row` (3-col grid: `32px 1fr auto`) · `.step-n` (DM Serif Display, `--ink-4`) · `.step-text` · `.step-horizon` (italic, hidden on mobile)

---

### Persona Cards

For user personas. The `.selected` modifier highlights the primary persona.

**Classes:** `.persona-grid` · `.persona-card` · `.persona-card.selected` (teal border + `--teal-light` background + "Primary" label badge)

---

### Tables

All tables wrapped in `.table-wrap` for horizontal scroll. `border-radius` on the wrapper clips corners.

**Row modifier classes:**

| Class | Applied to | Effect |
|-------|-----------|--------|
| `.tr-clean` | `tr` | First cell: `--tier-clean-light` bg, `--tier-clean` text |
| `.tr-watch` | `tr` | First cell: `--tier-watch-light` bg, `--tier-watch` text |
| `.tr-caution` | `tr` | First cell: `--tier-caution-light` bg, `--tier-caution` text |
| `.tr-avoid` | `tr` | First cell: `--tier-avoid-light` bg, `--tier-avoid` text |
| `.tr-ev1` | `tr` | First cell: `--purple-light` bg, `--purple` text |
| `.tr-ev2` | `tr` | First cell: `--teal-light` bg, `--teal-dark` text |
| `.tr-ev3` | `tr` | First cell: `--tier-watch-light` bg, `--tier-watch` text |
| `.row-hl` | `tr` | All cells: `--teal-light` bg, `--teal-dark` text |

---

### Formula / Code Block

Left-bordered monospace block for formulas, data schemas, CSS snippets, and technical specs.

```css
.formula {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--teal);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  font-family: var(--mono);
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.7;
}
```

---

## 6. Patterns

### Section Anatomy

Every section opens with the same four-part structure:

```
1. .section-eyebrow   — "Section 01" (10px caps, --teal)
2. .section-title      — Serif headline (clamp fluid, --ink)
3. .section-intro      — 1–2 sentence summary (max-width: 680px, --ink-2)
4. Primary content     — tables, grids, callouts, etc.
```

### Header Texture — v2 Dot Grid

```css
/* v2 default — applied to all new documents */
.site-header::before {
  background-image: radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Teal glow — always present in v2 headers */
.site-header::after {
  top: -80px; right: -80px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(11,168,136,.18) 0%, transparent 70%);
}
```

> **Note:** The v1 diagonal stripe (`repeating-linear-gradient`) is for legacy docs only. Do not use in new work.

### Callout Placement Rules

- Place callouts *after* the relevant content block, not before.
- No more than one callout per H3 block unless the section is documentation-heavy.
- Colour mapping: **Teal** for design/product principles · **Amber** for scoring/methodology · **Red** for risks · **Blue** for technical notes.

### Surface Choice in Components

Component body areas use `--white` as the cell background within hairline grids. Reserve `--surface` for hover states, component shells, and table header rows — the contrast between white cells and the surface-coloured shell defines components on a white page.

### Responsive Breakpoint

```css
@media (max-width: 640px) {
  .site-header { padding: 2.5rem 1.25rem 2rem; }
  .container   { padding: 0 1.25rem; }
  .section     { padding: 2.5rem 0; }
  .do-dont, .compare-row { grid-template-columns: 1fr; }
  .metrics-grid { grid-template-columns: 1fr 1fr; }
  .step-horizon { display: none; }
}
```

---

## 7. UX Principles

1. **Transparency builds trust.** Always show both base and personal score side by side. Users must be able to see exactly what their health profile is doing and why. Never present a score without a way to inspect it.

2. **Conservative > comprehensive.** When scientific evidence is thin, score conservatively. A lower-than-expected score with a clear explanation builds more long-term credibility than an alarming score with weak backing.

3. **Empower, don't prescribe.** CleanList gives users the information they need to make their own call. Avoid language that dictates dietary choices — surface evidence and let users decide.

4. **The profile earns its value.** The health profile must visibly improve with use — each shopping trip should make the next one faster and more personalised. Surface this improvement explicitly in the UI.

5. **"Not yet scored" is honest.** Show an unscored state clearly rather than hiding products or inferring a score. Trust is built by admitting the limits of coverage.

6. **Alternatives must be real and in-stock.** A "cleaner swap" not available at the user's store is worse than no recommendation. Validate against live retailer inventory before display.

### Score Colour Consistency

The four tier colours form the user's core mental model. They must be identical across every touchpoint — app, email, web docs, receipts. Do not re-derive or approximate these values per platform or context.

### The Paywall Moment

If a user encounters the subscription gate before seeing a personal score differ from the base score, the paywall is appearing too early. The personalisation "aha moment" — the score delta — must land first. That delta is the product's core value proof.

### Accessibility

- All four tier colours meet WCAG AA contrast on their respective light tints at 12px bold or larger.
- Tier information must never be conveyed by colour alone — always pair with a text label ("Clean," "Avoid") for colour-vision accessibility.
- Minimum interactive touch target: 44×44px on mobile.
- For teal body-copy links, use `--teal-dark` (`#077A62`, ~6.8:1) not `--teal` (`#0BA888`, ~4.6:1) to pass AA at small sizes.

---

*CleanList · Design Guidelines v2.0 · March 2026 · Confidential — for partner review only*
