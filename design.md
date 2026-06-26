# Hunt Deck — Landing Page Design Brief

> This file is the single source of truth for the Hunt Deck landing page.
> The AI coding agent MUST read this file — and all referenced AI skills — before writing any UI code.

---

## AI Skills (Read First — Design + Copy)

Before generating any UI or copy, install and follow ALL four skills below. They override generic AI defaults for both visual and written output.

> **Order matters:** Install design skills first, then copy skills. Run them in the order listed.

### 1. Impeccable — `pbakaus/impeccable`
- **Install:** `npx impeccable install` (from project root)
- **Init:** `/impeccable init` inside your coding agent
- **Purpose:** Prevents generic AI-slop patterns (Inter everywhere, purple-blue gradients, nested cards, rounded-square icon tiles). Provides 23 commands (`/impeccable polish`, `/impeccable audit`, `/impeccable animate`, etc.) and 44 deterministic design-quality detector rules.
- **Anti-patterns it enforces:** No overused fonts without intent, no gray text on colored backgrounds, no pure black/gray (always tint), no cards nested inside cards, no bounce/elastic easing.
- **Repo:** https://github.com/pbakaus/impeccable

### 2. Taste Skill — `Leonxlnx/taste-skill`
- **Install:** `npx skills add Leonxlnx/taste-skill`
- **Purpose:** Gives the AI agent "design taste" — reads the project brief and infers correct design style (editorial, SaaS, minimalist) before writing code. Prevents flat layouts, weak visual hierarchy, poor spacing, and generic UI patterns.
- **Repo:** https://github.com/Leonxlnx/taste-skill
- **Site:** https://tasteskill.dev
- **Copy command:** `/taste copy` — run this after any copy draft to verify it matches the editorial SaaS voice

### 3. avoid-ai-writing — `conorbronsdon/avoid-ai-writing`
- **Install:** `npx -y skills add conorbronsdon/avoid-ai-writing --skill avoid-ai-writing --agent claude-code`
- **Purpose:** Audits and rewrites AI-sounding copy. Flags 200+ "AI-tell" patterns (hollow intensifiers, overused transitions like "Moreover", robotic sentence structures) and provides a replacement table. Run on every copy draft before shipping.
- **Voice profile for Hunt Deck:** `warm` — matches our empathetic-but-direct tone
- **Command:** `/avoid-ai-writing rewrite --voice warm`
- **Repo:** https://github.com/conorbronsdon/avoid-ai-writing

### 4. ghostwriter — `angelarose210/ghostwriter`
- **Install:** `npx -y skills add angelarose210/ghostwriter`
- **Purpose:** Reverse-engineers a writing voice profile (sentence rhythm, vocabulary density, tone markers) from provided writing samples. Feed it the "Voice Samples" section from `tone.md` before generating any new landing page copy. Ensures all AI output matches the approved Hunt Deck voice, not generic LLM defaults.
- **Repo:** https://github.com/angelarose210/ghostwriter

> **See also:** `tone.md` — the full voice, tone, and copy guide. Contains approved section copy, banned words, anti-patterns, and the voice samples to feed `ghostwriter`.

---

## Product Summary

**Hunt Deck** is a job search web app that takes job seekers from "looking" to
"ready to apply" — fast, and for the right roles. It sources matched jobs,
tailors resumes and cover letters, generates role-specific interview prep, and
tracks every application in one place.

**Tagline:** Land interviews, not rejection emails.

---

## Tech Stack

| Layer         | Choice                          | Notes                                                        |
|---------------|---------------------------------|--------------------------------------------------------------|
| Framework     | Next.js 15 (App Router)         | Use React Server Components by default; `use client` only where interactive logic requires it |
| Language      | TypeScript (strict mode)        | Interfaces over types; no `any`                              |
| Styling       | Tailwind CSS v4                 | Mobile-first; use `tailwind.config.ts` tokens only           |
| Components    | 21st.dev (shadcn/ui registry)   | Do NOT create new components; use 21st.dev components as-is  |
| Animation     | Framer Motion + GSAP            | Framer Motion for component-level transitions; GSAP for scroll-driven timelines |
| Icons         | Phosphor Icons (phosphor-react) | Replaces Lucide — more expressive, variable weight, better for editorial style |
| Fonts         | Playfair Display + DM Sans      | See Typography section — serif display + clean sans pairing  |
| Deployment    | Vercel                          | Default                                                      |

