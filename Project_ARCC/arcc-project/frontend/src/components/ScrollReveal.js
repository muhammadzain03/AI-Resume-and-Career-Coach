import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

const directions = {
  up: { y: 40, x: 0 },
  down: { y: -40, x: 0 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
};

const ScrollReveal = ({
  children,
  delay = 0,
  direction = "up",
  scale: doScale = false,
  duration = 0.7,
  className = "",
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const d = directions[direction] || directions.up;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        ...d,
        ...(doScale ? { scale: 0.95 } : {}),
      }}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0, ...(doScale ? { scale: 1 } : {}) }
          : {}
      }
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
