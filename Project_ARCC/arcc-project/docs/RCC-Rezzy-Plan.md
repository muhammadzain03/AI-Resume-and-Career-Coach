# RCC — "Rezzy-grade" build plan

A complete spec for leveling up the RCC marketing site to match the polish of rezzy.dev,
**in your own brand** (Manrope, teal `#00d4aa`, dark theme). Written to be pasted into
Cursor task-by-task.

**Your stack (confirmed from the repo):** Create React App + React 18 + `react-router-dom` v7
+ `framer-motion` + a single plain-CSS design system at `src/styles/main.css` (CSS variables,
light/dark via `:root[data-theme="dark"]`). No Tailwind. Keep it that way — every snippet below
is plain CSS + framer-motion so it drops straight in.

**Files you'll touch most:**
- `src/pages/HomePage.js` — all marketing sections
- `src/components/PublicLayout.js` — the nav
- `src/components/ProductFrame.js` — your tilted device (already built — we'll reuse it)
- `src/components/ScrollReveal.js` — your reveal wrapper (already built)
- `src/styles/main.css` — all styling

---

## How to use this with Cursor

1. Drop this file in your repo root (e.g. `/docs/redesign-plan.md`).
2. In Cursor, do **one task at a time**, not the whole file at once. Paste a single task's
   block into the chat with: *"Implement this in my existing code. Match my class-naming
   convention (`home-*`, `site-nav__*`) and my CSS variables in `main.css`. Don't add new
   dependencies."*
3. After each task, run the site and eyeball it before moving on. The build order is at the bottom.

A correctness rule for Cursor (paste this once): **"Never use pure `#fff` for large text — use
`--ink-ivory: #f4efe3`. Never leave a section visually empty — every section gets either a
ProductFrame, a stat, or a code/visual element. Respect `prefers-reduced-motion` everywhere."**

---

# PART 1 — The design/UI techniques ("buffs")

Each technique: what it is, where Rezzy uses it, and exactly how to build it in your stack.

## 1. Smooth scroll to in-page sections  ← the thing you noticed

**What it's called:** *anchor links + smooth scrolling*. Clicking "FAQ" sets the URL to
`/#faq` and the browser animates the scroll to the element with `id="faq"`.

**How to implement (3 parts):**

a) One line of CSS enables the animation globally:
```css
html { scroll-behavior: smooth; }
```

b) Because your nav is **sticky**, the target would otherwise hide *under* the nav. Fix it by
reserving space on every scroll target:
```css
/* add to your section ids */
[id] { scroll-margin-top: 90px; } /* ≈ nav height + a little breathing room */
```

c) Make sure each nav link points to a real id. Your nav already has `/#features` and
`/#how-it-works`. Add `/#testimonials`, `/#faq`, `/#pricing` as you build those sections, and
give each `<section>` the matching `id`.

