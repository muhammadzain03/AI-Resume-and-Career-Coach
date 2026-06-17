import React from "react";

const DEFAULT_ROWS = [
  {
    type: "match",
    label: "MATCH",
    text: "Python, data pipelines",
    tag: "core",
  },
  {
    type: "gap",
    label: "GAP",
    text: "Spark not found in resume",
    tag: "add",
  },
  {
    type: "gap",
    label: "GAP",
    text: "Add latency numbers to 1 bullet",
    tag: "fix",
  },
  {
    type: "match",
    label: "MATCH",
    text: "Git, CI workflows",
    tag: "core",
  },
];

const ProductFrame = ({
  title = "analysis · software engineer",
  score = 75,
  headline = "Match preview",
  subtitle = "Sample analysis · upload for your real score",
  rows = DEFAULT_ROWS,
  children,
  className = "",
}) => {
  const classes = ["product-frame", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="product-frame__device">
        {children || (
          <div className="product-frame__ui">
            <div className="product-frame__ui-top">
              <span className="product-frame__dot" />
              <span className="product-frame__dot" />
              <span className="product-frame__dot" />
              <span className="product-frame__sample">Sample preview</span>
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

              {rows.map((row, index) => (
                <div className="product-frame__row" key={`${row.label}-${row.text}-${index}`}>
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
