import React, { useEffect, useState } from "react";
import prefersReducedMotion from "../utils/prefersReducedMotion";

const SCROLL_THRESHOLD = 320;

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      className={`site-back-top${visible ? " is-visible" : ""}`}
      aria-label="Back to top"
      onClick={scrollToTop}
    >
      <span className="site-back-top__icon" aria-hidden="true">
        ↑
      </span>
    </button>
  );
};

export default BackToTop;
