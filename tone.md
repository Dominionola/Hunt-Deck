# Hunt Deck — Voice, Tone & Copy Guide

> This file governs every word on the Hunt Deck landing page.
> The AI coding agent and any human writer MUST read this before writing or editing any copy.
> It works alongside `design.md` (visual rules) and `marketing.md` (conversion quality gate).
> Together the three files form the complete pre-ship checklist.

---

## AI Copywriting Skills (Install Before Writing Any Copy)

Three agent skills enforce copy quality. Install all three before generating or editing landing page content.

### 1. avoid-ai-writing — `conorbronsdon/avoid-ai-writing`
- **Install:** `npx -y skills add conorbronsdon/avoid-ai-writing --skill avoid-ai-writing --agent claude-code`
- **Purpose:** Audits copy and rewrites "AI-isms" — hollow intensifiers, overused transition phrases (Moreover, Furthermore, It's worth noting), and robotic sentence structures. Contains a database of 200+ AI-tell patterns and a replacement table.
- **Modes:** `rewrite` (default, fixes and reports) · `detect` (flags only) · `edit-in-place` (patches files directly)
- **Voice profile to use:** `warm` — matches Hunt Deck's empathetic-but-direct tone
- **Run after every copy pass:** `/avoid-ai-writing rewrite --voice warm`
- **Repo:** https://github.com/conorbronsdon/avoid-ai-writing

### 2. ghostwriter — `angelarose210/ghostwriter`
- **Install:** `npx -y skills add angelarose210/ghostwriter`
- **Purpose:** Reverse-engineers a writing profile (sentence rhythm, vocabulary density, tone markers) from provided samples. Ensures AI output reads as human-authored and brand-consistent, not generic LLM output.
- **Use case for Hunt Deck:** Feed it the approved copy samples in this file's "Voice Samples" section. It will lock in the rhythm before generating new sections.
- **Repo:** https://github.com/angelarose210/ghostwriter

### 3. Taste Skill (already in design.md — applies to copy too)
- **Reference:** `Leonxlnx/taste-skill` — already installed as part of the design workflow
- **Copy-specific use:** Run `/taste copy` before finalising any section to verify the written voice matches the editorial SaaS style established in `design.md`.

---

## Hunt Deck Brand Voice

### The One-Sentence Brief
Hunt Deck sounds like a **brilliant, calm friend who's been through a hard job search themselves** — direct, honest, and on your side, without the hype or pep-talk clichés.

### Four Voice Pillars

| Pillar | What it means | What it doesn't mean |
|--------|---------------|----------------------|
| **Empowering** | Speak to what the user can do, not what the product does | Condescending tips ("Here's why you keep getting rejected") |
| **Direct** | Short sentences. Specific numbers. No padding. | Blunt or cold — warmth lives in the word choices, not the length |
| **Honest** | Acknowledge the job search is genuinely hard. Don't oversell. | Doom-and-gloom that increases anxiety |
| **Human** | "You," "your," second person throughout. Contractions always. | Corporate "our users," "candidates," "individuals seeking employment" |

### Tone Dial by Section

The overall tone shifts across the page — it opens with empathy, builds toward confidence, and closes with urgency. This is intentional.

| Section | Empathy | Confidence | Urgency |
|---------|---------|------------|---------|
| Hero | High | Medium | Low |
| Trust Bar | Low | High | None |
| How It Works | Low | High | None |
| Features | Low | High | Low |
| Testimonials | High | Medium | Medium |
| Final CTA | None | High | Maximum |

---

## Section-by-Section Copy Rules

### Section 1 — Navigation
**Tone:** Neutral. Informative. Zero personality here — let the content sections do the work.

- Logo wordmark: `Hunt Deck` — no tagline in nav
- Links: short nouns only — `How it works` · `Features` · `Pricing`
- CTA text: `Start for free` (primary) · `Sign in` (ghost)
- **Rule:** Nav CTA must repeat the hero CTA text exactly. Do not use "Try for free" in nav and "Start for free" in hero — pick one and lock it.

---

### Section 2 — Hero
**Tone:** High empathy → immediate confidence. This is the hardest-working section.

**Copy framework (PAS — Problem · Agitate · Solution):**
1. Headline = the outcome the user desperately wants (not what the product does)
2. Subheadline = briefly names what makes this possible — without listing features
3. CTA = first-person phrasing, action verb, benefit implied

**Approved headline:** `Land interviews, not rejection emails.`

**Why it works:** "rejection emails" names the specific pain every job seeker knows viscerally. "Land interviews" is the outcome, not a capability.

**Approved subheadline:**
> Hunt Deck matches you to jobs that fit, then builds everything you need to apply — tailored resume, cover letter, and interview prep — in minutes.

**Why it works:** Does not start with "We" (brand-centric). Names three specific deliverables. "In minutes" handles the implicit objection "this sounds like a lot of work."

**CTA copy:** `Start for free →`
- Implied first person ("I will start")
- "for free" handles the "what's the catch" objection
- Arrow signals progression, not a hard sell

**Social proof micro-copy (below CTA):**
> Trusted by 2,000+ job seekers · No credit card required

**Hero copy checklist:**
- [ ] Headline names an outcome the user wants, not a feature we offer
- [ ] Subheadline does not introduce a new idea — it deepens the headline's promise
- [ ] CTA does not say "Learn more," "Discover," or "Explore" — those are passive
- [ ] Social proof is specific (number + outcome) — never "Loved by job seekers everywhere"

---

### Section 3 — Trust Bar
**Tone:** Matter-of-fact. The numbers speak. No cheerleading.

**Approved strip copy:**
> Join thousands applying smarter — not harder

**Three stat items (inline):**
- `2,000+ active users`
- `4.9 / 5 average rating`
- `Resume tailored in under 60 seconds`

**Rules:**
- [ ] Every stat must be a real, verifiable number before launch
- [ ] Stat format: number + unit + short qualifier. Never: "Thousands of satisfied users"
- [ ] No exclamation marks in this section

---

### Section 4 — How It Works
**Tone:** Confident and clear. Like a great product demo, not a sales pitch.

**Approved headline:** `From search to offer, without the chaos`

**Why:** "Without the chaos" names the emotional state of a job search without being dramatic.

**Subheadline:** `Four steps. One place. No more switching between tabs.`

**Why:** "No more switching between tabs" is a hyper-specific pain point every multi-platform job seeker knows instantly.

**Step copy rules:**
- Step title = imperative verb + object ("Upload your resume," not "Resume Upload")
- Step descriptions = 1–2 sentences max. Lead with what the user gets, not what the system does
- Avoid: "leverage," "utilize," "seamlessly," "powerful," "robust," "cutting-edge"

**Approved step copy:**

| # | Title | Description |
|---|-------|-------------|
| 1 | Upload your resume | Drop your existing resume. Hunt Deck reads it, extracts your skills, experience, and goals. |
| 2 | Discover matched jobs | We surface roles from across the web ranked by fit — no more scrolling job boards. |
| 3 | Get your application pack | One click generates a tailored resume + cover letter for the specific job, optimised for ATS. |
| 4 | Prep and track | Get role-specific interview questions. Track every application in your personal dashboard. |

---

### Section 5 — Feature Deep-Dives
**Tone:** Confident. Proof-led. Each card answers the unspoken objection next to the feature.

**Headline:** `Everything you need. Nothing you don't.`

**Feature card copy rules:**
- Eyebrow label (ALL CAPS): names what the feature does in 3–4 words
- Card headline: addresses an objection or desire, not a feature description
- Body: 2–3 sentences. Lead with the user's problem, then how the feature solves it, then the specific outcome

**Approved feature card copy:**

**Card 1 — Job Matching**
- Eyebrow: `FIND THE RIGHT ROLES`
- Headline: `Stop scrolling. Start matching.`
- Body: We aggregate listings from across the web and rank them against your resume and preferences. No alerts you'll ignore — just jobs worth applying for.

**Card 2 — Tailored Applications**
- Eyebrow: `APPLY WITH CONFIDENCE`
- Headline: `Your resume, rewritten for every role.`
- Body: Hunt Deck rewrites key sections of your resume to match the job description — and writes the cover letter too. ATS-optimised. Not generic.

**Card 3 — Interview Prep**
- Eyebrow: `NAIL THE INTERVIEW`
- Headline: `Prep built around the actual job.`
- Body: Once you apply, Hunt Deck generates likely interview questions based on the job description and your resume — behavioural, technical, and role-specific. Not generic Q&A.

---

### Section 6 — Audience Segments
**Tone:** Empathetic. Each segment should feel like it was written specifically for that person.

**Headline:** `Built for every stage of the job search`

**Approved segment copy:**

| Segment | Label | Body |
|---------|-------|------|
| Early career | `Recent graduates` | Finding your first role is hard enough. Hunt Deck helps you compete against candidates with years more experience. |
| Career switchers | `Making a move` | Pivoting industries? We help you position your existing experience for a new role — without starting from scratch. |
| Remote-first | `Going remote` | Searching across time zones and platforms is exhausting. Hunt Deck surfaces remote-friendly matches from everywhere. |

---

### Section 7 — Testimonials
**Tone:** Authentic. Zero polish — these should sound like real people, not press quotes.

**Headline:** `Real job seekers. Real results.`

**Testimonial rules:**
- [ ] Name: first + last. No anonymous quotes. No "J.T., London."
- [ ] Role + location: "Software Engineer — Lagos" or "Career changer, ex-retail"
- [ ] Quote must include: a specific before-state, the action taken with Hunt Deck, and a concrete outcome
- [ ] Forbidden patterns: "This is amazing," "Game changer," "Highly recommend," "I love this tool"
- [ ] Quote length: 2–4 sentences — long enough to be credible, short enough to be read

**Example of a passing testimonial:**
> "I'd been applying for 3 months with the same resume and hearing nothing back. I used Hunt Deck to tailor my resume for a product role and had an interview within a week. I didn't change anything else — just the resume."
> — Temi A., Product Manager · Lagos

**Example of a failing testimonial (do not ship):**
> "Hunt Deck is an amazing tool that completely changed my job search experience. Highly recommend to anyone looking for work!"
> — Anonymous user

> WARNING: Do not ship placeholder testimonials. See marketing.md Section 4.

---

### Section 8 — Comparison Strip
**Tone:** Neutral and factual. Let the table speak. No gloating.

**Headline:** `A smarter alternative to doing it yourself`

**Rules:**
- Table must stay factual — no misleading "No" for competitors that offer partial features
- Do not name specific competitor brand names — "Generic AI tools" is the correct framing
- No asterisks or footnote disclaimers — if a claim needs one, simplify or remove it

---

### Section 9 — Final CTA
**Tone:** Urgency + warmth. The highest-confidence moment on the page. Make it feel inevitable.

**Approved headline:** `Your next job is closer than you think.`

**Why:** "Closer than you think" is reassuring, not aggressive. It reframes anxiety without dismissing it.

**Subheadline:** `Start free. No credit card. Cancel anytime.`

**Why:** Handles all three common objections (cost, payment friction, commitment) in six words.

**CTA:** `Start for free →`

**Rules:**
- [ ] CTA in Section 9 must match Section 1 and Section 2 exactly — same verb, same phrasing
- [ ] Do not use countdown timers or artificial scarcity unless it is real
- [ ] "Cancel anytime" must be factually true — do not include if there are lock-in terms

---

### Section 10 — Footer
**Tone:** Minimal. Utility only. No marketing copy in the footer.

- Logo wordmark only: `Hunt Deck`
- Links: `How it works` · `Features` · `Pricing` · `Privacy` · `Terms`
- Optional one-line mission statement beneath logo (not a tagline):
  > *Helping job seekers find the right role, faster.*

---

## Voice Anti-Patterns — Never Use

The `avoid-ai-writing` skill will catch most of these automatically. This list is the human-readable version.

### Banned Words

| Banned | Replace with |
|--------|-------------|
| "Leverage" | "use" |
| "Utilize" | "use" |
| "Seamlessly" | rewrite the sentence |
| "Powerful" | name what it actually does |
| "Robust" | same — be specific |
| "Cutting-edge" | same |
| "Game-changer" | name the actual change |
| "World-class" | name the credential |
| "Innovative" | describe what is new |
| "Solution" | name the specific thing being solved |
| "Moreover" / "Furthermore" | new sentence or "And" |
| "It's worth noting that" | delete — just say the thing |
| "Delve into" | "explore" or "look at" |
| "In conclusion" | delete entirely |
| "Empower users to" | write the verb directly |

### Structural Anti-Patterns

- **The fake second-person:** "Whether you're a recent grad or a seasoned professional..." — too broad. Pick one segment and write for them.
- **Feature list masquerading as a benefit:** "Our AI-powered resume tailoring engine uses NLP to..." — say what the user gets.
- **Promise without proof:** "Get hired faster" with nothing backing it. Follow every claim with a stat, a testimonial, or a specific mechanism.
- **Passive CTAs:** "Be matched to jobs" → "Start matching"
- **Hedge language:** "may help," "could potentially," "often leads to" — commit to the claim or remove it.

---

## Voice Samples (Feed to ghostwriter skill)

Feed these to `ghostwriter` before generating new copy to calibrate the writing rhythm and tone.

> "Hunt Deck matches you to jobs that fit, then builds everything you need to apply — tailored resume, cover letter, and interview prep — in minutes."

> "Stop scrolling. Start matching."

> "Your resume, rewritten for every role."

> "Prep built around the actual job. Not generic Q&A."

> "From search to offer, without the chaos."

> "Start free. No credit card. Cancel anytime."

> "I'd been applying for 3 months with the same resume and hearing nothing back. I used Hunt Deck to tailor my resume for a product role and had an interview within a week."

---

## How to Use This File

**Before writing any new copy:**
1. Read the relevant section's tone note and rules above
2. Check the banned words list
3. Run `ghostwriter` with the voice samples above to calibrate the agent's rhythm

**After writing any copy:**
1. Run `/avoid-ai-writing rewrite --voice warm` on the draft
2. Check against `marketing.md` conversion checklist
3. Run `/taste copy` via taste-skill to verify editorial voice consistency

**This file is a live document.** Update approved copy here when copy is finalised. If the hero headline changes, it changes here first — then propagates to the codebase.
