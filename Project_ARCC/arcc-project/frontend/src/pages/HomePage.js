import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import ScrollReveal from "../components/ScrollReveal";
import ProductFrame from "../components/ProductFrame";
import FeatureSplit from "../components/FeatureSplit";
import CountUp from "../components/CountUp";
import FaqItem from "../components/FaqItem";
import CodeSnippetTabs from "../components/CodeSnippetTabs";
import Button from "../components/Button";
import prefersReducedMotion from "../utils/prefersReducedMotion";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const reducedFadeUp = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

const reducedStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0 } },
};


const featureOverview = [
  {
    num: "01",
    title: "Resume analysis",
    desc: "Upload your resume and get instant feedback on content, formatting, and ATS compatibility - with specific fixes, not vague scores.",
  },
  {
    num: "02",
    title: "Job-fit scoring",
    desc: "Paste any job description to see your match score, the keywords you're missing, and where to focus first.",
  },
  {
    num: "03",
    title: "Interview practice",
    desc: "Rehearse with an AI interviewer that asks role-specific questions and gives feedback in real time.",
  },
];

const heroFrameProps = {
  title: "analysis · senior frontend engineer",
  score: 84,
  headline: "Solid match",
  subtitle: "ATS-ready · 3 quick wins to reach 92",
  rows: [
    { type: "match", label: "MATCH", text: "React, TypeScript, Jest", tag: "core" },
    { type: "gap", label: "GAP", text: "GraphQL not mentioned", tag: "add" },
    { type: "gap", label: "GAP", text: "Lead with metrics on 2 bullets", tag: "fix" },
    { type: "match", label: "MATCH", text: "Web Vitals, accessibility", tag: "core" },
  ],
};

const featureSplits = [
  {
    eyebrow: "Resume analysis",
    title: "See exactly what a recruiter sees.",
    body: "RCC reads your resume the way an applicant-tracking system does, then tells you what's working and what's costing you callbacks.",
    points: [
      "An ATS-readiness score with the issues that move it",
      "Formatting and parsing problems flagged line by line",
      "Weak bullets rewritten with stronger, quantified phrasing",
    ],
    frameProps: {
      variant: "resume",
      title: "analysis · full-stack engineer",
      file: "alex-morgan-resume.pdf",
      headline: "ATS readable",
      subtitle: "1 weak bullet flagged · 2 quick wins",
      lines: [
        { kind: "name", text: "Alex Morgan" },
        { kind: "role", text: "Full-Stack Engineer · San Francisco" },
        { kind: "section", text: "Experience" },
        {
          kind: "bullet",
          text: "Architected 3 production services on Node.js + MySQL",
          state: "good",
          note: "Strong",
        },
        {
          kind: "bullet",
          text: "Worked on the REST API and various fixes",
          state: "flag",
          note: "Quantify impact",
        },
        {
          kind: "bullet",
          text: "Cut p95 latency 40% (800ms → 480ms)",
          state: "good",
        },
        { kind: "section", text: "Skills" },
        { kind: "text", text: "React · Node.js · MySQL · REST · Jest" },
      ],
    },
    flip: false,
  },
  {
    eyebrow: "Job-fit scoring",
    title: "Tailor to the job, not the average.",
    body: "Paste the role you actually want. RCC compares your resume against it and shows the gap between what you wrote and what they asked for.",
    points: [
      "A match score against the specific job description",
      "Missing keywords and skills, grouped by priority",
      "Concrete suggestions for what to add and what to cut",
    ],
    frameProps: {
      variant: "scoring",
      title: "scoring · product manager",
      score: 68,
      headline: "Partial fit",
      subtitle: "Tailor to reach 85+",
      missing: [
        { text: "SQL", priority: "high" },
        { text: "A/B testing", priority: "high" },
        { text: "Roadmap OKRs", priority: "medium" },
        { text: "SaaS metrics", priority: "medium" },
        { text: "Figma", priority: "low" },
      ],
      matched: ["Roadmaps", "Stakeholder comms", "Agile", "Discovery"],
    },
    flip: true,
  },
  {
    eyebrow: "Interview practice",
    title: "Walk in already rehearsed.",
    body: "Practice with an AI interviewer trained on the role you're targeting. Get questions you'll actually be asked and feedback on every answer.",
    points: [
      "Role-specific behavioral and technical questions",
      "Real-time feedback on structure and content",
      "A running summary of what to tighten before the real thing",
    ],
    frameProps: {
      variant: "interview",
      title: "interview · data analyst",
      headline: "RCC Interview Coach",
      subtitle: "Role-specific · live feedback",
      progress: "Q3 / 8",
      messages: [
        {
          type: "question",
          tag: "Q",
          text: "Walk me through how you'd debug a dashboard showing wrong numbers.",
        },
        {
          type: "answer",
          tag: "You",
          text: "I'd trace the metric back to the query, then validate the source table…",
        },
        {
          type: "feedback",
          tag: "Feedback",
          text: "Strong, structured answer. Add a quick example of a bug you actually caught.",
        },
      ],
    },
    flip: false,
    className: "home-section--glow",
  },
];