---

## Visual Direction

### Style
- **Editorial, photo-led SaaS** — feels like a premium creative agency, not a generic tech startup
- Layout language: generous whitespace, asymmetric grids, content alternates left/right, photos bleed to edge
- NOT generic SaaS template; NOT pure minimal white-box design; NOT retro-illustration

### Inspo References (No Figma — use these for structure)
Since there is no Figma design for this project, use the following high-converting website references from the `Inspo/` folder to inform layout decisions:

| Image | Website | Key patterns to borrow |
|-------|---------|------------------------|
| `Inspo/image.png` | Solvera AI | Split hero (text left, imagery right), logo trust bar directly beneath hero, stat counters with large numbers, dark/light section alternation, bordered capability cards with icons + short copy |
| `Inspo/image copy.png` | Gradient | Full-bleed editorial hero image with overlay text, eyebrow labels above every section headline, three-column photo grid for features, alternating text-left/image-right deep-dive rows, serif + sans typography contrast, dark-section final CTA, FAQ accordion section |
| `Inspo/nuro.png` | Novu | Clean white hero with centered headline, rounded card UI mockups embedded in feature sections, strong use of whitespace between sections, testimonial cards with star ratings, FAQ accordion before footer, large bold CTA with contrasting background |

**Composite layout strategy for Hunt Deck:**
- Hero: Solvera-style split layout (text left / hero image right) on our dark navy canvas
- Trust Bar: Solvera-style logo/stat strip immediately below the hero
- How It Works: Novu-style clean step cards with UI mockup previews
- Feature Deep-Dives: Gradient-style alternating text + image rows with editorial eyebrow labels
- Audience Segments: Three-column grid (Gradient-style photo grid adapted to our dark palette)
- Testimonials: Novu-style cards with star ratings and real quotes
- Comparison: Simple table (our existing design, no inspo match needed)
- FAQ: Add a FAQ section inspired by both Gradient and Novu — accordion pattern, clean spacing
- Final CTA: Gradient-style dark full-bleed section with large headline and single CTA
- Footer: Minimal dark footer (all three inspo sites keep footer simple)

### Color Palette
Extracted from the design reference image (Ordina website layout):

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | `#081E2B` | Main page background (deep Prussian blue/navy-teal) |
| `--color-bg-secondary` | `#0C2535` | Alternating section background (slightly lighter navy-teal) |
| `--color-bg-dark` | `#030D13` | Footer and extra dark sections (near-black with navy tint) |
| `--color-text-primary` | `#FFFFFF` | Headlines, primary text (crisp white) |
| `--color-text-secondary` | `#90A5B4` | Body copy, captions (muted slate-blue/steel gray) |
| `--color-accent` | `#B4EC5B` | CTA buttons, highlights (vibrant lime green — from image) |
| `--color-accent-light` | `rgba(180, 236, 91, 0.15)` | Accent tints, hover glow states |
| `--color-border` | `#183648` | Borders, dividers (subtle slate-blue) |
| `--color-surface` | `rgba(12, 38, 53, 0.6)` | Card backgrounds with `backdrop-filter: blur(8px)` |

> NOTE: The palette is a premium dark theme based on Ordina's design: a deep, rich Prussian blue/navy-teal canvas paired with a vibrant, modern lime-green accent and clean white/slate typography. This creates a high-contrast, editorial, and sophisticated dark-mode aesthetic.

### Typography
Extracted from the design reference — editorial serif + geometric sans pairing:

