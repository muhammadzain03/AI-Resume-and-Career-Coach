import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import prefersReducedMotion from "../utils/prefersReducedMotion";

const TiltedReveal = ({ children, className = "" }) => {
  const ref = useRef(null);
  const reduceMotion = prefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const rotY = useTransform(scrollYProgress, [0, 1], [-16, -6]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const classes = ["home-tilted-reveal", className].filter(Boolean).join(" ");

  return (
    <motion.div
      ref={ref}
      className={classes}
      style={
        reduceMotion
          ? { rotateY: -10, y: 0, transformPerspective: 1200 }
          : { rotateY: rotY, y, transformPerspective: 1200 }
      }
    >
      {children}
    </motion.div>
  );
};

export default TiltedReveal;
