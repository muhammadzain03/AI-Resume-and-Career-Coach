import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import ScrollReveal from "../components/ScrollReveal";
import ProductFrame from "../components/ProductFrame";
import Button from "../components/Button";

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

const features = [
  {
    num: "01",
    title: "Resume Analysis",
    desc: "Upload your resume and get AI-powered feedback on content, formatting, and ATS compatibility.",
  },
  {
    num: "02",
    title: "Job-Fit Scoring",
    desc: "Compare against any job description to find skill gaps and alignment opportunities.",
  },
  {
    num: "03",
    title: "Interview Practice",
    desc: "Practice with an AI interviewer using role-specific questions and real-time feedback.",
  },
];

const steps = [
  { step: "1", title: "Upload", desc: "Drop your resume in PDF or DOCX format" },
  { step: "2", title: "Describe", desc: "Paste the job description you're targeting" },
  { step: "3", title: "Analyze", desc: "Get an instant match score, skill gaps, and suggestions" },
  { step: "4", title: "Practice", desc: "Run AI-powered mock interviews tailored to the role" },
];

const stats = [
  { value: "95%", label: "ATS Compatibility Check" },
  { value: "50+", label: "Skill Categories Tracked" },
  { value: "Real-time", label: "AI Interview Feedback" },
];

const techStack = ["React", "Gemini", "Flask", "PostgreSQL"];

const HomePage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();

  const orbY1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const orbY2 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <div className="home">
      <section className="home-hero">
        <motion.div className="home-orb home-orb--1" style={{ y: orbY1 }} />
        <motion.div className="home-orb home-orb--2" style={{ y: orbY2 }} />
        <motion.div className="home-grid-bg" style={{ y: gridY }} />

        <div className="home-hero__inner">
          <motion.div
            className="home-hero__copy"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} className="home-hero__badge">
              <span className="home-hero__badge-dot" aria-hidden="true" />
              Resume &amp; Career Coach
            </motion.div>

            <motion.h1 variants={fadeUp}>
              Build smarter{" "}
              <br />
              resumes. <span className="home-hero__muted">Prepare</span>
              <br />
              <span className="home-hero__muted">sharper</span>{" "}
              <span className="home-hero__accent">interviews.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="home-hero__desc">
              Upload your resume, score it against any job description, surface
              the skills you&apos;re missing, and rehearse with an AI
              interviewer - in one place.
            </motion.p>

            <motion.div variants={fadeUp} className="home-hero__cta">
              <Button className="btn--pill btn--hero" onClick={() => navigate("/signup")}>
                Get started free
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Button>
              <Button
                className="btn--secondary btn--pill"
                onClick={() => navigate("/app")}
              >
                Open dashboard
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} className="home-hero__trust">
              <div className="home-hero__trust-label">Built with</div>
              <div className="home-hero__trust-row">
                {techStack.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="home-hero__visual"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.8, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductFrame />
          </motion.div>
        </div>
      </section>

      <section id="features" className="home-section">
        <ScrollReveal>
          <p className="home-section__eyebrow">What RCC does</p>
          <h2 className="home-section__title">
            Everything you need to land the role
          </h2>
        </ScrollReveal>

        <div className="home-features">
          {features.map((f, i) => (
            <ScrollReveal key={f.num} delay={i * 0.15} scale>
              <div className="home-feature">
                <span className="home-feature__num">{f.num}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="home-section">
        <ScrollReveal>
          <p className="home-section__eyebrow">How it works</p>
          <h2 className="home-section__title">
            Four steps to a stronger application
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
            <ScrollReveal key={s.label} delay={i * 0.15} scale>
              <div className="home-stat">
                <span className="home-stat__value">{s.value}</span>
                <span className="home-stat__label">{s.label}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="home-section home-cta-section">
        <ScrollReveal duration={0.9}>
          <h2 className="home-cta__title">Ready to sharpen your career?</h2>
          <p className="home-cta__desc">
            Join RCC and get AI-powered resume analysis, job-fit scoring,
            and interview practice - completely free.
          </p>
          <Button onClick={() => navigate("/signup")}>Sign Up Now</Button>
        </ScrollReveal>
      </section>
    </div>
  );
};

export default HomePage;