| Role | Font | Weight | Size | Notes |
|------|------|--------|------|-------|
| Hero H1 | Playfair Display | 700 (Bold) | 56–80px | Tracking `-0.02em`; this is the editorial anchor |
| Section H2 | Playfair Display | 600 (SemiBold) | 40–52px | Tracking `-0.01em` |
| Card H3 | DM Sans | 600 | 22–26px | Tighter, functional |
| Body | DM Sans | 400 | 16–18px | Line-height `1.75`; max-width `65ch` |
| Label / eyebrow | DM Sans | 500 | 11–13px | ALL CAPS, `0.12em` letter-spacing, used above headings |
| Nav | DM Sans | 500 | 15px | — |
| CTA button | DM Sans | 600 | 15px | — |

**Font load:** Import both from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

**Typography rules (from impeccable anti-patterns):**
- Do NOT use Inter as the display/headline font — that is the generic SaaS default
- Playfair Display headlines must always sit on clean solid backgrounds (light or dark) — never on busy or low-contrast backgrounds
- Eyebrow labels (ALL CAPS, small) appear above every major section headline
- Body copy line-length capped at `65ch` for readability

### Hero Image
- **File:** `assets/hero3.jpeg` (woman in navy blazer, phone, blue sky — high-res)
- **Composition treatment:** `object-fit: cover`, `object-position: 60% 30%` (crop slightly higher to include face and phone)
- **Overlay:** Left-side gradient: `linear-gradient(to right, rgba(8,30,43,0.95) 38%, rgba(8,30,43,0.5) 65%, transparent 100%)`
- **Mobile crop:** Serve portrait-cropped version via `<picture>` at `max-width: 768px`
- **Color harmony:** The blue sky in the hero image blends seamlessly into the deep navy-teal canvas, reinforcing the cool, premium look.

### Animation Principles
- Scroll-triggered fade-up on all section entries: `opacity: 0 → 1`, `translateY: 24px → 0`, `400ms ease-out`, staggered 80ms per child
- Cards: `translateY(-4px)` lift + `box-shadow` depth increase on hover, `200ms ease`
- CTA button: lime-green glow `box-shadow: 0 0 0 4px rgba(180,236,91,0.25)` on hover
- Hero headline: staggered word-by-word fade-in on load (Framer Motion variants)
- Section transitions: GSAP ScrollTrigger for pinned feature showcase (Section 5)
- No bounce/elastic easing (impeccable rule) — use `ease-out` or `cubic-bezier(0.16,1,0.3,1)` throughout
- No looping background animations; motion is always triggered by user action or scroll

---

## Landing Page — Section Map

### Section 1 — Navigation (Sticky)
- Left: **Hunt Deck** logo (wordmark, Inter 700)
- Center: `How it works` · `Features` · `Pricing`
- Right: `Sign in` (ghost) + `Get started` (filled lime-green CTA button)
- On scroll: nav background transitions from transparent to deep navy-teal (`#081E2B`) with `backdrop-filter: blur`

---

### Section 2 — Hero
**Layout:** Split. Left 50% = text + CTAs. Right 50% = hero image (`hero2.jpeg`).

**Headline (H1):**
> Land interviews, not rejection emails.

**Subheadline:**
> Hunt Deck matches you to jobs that fit, then builds everything you need to apply — tailored resume, cover letter, and interview prep — in minutes.

**CTAs:**
- Primary: `Start for free →` (lime-green, filled)
- Secondary: `See how it works` (ghost/underline)

**Social proof beneath CTA (above the fold):**
> Trusted by 2,000+ job seekers · No credit card required

**Image treatment:** Right side, full-height column, `object-fit: cover`, slight right-side crop. Left gradient overlay ensures text is readable.

---

### Section 3 — Trust Bar
Thin strip, slightly lighter navy background (`#0C2535`), centered.

**Copy:** `Join thousands applying smarter — not harder`

Three short stat/proof items inline:
- `2,000+ active users`
- `4.9 / 5 average rating`
- `Resume tailored in under 60 seconds`


---

### Section 4 — How It Works
**Headline:** `From search to offer, without the chaos`
**Subheadline:** `Four steps. One place. No more switching between tabs.`