**Reduced-motion:** wrap so users who opt out get an instant jump:
```css
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

**Acceptance:** clicking any nav link animates to the section and lands *below* the sticky nav,
not hidden behind it.

---

## 2. Sticky nav that condenses on scroll + scrollspy

You already have `position: sticky` + `backdrop-filter: var(--glass-blur)` on the header — good.
Two upgrades:

**a) Condense on scroll** (nav gets a touch shorter + a hairline border once you scroll past the
hero), in `PublicLayout.js`:
```jsx
const [scrolled, setScrolled] = React.useState(false);
React.useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);
// then: <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
```
```css
.site-header { transition: padding .25s ease, border-color .25s ease, background .25s ease; }
.site-header.is-scrolled { border-bottom: 1px solid var(--nav-border); }
.site-header.is-scrolled .site-nav { padding-block: 10px; } /* slightly tighter */
```

**b) Scrollspy** (highlight the nav link for the section you're looking at) using
`IntersectionObserver`:
```jsx
const [activeId, setActiveId] = React.useState("");
React.useEffect(() => {
  const ids = ["features", "how-it-works", "testimonials", "faq"];
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && setActiveId(e.target.id)),
    { rootMargin: "-45% 0px -50% 0px" } // fires when section is near vertical center
  );
  ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
  return () => obs.disconnect();
}, []);
// className on each link: activeId === "features" ? "active" : ""
```
You already style `.site-nav__links a.active` — reuse it.

**Acceptance:** nav stays pinned, gets a subtle border after scrolling, and the current
section's link is highlighted.

---

## 3. Oversized display typography (your signature — already started)

You shipped this in the hero. Lock it in as a reusable scale so other headings match:
```css
:root {
  --ink-ivory: #f4efe3;
  --display-1: clamp(44px, 7vw, 86px);  /* hero */
  --display-2: clamp(34px, 4.5vw, 60px); /* section headings */
}
.home-hero__copy h1 { font-size: var(--display-1); line-height: .96; letter-spacing: -.035em; color: var(--ink-ivory); }
.home-section__title { font-size: var(--display-2); line-height: 1.02; letter-spacing: -.03em; color: var(--ink-ivory); }
```
Rezzy uses this same big-confident heading on **every** section ("Multi-agent…", "Resume
Scoring", "Frequently asked questions."). Apply `--display-2` to all your `.home-section__title`s.

---

## 4. Reuse ProductFrame across sections (3D-tilted mockups everywhere)

Rezzy never explains a feature with text alone — there's always a tilted screenshot beside it.
You built `ProductFrame` for the hero; make it the visual for **each** deep-dive section too,
passing different props so each shows a different "screen" (analysis, scoring, interview).
We'll add these sections in Part 2.

**Scroll-linked straighten** (the device eases from tilted → upright as it scrolls into view —
Rezzy does this). You already use `useScroll`/`useTransform` for the orbs, so the pattern is
familiar:
```jsx
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function TiltedReveal({ children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotY = useTransform(scrollYProgress, [0, 1], [-16, -6]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);
  return (
    <motion.div ref={ref} style={{ rotateY: rotY, y, transformPerspective: 1200 }}>
      {children}
    </motion.div>
  );
}
```
Wrap your `<ProductFrame />` instances in `<TiltedReveal>`.

---

## 5. Ambient glow behind devices + section gradients

Rezzy bleeds soft colored light from behind devices and at section edges. You have an `::before`
glow on the device already; add **section-level** atmosphere so big dark areas never feel empty:
```css
.home-section { position: relative; }
.home-section--glow::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(60% 50% at 80% 20%, rgba(0,212,170,.10), transparent 70%);
}
```
Add `home-section--glow` to alternating sections so the page has rhythm, not uniform black.

---

## 6. Alternating two-column feature sections

Rezzy alternates: text-left/visual-right, then visual-left/text-right. Build one reusable block:
```jsx
function FeatureSplit({ id, eyebrow, title, body, points, frame, flip }) {
  return (
    <section id={id} className={`home-split ${flip ? "home-split--flip" : ""}`}>
      <ScrollReveal>
        <div className="home-split__copy">
          <p className="home-section__eyebrow">{eyebrow}</p>
          <h2 className="home-section__title">{title}</h2>
          <p className="home-split__body">{body}</p>
          <ul className="home-split__points">
            {points.map((p) => <li key={p}><span className="chev">›</span>{p}</li>)}
          </ul>
        </div>
      </ScrollReveal>
      <ScrollReveal scale><TiltedReveal>{frame}</TiltedReveal></ScrollReveal>
    </section>
  );
}
```
```css
.home-split { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; padding: 90px 0; }
.home-split--flip .home-split__copy { order: 2; }
.home-split__points { list-style: none; padding: 0; margin: 22px 0 0; display: grid; gap: 14px; }
.home-split__points li { display: flex; gap: 12px; color: var(--ink-secondary); line-height: 1.5; }
.chev { color: var(--accent); font-weight: 700; }
@media (max-width: 880px) { .home-split { grid-template-columns: 1fr; gap: 40px; } .home-split--flip .home-split__copy { order: 0; } }
```
The chevron (`›`) bullets are exactly Rezzy's list style.

---

## 7. Animated count-up stats

Your stats (`95%`, `50+`, `Real-time`) currently sit static. Rezzy-style sites animate numbers
from 0 when they scroll into view. Small hook, no new deps (framer-motion has `useInView`):
```jsx
import { useInView } from "framer-motion";
function CountUp({ to, suffix = "", duration = 1200 }) {
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!inView) return;
    let raf, start;
    const tick = (t) => {
      start ??= t;
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref}>{n}{suffix}</span>;
}
// usage: <CountUp to={95} suffix="%" />  — keep "Real-time" as plain text
```
**Reduced-motion:** if reduced motion is set, render the final number directly (skip the raf).

---

## 8. FAQ accordion (collapsible, accessible)

This is the section you scroll to. Build an accessible accordion with an animated chevron and
height transition. Pure-CSS height animation via `grid-template-rows` (no measuring needed):
```jsx
function FaqItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={`faq-item ${open ? "is-open" : ""}`}>
      <button className="faq-item__q" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span>{q}</span><span className="faq-item__chev" aria-hidden="true">⌄</span>
      </button>
      <div className="faq-item__a"><div className="faq-item__a-inner"><p>{a}</p></div></div>
    </div>
  );
}
```
```css
.faq-item { border:1px solid var(--line); border-radius:14px; background:var(--surface); margin-bottom:12px; overflow:hidden; }
.faq-item__q { all:unset; cursor:pointer; display:flex; justify-content:space-between; gap:16px;
  width:100%; box-sizing:border-box; padding:20px 22px; font-weight:600; color:var(--ink); }
