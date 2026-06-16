import React from "react";

const DEFAULT_ROWS = [
  {
    type: "match",
    label: "MATCH",
    text: "React, TypeScript, testing",
    tag: "core",
  },
  {
    type: "gap",
    label: "GAP",
    text: "GraphQL not found in resume",
    tag: "add",
  },
  {
    type: "gap",
    label: "GAP",
    text: "Quantify impact in 2 bullets",
    tag: "fix",
  },
  {
    type: "match",
    label: "MATCH",
    text: "CI/CD, Docker",
    tag: "core",
  },
];

const ProductFrame = ({
  title = "analysis · senior frontend engineer",
  score = 87,
  headline = "Strong match",
  subtitle = "ATS-ready · 4 quick wins to reach 95",
  rows = DEFAULT_ROWS,
  children,
}) => {
  return (
    <div className="product-frame">
      <div className="product-frame__device">
        {children || (
          <div className="product-frame__ui">
            <div className="product-frame__ui-top">
              <span className="product-frame__dot" />
              <span className="product-frame__dot" />
              <span className="product-frame__dot" />
              <span className="product-frame__ui-title">{title}</span>
            </div>

            <div className="product-frame__card">
              <div className="product-frame__score">
                <div
                  className="product-frame__ring"
                  style={{ "--score-percent": `${score}%` }}
                >
                  <b>{score}</b>
                </div>
                <div className="product-frame__score-meta">
                  <h4>{headline}</h4>
                  <p>{subtitle}</p>
                </div>
              </div>

              {rows.map((row) => (
                <div className="product-frame__row" key={`${row.label}-${row.text}`}>
                  <span className={`product-frame__pill product-frame__pill--${row.type}`}>
                    {row.label}
                  </span>
                  <span>{row.text}</span>
                  <span>{row.tag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFrame;