Four numbered steps — each with a small UI mockup card (literal product UI, not generic icons):

| # | Step title | Description |
|---|-----------|-------------|
| 1 | Upload your resume | Drop your existing resume. Hunt Deck reads it, extracts your skills, experience, and goals. |
| 2 | Discover matched jobs | We surface roles from across the web ranked by fit — no more scrolling job boards. |
| 3 | Get your application pack | One click generates a tailored resume + cover letter for the specific job, optimised for ATS. |
| 4 | Prep and track | Get role-specific interview questions. Track every application in your personal job dashboard. |

---

### Section 5 — Feature Deep-Dives
**Headline:** `Everything you need. Nothing you don't.`

Three feature cards (wide horizontal layout with alternating image side):

**Card 1 — Job Matching**
- Label: `Find the right roles`
- Headline: `Stop scrolling. Start matching.`
- Body: We aggregate listings from across the web and rank them against your resume and preferences. No alerts you'll ignore — just jobs worth applying for.
- Visual: UI mockup of a job match card with a relevance score badge

**Card 2 — Tailored Applications**
- Label: `Apply with confidence`
- Headline: `Your resume, rewritten for every role.`
- Body: Hunt Deck rewrites key sections of your resume to match the job description — and writes the cover letter too. ATS-optimised, not generic.
- Visual: Split view — original resume left, tailored version right, with diff highlights

**Card 3 — Interview Prep**
- Label: `Nail the interview`
- Headline: `Prep built around the actual job.`
- Body: Once you apply, Hunt Deck generates likely interview questions based on the job description and your resume — behavioral, technical, and role-specific. Not generic Q&A.
- Visual: Mock prep card showing a question, a suggested answer structure, and a "gap" flag

---

### Section 6 — Audience Segments
**Headline:** `Built for every stage of the job search`

Three columns:

| Segment | Label | Body |
|---------|-------|------|
| Early career | `Recent graduates` | Finding your first role is hard enough. Hunt Deck helps you compete against candidates with years more experience. |
| Career switchers | `Making a move` | Pivoting industries? We help you position your existing experience for a new role — without starting from scratch. |
| Remote-first | `Going remote` | Searching across time zones and platforms is exhausting. Hunt Deck surfaces remote-friendly matches from everywhere. |

---

### Section 7 — Testimonials
**Headline:** `Real job seekers. Real results.`

Three quote cards. Per marketing.md requirements:
- Name + role + location must be real before launch
- Quotes must reference a specific outcome, not generic praise
- One card uses lime-green accent background (with dark text for contrast) to break visual monotony

> WARNING: Do not ship placeholder testimonials. Collect real quotes during beta.

---

### Section 8 — Comparison Strip
**Headline:** `A smarter alternative to doing it yourself`

Comparison table:

| | Hunt Deck | DIY | Generic AI tools |
|--|-----------|-----|-----------------|
| Job matching by resume fit | Yes | No | No |
| Tailored resume per job | Yes | Manual | Partial |
| ATS-optimised output | Yes | No | No |
| Role-specific interview prep | Yes | No | No |
| Application tracker | Yes | Spreadsheet | No |
| All in one place | Yes | No | No |

---

### Section 9 — Final CTA
Full-width section, deep navy background with lime-green accent CTA.

**Headline:** `Your next job is closer than you think.`
**Sub:** `Start free. No credit card. Cancel anytime.`
**CTA:** `Get started — it's free →`

---

### Section 10 — Footer
Dark background (`#030D13`). Large **HUNT DECK** wordmark centered.

Links: How it works · Features · Pricing · Privacy · Terms

---

## Open Items (Pre-launch blockers)

- [ ] Collect 3 real testimonials with specific outcomes before launch
- [ ] Generate two crops of hero image (desktop wide / mobile portrait)
- [ ] Confirm animation library: Framer Motion vs GSAP (or both)
- [ ] Lock pricing structure (placeholder page acceptable at launch)
- [ ] Finalise product name lockup / logo (wordmark only for now)
- [x] Send design reference image so design.md visual section can be updated with extracted tokens

