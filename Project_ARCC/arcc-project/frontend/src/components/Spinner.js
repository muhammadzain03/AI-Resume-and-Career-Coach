import React from "react";

/**
 * Circular progress spinner. `size` in px. Honors reduced motion via CSS.
 */
const Spinner = ({ size = 22, className = "" }) => {
  const stroke = Math.max(2, Math.round(size / 11));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className={`spinner ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle
          className="spinner__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="spinner__arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.28} ${c}`}
        />
      </svg>
    </span>
  );
};

export default Spinner;
