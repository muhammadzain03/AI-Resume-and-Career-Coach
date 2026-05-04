import React, { useId } from "react";

const ARCCLogo = ({ size = 56, showWordmark = true }) => {
  const logoId = useId().replace(/:/g, "");
  const bgGradientId = `${logoId}-bg`;
  const arcGradientId = `${logoId}-arc`;

  return (
    <div className="arcc-logo" aria-label="ARCC logo">
      <svg
        className="arcc-logo__mark"
        width={size}
        height={size}
        viewBox="0 0 88 88"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bgGradientId} x1="8%" y1="8%" x2="92%" y2="92%">
            <stop offset="0%" stopColor="#0f2b62" />
            <stop offset="56%" stopColor="#1f5eff" />
            <stop offset="100%" stopColor="#12958d" />
          </linearGradient>
          <linearGradient id={arcGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7ed9ff" />
            <stop offset="100%" stopColor="#4db7ff" />
          </linearGradient>
        </defs>

        <rect x="8" y="8" width="72" height="72" rx="20" fill={`url(#${bgGradientId})`} />
        <rect
          x="9.5"
          y="9.5"
          width="69"
          height="69"
          rx="18.5"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
        />

        <path
          d="M22 64 37 24h8l15 40h-8.6l-3.2-9H33.8L30.6 64H22Zm14.7-16.2h8.6L41 35.2l-4.3 12.6Z"
          fill="#ffffff"
        />

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
          stroke="#8ad9ff"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        <path
          d="M42.5 25.5 47.7 20.3M47.7 20.3h-4M47.7 20.3v4"
          fill="none"
          stroke="#ffd064"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark ? (
        <div className="arcc-logo__wordmark">
          <span className="arcc-logo__title">ARCC</span>
          <span className="arcc-logo__tagline">AI Resume &amp; Career Coach</span>
        </div>
      ) : null}
    </div>
  );
};

export default ARCCLogo;
