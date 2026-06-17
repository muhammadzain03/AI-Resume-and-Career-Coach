import React, { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import prefersReducedMotion from "../utils/prefersReducedMotion";

const CountUp = ({ to, suffix = "", duration = 1200, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = prefersReducedMotion();
  const [n, setN] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    let raf;
    let start;

    const tick = (t) => {
      start ??= t;
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {n}
      {suffix}
    </span>
  );
};

export default CountUp;
