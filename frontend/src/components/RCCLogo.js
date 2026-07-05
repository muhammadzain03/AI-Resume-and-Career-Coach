import React, { useId } from "react";

const RCCLogo = ({ size = 56, showWordmark = true }) => {
  const logoId = useId().replace(/:/g, "");
  const bgGradientId = `${logoId}-bg`;
  const arcGradientId = `${logoId}-arc`;

  return (
    <div className="rcc-logo" aria-label="RCC logo">
      <svg
        className="rcc-logo__mark"
        width={size}
        height={size}
        viewBox="0 0 88 88"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bgGradientId} x1="8%" y1="8%" x2="92%" y2="92%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#00d4aa" />
          </linearGradient>
          <linearGradient id={arcGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        <rect x="8" y="8" width="72" height="72" rx="18" fill={`url(#${bgGradientId})`} />
        <rect
          x="9.5"
          y="9.5"
          width="69"
          height="69"
          rx="16.5"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
        />

        <text
          x="44"
          y="52"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="26"
          fontWeight="700"
          fontFamily="'Space Grotesk', system-ui, sans-serif"
          letterSpacing="0.04em"
        >
          RCC
        </text>

        <path
          d="M68 31A13 13 0 1 0 68 57"
          fill="none"
          stroke={`url(#${arcGradientId})`}
          strokeWidth="4.8"
          strokeLinecap="round"
        />
        <path
          d="M64 36A8 8 0 1 0 64 52"
          fill="none"
          stroke="#a7f3d0"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        <path
          d="M42.5 25.5 47.7 20.3M47.7 20.3h-4M47.7 20.3v4"
          fill="none"
          stroke="#fde68a"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark ? (
        <div className="rcc-logo__wordmark">
          <span className="rcc-logo__title">RCC</span>
          <span className="rcc-logo__tagline">Resume &amp; Career Coach</span>
        </div>
      ) : null}
    </div>
  );
};

export default RCCLogo;
