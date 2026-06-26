# Landing page conversion principles

A checklist to audit any landing page draft against before shipping. Source:
extracted from a digital marketing breakdown on landing page conversion.
These are general response-conversion principles, not specific to our product —
apply them on top of design.md, not instead of it.

## 1. The hero section carries 80% of the weight

Roughly 60% of visitors never scroll past the hero. If the hero doesn't hook
someone in the first few seconds, the rest of the page doesn't matter.

Checklist for our hero:
- [ ] Headline states the end outcome the user wants — not who we are or what
      we do. ("Land interviews, not rejection emails" passes this; "AI-powered
      job platform" would fail it.)
- [ ] No vague copy. Every word should make a job seeker think "this solves my
      problem."
- [ ] Subheadline elaborates the headline's benefit — it doesn't introduce a
      new idea, it deepens the one already stated.
- [ ] If we have 2 pieces of social proof available, at least one appears above
      the fold (e.g. a usage stat, a rating, a recognizable logo).

## 2. People buy on emotion, not logic

Tap into the feeling a job seeker has when they land on the page — exhaustion,
anxiety about rejection, frustration with repetitive tasks — before pitching
the solution.

The pattern: **name the problem → agitate it slightly → present the solution.**
Done well, the reader thinks "this product understands my problem" before they
think "this product has features."

Checklist:
- [ ] Copy names the specific pain (e.g. tailoring every resume by hand, vague
      generic interview prep, losing track of applications) rather than
      speaking abstractly about "the job search."
- [ ] The solution is framed as relief from that named pain, not as a list of
      capabilities.

## 3. Humans have short attention spans — make the page scannable

Most visitors skim. Pages need visual structure that can be understood at a
glance, not just good sentences.

Checklist:
- [ ] Headings and subheadings break up every section
- [ ] Key claims are bolded or visually distinct, not buried in paragraphs
- [ ] Illustrations/UI snippets carry meaning on their own (a reader should
      get the gist from images alone, even skipping the text)
- [ ] No dense paragraphs — short lines, bullets where possible

## 4. Social proof sells — but only if specific and relevant

Generic testimonials with no detail are not believable and actively hurt
credibility. Logos alone (without a quote) are weak.

Checklist:
- [ ] Every testimonial includes a name, a specific outcome, and ideally a
      role/context (e.g. "Tobi A. — Software Engineer, Abuja" rather than
      an unnamed quote)
- [ ] Quotes address a real objection or question a job seeker would have
      ("does this actually work," "is the prep relevant," "is it worth paying
      for") rather than generic praise
- [ ] If using "as seen in" / partner logos, pair each with a short quote or
      specific claim — don't use logos as decoration alone
- [ ] Replace placeholder testimonials with real ones before launch (tracked
      as an open item in design.md)

## 5. Visual hierarchy: simplicity beats creativity

Too many competing elements cause visitors to disengage. Every section should
have one clear focal point and one clear next action.

Checklist:
- [ ] Each section has a single clear headline — not multiple competing
      messages
- [ ] One primary CTA style is used consistently; avoid scattering several
      different buttons with different purposes on one screen
- [ ] Whitespace is used deliberately — if a section feels crowded, cut
      content rather than shrinking it
- [ ] A first-time visitor could describe what to do next after looking at
      the page for 5 seconds

## 6. Y Combinator Startup Patterns (Filter, Don't Sell)

Based on an analysis of 100+ YC startup landing pages, adopt these 10 patterns to optimize for high conversion and filtering:

1. **Sound specific, not big:** "We help X do Y." Narrow positioning gives greater clarity. Assume the visitor is your target audience.
2. **Ruthlessly simple above the fold:** 10-14 words maximum. 1 visual, 1 primary CTA. Optimize for instinctive understanding in 3-5 seconds.
3. **Functional language over aspirational:** Sell the capability, not the vision. (e.g., "automatically reconcile Stripe payouts" instead of "take control of your financial future").
4. **Product comes before story:** Explain what the product does in max 3 steps. No mission statements.
5. **Lightweight, targeted proof:** Small trust tags, specific metrics ("trusted by X teams"), short testimonials, and early believer logos. No long case studies.
6. **Pricing is visible early:** Build trust by placing pricing above the fold or in the header. Avoid friction.
7. **Intentionally plain design:** Boring B2B design converts better. Neutral backgrounds, system fonts, and UI screenshots instead of generic marketing images.
8. **Low-commitment CTAs:** "Book a demo", "Sign up", "Start for free". Do not use aggressive urgency ("Buy now").
9. **Built to evolve, not be perfect:** Treat the landing page as an experiment. Keep it simple so you can iterate quickly.
10. **Disqualify the wrong users fast:** Your goal is to filter, not sell. Let uninterested traffic bounce quickly, leaving high-quality leads that provide fast product feedback.

## How to use this file

Before considering the landing page done:
1. Re-read the hero section alone — does it pass every box in section 1 and YC pattern 2?
2. Read the whole page top to bottom in under 30 seconds — does it still make sense skimmed?
3. Check every testimonial and social-proof element against section 4 and YC pattern 5.
4. Pressure-test the CTA story across the page — is there one consistent action, and is it low-commitment (YC pattern 8)?
5. Does the language sound functional and specific (YC patterns 1 and 3)?

This file is a quality gate, not a content source — it doesn't replace the copy and structure already defined in design.md.
