# Hunt Deck — Workspace Rules

> These rules are MANDATORY for every AI agent working in this project.
> They apply to all tasks — code generation, copy writing, design decisions, and file edits.

---

## Source-of-Truth Files

This project has three governing documents. Each covers a distinct domain.
**You MUST read the relevant file(s) BEFORE taking any action in that domain.**

### 1. Visual & UI → `design.md`
**File:** `design.md` (project root)
**Governs:** All visual decisions — colors, typography, layout, spacing, animation, component choices, hero image treatment, section structure, and the Inspo references for layout patterns.

**Rule:** Before writing or modifying ANY UI code (HTML, JSX, TSX, CSS, Tailwind classes, component markup, SVG, images), you MUST:
- Read `design.md` in full
- Follow the color palette tokens exactly (`--color-bg-primary`, `--color-accent`, etc.)
- Follow the typography table (Playfair Display for headlines, DM Sans for body)
- Follow the Inspo References section for layout structure since there is no Figma
- Follow the Animation Principles section for all motion/transitions
- Use Phosphor Icons — NOT Lucide
- Use 21st.dev components — do NOT create new components

### 2. Copy & Tone → `tone.md`
**File:** `tone.md` (project root)
**Governs:** All written content — headlines, subheadlines, body copy, CTA text, button labels, error messages, meta descriptions, alt text, and any user-facing text.

**Rule:** Before writing or modifying ANY copy, you MUST:
- Read `tone.md` in full
- Follow the four voice pillars (Empowering, Direct, Honest, Human)
- Use only approved copy for sections that have it (hero, trust bar, how it works, etc.)
- Check the banned words list before writing any sentence
- Follow the tone dial (empathy vs. confidence vs. urgency) for the specific section
- Never use passive CTAs ("Learn more," "Discover," "Explore")
- Run the avoid-ai-writing skill after every copy pass

### 3. Conversion & Structure → `marketing.md`
**File:** `marketing.md` (project root)
**Governs:** Landing page conversion strategy — hero effectiveness, emotional framing, scannability, social proof quality, visual hierarchy, and CTA consistency.

**Rule:** Before finalising ANY section of the landing page, you MUST:
- Read `marketing.md` in full
- Audit the section against its relevant checklist (hero → Section 1, social proof → Section 4, etc.)
- Verify that every section has a single focal point and a single clear next action
- Ensure testimonials meet the specificity requirements (name + role + outcome)
- Confirm CTA consistency across all sections (same verb, same phrasing)

---

## Cross-Domain Rules

These rules apply regardless of which file governs the specific task:

1. **Never mix domains without reading both files.** If a task involves both UI and copy (e.g., building a hero section), read BOTH `design.md` AND `tone.md` before starting.

2. **design.md is the visual single source of truth.** If there is a conflict between inline code comments and `design.md`, `design.md` wins.

3. **tone.md is the copy single source of truth.** If there is a conflict between placeholder text in components and `tone.md`, `tone.md` wins.

4. **marketing.md is the quality gate.** It does not generate content — it validates it. Run every section through its checklist before considering it done.

5. **Inspo images replace Figma.** Since there is no Figma design, consult `Inspo/` folder images and the "Inspo References" section in `design.md` for structural/layout decisions. Do not invent layouts from scratch.

6. **No new components.** Use 21st.dev (shadcn/ui registry) components only. Do not create custom component files. Compose existing primitives.

7. **No Lucide Icons.** Use Phosphor Icons (`phosphor-react`) exclusively.

8. **Hero image is `assets/hero3.jpeg`.** Do not reference hero2.jpeg or any other hero image.

9. **AI Skills are mandatory.** Before generating UI, run impeccable + taste-skill. Before generating copy, run avoid-ai-writing + ghostwriter. Install instructions are in `design.md` and `tone.md`.

10. **Tech stack is locked.** Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS v4 + Framer Motion + GSAP. Do not introduce new frameworks or libraries without explicit user approval.

---

## File Change Protocol

When modifying the landing page:

1. **Read** the governing file(s) for the domain you are touching
2. **Build** according to those specifications
3. **Audit** against `marketing.md` checklists
4. **Run** the relevant AI skills (design skills for UI, copy skills for text)
5. **Update** `design.md`, `tone.md`, or `marketing.md` if approved copy/design changes are made — these files stay in sync with the codebase

---

## Project Structure

```
Huntdeck/
├── .agents/
│   └── AGENTS.md          ← THIS FILE (workspace rules)
├── Inspo/                 ← Layout reference images (no Figma)
│   ├── image.png          ← Solvera AI
│   ├── image copy.png     ← Gradient
│   └── nuro.png           ← Novu
├── assets/
│   └── hero3.jpeg         ← Hero image
├── design.md              ← Visual & UI source of truth
├── tone.md                ← Copy & tone source of truth
├── marketing.md           ← Conversion quality gate
└── [Next.js project]      ← To be scaffolded
```