const API_DOCS_URL =
  "https://github.com/muhammadzain03/AI-Resume-and-Career-Coach/blob/main/Project_ARCC/arcc-project/docs/RCC-Project-Documentation.md#api-contract";

const steps = [
  { step: "1", title: "Upload", desc: "Drop your resume in PDF or DOCX" },
  { step: "2", title: "Describe", desc: "Paste the job description you're targeting" },
  { step: "3", title: "Analyze", desc: "Get an instant match score, skill gaps, and suggestions" },
  { step: "4", title: "Practice", desc: "Run AI mock interviews tailored to the role" },
];

const stats = [
  { to: 95, suffix: "%", label: "ATS compatibility check" },
  { to: 50, suffix: "+", label: "Skill categories tracked" },
  { text: "Real-time", label: "AI interview feedback" },
];

const techStack = ["React", "Gemini", "Flask", "MySQL"];

const whatItChecks = [
  "ATS parsing",
  "keyword match",
  "impact phrasing",
  "formatting",
];

const faqItems = [
  {
    q: "How is RCC different from other AI resume tools?",
    a: "RCC doesn't just rewrite text - it scores your resume against a specific job the way an ATS would, shows the exact keywords you're missing, and lets you rehearse interviews for that role. Analysis, scoring, and practice live in one place.",
  },
  {
    q: "What file types can I upload?",
    a: "PDF and DOCX. RCC parses the text the same way most applicant-tracking systems do, so what you see is close to what a recruiter's system sees.",
  },
  {
    q: "Does the AI rewrite my resume for me?",
    a: "It suggests stronger, quantified phrasing for weak bullets, but you stay in control - nothing changes without your edit.",
  },
  {
    id: "faq-privacy",
    q: "Is my data private?",
    a: "Your resume is used only to generate your analysis. It is stored with your account so you can review past results. RCC does not sell your data or use it to train third-party models.",
  },
  {
    q: "How accurate is the ATS score?",
    a: "It models the parsing and keyword-matching real systems use. It's a strong guide, not a guarantee - every company configures its ATS differently.",
  },
  {
    q: "Do I need an account?",
    a: "You can try an analysis quickly; saving history and running interview practice needs a free account.",
  },
  {
    q: "Is RCC free?",
    a: "Yes, it's free while in beta.",
  },
  {
    q: "Who built this?",
    a: "RCC is built by a software-engineering student as a real, deployed project - feedback is genuinely welcome.",
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const reduceMotion = prefersReducedMotion();
  const heroStagger = reduceMotion ? reducedStagger : stagger;
  const heroFadeUp = reduceMotion ? reducedFadeUp : fadeUp;

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }, [location.pathname, location.hash]);

  const orbY1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const orbY2 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <div className="home">
      <section className="home-hero">
        {reduceMotion ? (
          <>
            <div className="home-orb home-orb--1" />
            <div className="home-orb home-orb--2" />
            <div className="home-grid-bg" />
          </>
        ) : (
          <>
            <motion.div className="home-orb home-orb--1" style={{ y: orbY1 }} />
            <motion.div className="home-orb home-orb--2" style={{ y: orbY2 }} />
            <motion.div className="home-grid-bg" style={{ y: gridY }} />
          </>
        )}

        <div className="home-hero__inner">
          <motion.div
            className="home-hero__top"
            variants={heroStagger}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
          >
            <div className="home-hero__row">
              <div className="home-hero__copy">
                <motion.h1 variants={heroFadeUp} className="home-hero__brand">
                  RCC
                </motion.h1>
                <motion.p variants={heroFadeUp} className="home-hero__tagline">
                  Build smarter resumes.
                  <br />
                  <span className="home-hero__muted">Prepare sharper </span>
                  <span className="home-hero__accent">interviews.</span>
                </motion.p>
              </div>

              <div className="home-hero__aside">
                <motion.p variants={heroFadeUp} className="home-hero__desc">
                  Upload your resume, score it against any job description, surface
                  the skills you&apos;re missing, and rehearse with an AI
                  interviewer - all in one place.
                </motion.p>

                <motion.div variants={heroFadeUp} className="home-hero__cta">
                  <Button
                    className="btn--pill btn--hero"
                    arrow
                    onClick={() => navigate("/signup")}
                  >
                    Get started free
                  </Button>
                  <Button
                    className="btn--ghost btn--pill"
                    onClick={() => navigate("/app")}
                  >
                    Open dashboard
                  </Button>
                </motion.div>

                <motion.p variants={heroFadeUp} className="home-hero__micro">
                  No credit card. PDF or DOCX.
                </motion.p>
              </div>
            </div>

            <motion.div variants={heroFadeUp} className="home-hero__trust-bar">
              {techStack.map((item) => (
                <span key={item}>{item}</span>
              ))}
              {whatItChecks.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="home-hero__visual"
            variants={heroFadeUp}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <div className="home-hero__frame-stage">
              <motion.div
                className="home-hero__frame-zoom"
                animate={
                  reduceMotion
                    ? undefined
                    : { scale: [1, 1.045, 1], y: [0, -10, 0] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
              >
                <ProductFrame className="product-frame--hero" {...heroFrameProps} />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="home-section home-section--glow">
        <ScrollReveal>
          <p className="home-section__eyebrow">What RCC does</p>
          <h2 className="home-section__title">
            Everything you need to land the role
          </h2>
        </ScrollReveal>
        <div className="home-features">
          {featureOverview.map((feature, i) => (
            <ScrollReveal key={feature.num} delay={i * 0.1}>
              <article className="home-feature">
                <span className="home-feature__num">{feature.num}</span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {featureSplits.map((feature) => (
        <FeatureSplit
          key={feature.title}
          eyebrow={feature.eyebrow}
          title={feature.title}
          body={feature.body}
          points={feature.points}
          frame={<ProductFrame {...feature.frameProps} />}
          flip={feature.flip}
          className={feature.className}
        />
      ))}

      <section id="how-it-works" className="home-section">
        <ScrollReveal>
          <p className="home-section__eyebrow">How it works</p>
          <h2 className="home-section__title">
            From upload to interview-ready in four steps
          </h2>
        </ScrollReveal>

        <div className="home-steps">
          {steps.map((s, i) => (
            <ScrollReveal key={s.step} delay={i * 0.12}>
              <div className="home-step">
                <span className="home-step__num">{s.step}</span>
                <div className="home-step__text">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-stats">
          {stats.map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 0.12} scale>
              <div className="home-stat">
                {s.text ? (
                  <span className="home-stat__value">{s.text}</span>
                ) : (
                  <CountUp
                    className="home-stat__value"
                    to={s.to}
                    suffix={s.suffix}
                  />
                )}
                <span className="home-stat__label">{s.label}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="api" className="home-section">
        <ScrollReveal>
          <p className="home-section__eyebrow">Built for developers</p>
          <h2 className="home-section__title">There&apos;s an API for that.</h2>
          <p className="home-dev__lead">
            RCC is API-first. Score resumes, fetch skill gaps, or wire it into
            your own tools.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.12}>
          <CodeSnippetTabs />
          <div className="home-dev__cta">
            <Button
              as="a"
              href={API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn--pill btn--ghost"
              arrow
            >
              Read the API docs
            </Button>
          </div>
        </ScrollReveal>
      </section>

      <section id="pricing" className="home-section home-section--glow home-section--glow-left">
        <ScrollReveal>
          <p className="home-section__eyebrow">Pricing</p>
          <h2 className="home-section__title">Start free, stay focused</h2>
          <p className="home-pricing__lead">
            Full access to resume analysis, job-fit scoring, and AI interview
            practice - no credit card required.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.12}>
          <div className="home-pricing__card">
            <span className="home-pricing__price">$0</span>
            <p className="home-pricing__label">Free for students and job seekers</p>
            <ul className="home-pricing__list">
              <li>Resume upload and ATS-style feedback</li>
              <li>Job description match scoring</li>
              <li>AI mock interviews with spoken questions</li>
            </ul>
            <Button className="btn--pill" arrow onClick={() => navigate("/signup")}>
              Get started free
            </Button>
          </div>
        </ScrollReveal>
      </section>

      <section id="why-rcc" className="home-section home-founder">
        <ScrollReveal>
          <p className="home-section__eyebrow">About this project</p>
          <h2 className="home-section__title">Why I built RCC</h2>
          <p className="home-founder__body">
            I&apos;m a software-engineering student who applied to a lot of roles
            and got tired of guessing why resumes got rejected. RCC is the tool
            I wanted: it tells you what an ATS sees, what a job actually asks
            for, and how to close the gap - then helps you rehearse. It&apos;s
            open about what it can and can&apos;t do.
          </p>
        </ScrollReveal>
      </section>

      <section id="faq" className="home-section home-section--glow">
        <ScrollReveal>
          <p className="home-section__eyebrow">FAQ</p>
          <h2 className="home-section__title">Common questions</h2>
        </ScrollReveal>
        <div className="home-faq">
          {faqItems.map((item, i) => (
            <ScrollReveal key={item.q} delay={i * 0.1}>
              <FaqItem id={item.id} q={item.q} a={item.a} />
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