.faq-item__chev { color:var(--ink-muted); transition:transform .25s ease; }
.faq-item.is-open .faq-item__chev { transform:rotate(180deg); }
.faq-item__a { display:grid; grid-template-rows:0fr; transition:grid-template-rows .3s ease; }
.faq-item.is-open .faq-item__a { grid-template-rows:1fr; }
.faq-item__a-inner { overflow:hidden; }
.faq-item__a p { margin:0; padding:0 22px 22px; color:var(--ink-secondary); line-height:1.6; }
```
**Acceptance:** keyboard-focusable, `aria-expanded` toggles, chevron rotates, height animates.
(Questions + answers are in Part 2.)

---

## 9. Tabbed, syntax-highlighted code block ("Built for developers")

Rezzy has a "Built for engineers" section with TypeScript/Python/Bash tabs over a highlighted
code block. You genuinely have an API (Flask backend) so this is honest and impressive.

- **Tabs:** simple `useState` for the active language; map a `{ ts, python, bash }` object.
- **Highlighting:** add `react-syntax-highlighter` (lightweight) OR hand-roll with `<span>`s.
  *(This is the one place a tiny dependency is worth it — confirm with Cursor before adding.)*
```jsx
const SNIPPETS = { TypeScript: `...`, Python: `...`, Bash: `...` };
const [lang, setLang] = React.useState("TypeScript");
// tab buttons map Object.keys(SNIPPETS); body renders SNIPPETS[lang]
```
Style the tabs like Rezzy's pills: active tab gets `--accent-soft` background + `--accent` text.

---

## 10. Pill buttons with circular arrow + hover micro-interactions

You have this on the hero CTA. Standardize it as your button system so every CTA matches:
- Primary: filled teal pill, dark text, circular arrow that nudges right on hover, lifts 2px.
- Ghost: transparent, hairline border, fills with `--accent-soft` on hover.
Make sure `Button.js` supports an `arrow` prop and an `as="a"` mode for anchor CTAs.

---

## 11. Marker / highlight text effect

Rezzy highlights phrases in the job-description screenshot like a marker pen. Use it sparingly in
*your* copy to spotlight a key phrase in a heading:
```css
.mark { background: linear-gradient(transparent 60%, var(--accent-soft) 0); padding: 0 .1em; }
```
e.g. `Built for <span class="mark">software engineers</span>.`

---

## 12. Big-CTA footer

Rezzy's footer leads with a huge "Start Landing Interviews" heading, then link columns. Upgrade
`Footer.js`: a `--display-2`-sized closing headline + a primary CTA, then 3 link columns
(Product / Resources / Support) + copyright. Reuse `--display-2` and the pill button.

---

## 13. Logo / trust strip (honest version)

Rezzy shows company logos. **Don't fake "used by Google."** Honest alternatives that still build
trust for a student project:
- The tech-stack strip you already added ("Built with React · Gemini · Flask · PostgreSQL").
- A "What it checks" strip: *ATS parsing · keyword match · impact phrasing · formatting*.
- Once you have real users, swap in real logos with permission. (See integrity notes, Part 3.)

---

## 14. Floating corner affordance (optional)

Rezzy has a fixed widget in the corner. A tasteful, honest version for you: a **back-to-top**
button that fades in after scrolling, `position: fixed; bottom: 24px; right: 24px;`. Skip
anything that pretends to be live chat you can't staff.

---

## 15. Motion & accessibility baseline (do this once, globally)

- Every animated element checks `prefers-reduced-motion` (you have the orbs; extend to counters,
  accordion, tilt).
- Visible keyboard focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`
- All interactive elements are real `<button>`/`<a>` (you're already good here).
- Stagger reveals at ~0.08–0.12s; don't animate everything — Rezzy is restrained.

---

# PART 2 — Information architecture (section order)

Build the homepage in this order (Rezzy's flow, adapted):

1. **Nav** (sticky, scrollspy)
2. **Hero** ✅ (done)
3. **Trust strip** (tech stack / what-it-checks)
4. **Features overview** ✅ `#features` (your 01/02/03 cards)
5. **Deep-dive split #1 — Resume Analysis** (`FeatureSplit`, frame = analysis ProductFrame)
6. **Deep-dive split #2 — Job-Fit Scoring** (flip, frame = scoring ProductFrame)
7. **Deep-dive split #3 — Interview Practice** (frame = interview ProductFrame)
8. **How it works** ✅ `#how-it-works` (your 4 steps)
9. **Stats** (with CountUp)
10. **Built for developers** (`#api`, tabbed code block) — optional but strong
11. **Testimonials** (`#testimonials`) — only with real quotes (see Part 3)
12. **FAQ** (`#faq`, accordion)
13. **Final CTA + Footer** (big headline)

---

# PART 3 — Honesty / integrity notes (read before writing copy)

This is a portfolio product recruiters may look at, so credibility matters:
- **No fabricated testimonials.** Leave the testimonials section out until you have real quotes,
  or replace it with an honest **"Why I built this"** founder note (template in Part 4).
- **No fake metrics or customer logos.** "95% ATS compatibility check" describes a *feature* and
  is fine; "trusted by 100+ recruiters" is a *claim about usage* — don't copy it unless true.
- **No invented company endorsements.** The tech-stack strip is honest; logos of companies that
  don't use your product are not.

---

# PART 4 — Full copy deck (every word for the site)

Paste these into the matching sections. Sentence case throughout, active voice, no filler.

## SEO / metadata
- **Title:** `RCC — AI resume analysis, job-fit scoring & interview practice`
- **Meta description:** `Score your resume against any job description, find the skills you're
  missing, and rehearse with an AI interviewer. Built for job-seekers who want to land the role.`
- **OG image:** a screenshot of your analysis screen.

## Nav labels
`Features` · `How it works` · `Pricing` (or omit if free) · `FAQ` · `Sign in`

## Hero ✅ (keep, lightly tightened)
- **Eyebrow:** `Resume & Career Coach`
- **Headline:** `Build smarter resumes. Prepare sharper interviews.`
- **Subhead:** `Upload your resume, score it against any job description, surface the skills
  you're missing, and rehearse with an AI interviewer — all in one place.`
  *(Use a small hyphen, not an em dash.)*
- **Primary CTA:** `Get started free`  · **Secondary:** `Open dashboard`
- **Microcopy under CTAs (optional):** `No credit card. PDF or DOCX.`

## Trust strip
- **Label:** `Built with`
- **Items:** `React` · `Gemini` · `Flask` · `PostgreSQL`
  *(or the "what it checks" variant: `ATS parsing · keyword match · impact phrasing · formatting`)*

## Features overview ✅ (`#features`)
- **Eyebrow:** `What RCC does`
- **Title:** `Everything you need to land the role`
- **Card 01 — Resume analysis:** `Upload your resume and get instant feedback on content,
  formatting, and ATS compatibility — with specific fixes, not vague scores.`
- **Card 02 — Job-fit scoring:** `Paste any job description to see your match score, the keywords
  you're missing, and where to focus first.`
- **Card 03 — Interview practice:** `Rehearse with an AI interviewer that asks role-specific
  questions and gives feedback in real time.`

## Deep-dive #1 — Resume analysis (`FeatureSplit`)
- **Eyebrow:** `Resume analysis`
- **Title:** `See exactly what a recruiter sees.`
- **Body:** `RCC reads your resume the way an applicant-tracking system does, then tells you what's
  working and what's costing you callbacks.`
- **Points:**
  - `An ATS-readiness score with the issues that move it`
  - `Formatting and parsing problems flagged line by line`
  - `Weak bullets rewritten with stronger, quantified phrasing`
- **Frame props:** `title="analysis · senior frontend engineer"`, `score={87}`,
  `headline="Strong match"`.

## Deep-dive #2 — Job-fit scoring (`FeatureSplit`, flip)
- **Eyebrow:** `Job-fit scoring`
- **Title:** `Tailor to the job, not the average.`
- **Body:** `Paste the role you actually want. RCC compares your resume against it and shows the
  gap between what you wrote and what they asked for.`
- **Points:**
  - `A match score against the specific job description`
  - `Missing keywords and skills, grouped by priority`
  - `Concrete suggestions for what to add and what to cut`

## Deep-dive #3 — Interview practice (`FeatureSplit`)
- **Eyebrow:** `Interview practice`
- **Title:** `Walk in already rehearsed.`
- **Body:** `Practice with an AI interviewer trained on the role you're targeting. Get questions
  you'll actually be asked and feedback on every answer.`
- **Points:**
  - `Role-specific behavioral and technical questions`
  - `Real-time feedback on structure and content`
  - `A running summary of what to tighten before the real thing`

## How it works ✅ (`#how-it-works`)
- **Eyebrow:** `How it works`
- **Title:** `From upload to interview-ready in four steps`
- **Steps:** `1 Upload — Drop your resume in PDF or DOCX` · `2 Describe — Paste the job
  description you're targeting` · `3 Analyze — Get an instant match score, skill gaps, and
  suggestions` · `4 Practice — Run AI mock interviews tailored to the role`

## Stats (with CountUp)
- `95%` — `ATS compatibility check`
- `50+` — `Skill categories tracked`
- `Real-time` — `AI interview feedback`
*(Keep these honest — they describe capabilities, not usage.)*

## Built for developers (`#api`) — optional
- **Eyebrow:** `Built for developers`
- **Title:** `There's an API for that.`
- **Body:** `RCC is API-first. Score resumes, fetch skill gaps, or wire it into your own tools.`
- **Tabs:** `TypeScript` / `Python` / `Bash` with a sample request to your endpoint.
- **CTA:** `Read the API docs`

## Testimonials (`#testimonials`) — REAL quotes only
If you have none yet, replace this section with a founder note:
- **Title:** `Why I built RCC`
- **Body:** `I'm a software-engineering student who applied to a lot of roles and got tired of
  guessing why resumes got rejected. RCC is the tool I wanted: it tells you what an ATS sees,
  what a job actually asks for, and how to close the gap — then helps you rehearse. It's open
  about what it can and can't do.`
*(When you collect real quotes, format each as: quote · name · role/context. Don't invent any.)*

## FAQ (`#faq`)
- **Q:** `How is RCC different from other AI resume tools?`
  **A:** `RCC doesn't just rewrite text — it scores your resume against a specific job the way an
  ATS would, shows the exact keywords you're missing, and lets you rehearse interviews for that
  role. Analysis, scoring, and practice live in one place.`
- **Q:** `What file types can I upload?`
  **A:** `PDF and DOCX. RCC parses the text the same way most applicant-tracking systems do, so
  what you see is close to what a recruiter's system sees.`
- **Q:** `Does the AI rewrite my resume for me?`
  **A:** `It suggests stronger, quantified phrasing for weak bullets, but you stay in control —
  nothing changes without your edit.`
- **Q:** `Is my data private?`
  **A:** `Your resume is used only to generate your analysis. [State your actual retention policy
  here — don't promise more than your backend does.]`
- **Q:** `How accurate is the ATS score?`
  **A:** `It models the parsing and keyword-matching real systems use. It's a strong guide, not a
  guarantee — every company configures its ATS differently.`
- **Q:** `Do I need an account?`
  **A:** `You can try an analysis quickly; saving history and running interview practice needs a
  free account.`
- **Q:** `Is RCC free?`
  **A:** `[Answer honestly based on your plan — e.g. "Yes, it's free while in beta."]`
- **Q:** `Who built this?`
  **A:** `RCC is built by a software-engineering student as a real, deployed project — feedback
  is genuinely welcome.`

## Final CTA + footer
- **Closing headline (big):** `Stop guessing. Start landing.`
- **Sub:** `Score your resume against the job you want — in under a minute.`
- **CTA:** `Get started free`
- **Footer columns:**
  - **Product:** `Features` · `How it works` · `Pricing`
  - **Resources:** `FAQ` · `API docs`
  - **Support:** `Contact` · `Privacy` · `Terms`
- **Copyright:** `© 2026 RCC. Built by Muhammad Zain.`

## Microcopy (the small stuff that signals polish)
- **Upload empty state:** `Drop a PDF or DOCX here, or click to browse.`
- **Analyzing state:** `Reading your resume the way an ATS would…`
- **Error (parse fail):** `That file wouldn't parse. Try a text-based PDF or a DOCX — scanned
  images won't work.`
- **Empty history:** `No analyses yet. Upload a resume to see your first score.`
- **Button-in-flight:** `Analyzing…` (then returns to its original label, never a generic "Done").

---

# PART 5 — Build order (do them in this sequence)

| # | Task | Effort | Payoff |
|---|------|--------|--------|
| 1 | Smooth scroll + `scroll-margin-top` (Technique 1) | 10 min | High |
| 2 | Scrollspy + condensing nav (Technique 2) | 30 min | Med |
| 3 | `FeatureSplit` block + 3 deep-dive sections w/ ProductFrame (6, 4) | 2–3 hr | **Highest** |
| 4 | Scroll-linked tilt on devices (4) | 45 min | High |
| 5 | Section glows + display-2 headings (3, 5) | 45 min | Med |
| 6 | CountUp stats (7) | 30 min | Med |
| 7 | FAQ accordion + copy (8) | 1 hr | High |
| 8 | Big-CTA footer (12) | 45 min | Med |
| 9 | Built-for-developers tabbed code block (9) | 1.5 hr | Med (impressive) |
| 10 | A11y/reduced-motion pass + focus styles (15) | 30 min | High (quality floor) |

**Spend your boldness in one place:** the giant type + tilted ProductFrames are your signature.
Keep everything else quiet and disciplined. Before you ship each section, remove one decoration.
