import React from "react";
import ScrollReveal from "./ScrollReveal";
import TiltedReveal from "./TiltedReveal";

const FeatureSplit = ({
  id,
  eyebrow,
  title,
  body,
  points = [],
  frame,
  flip = false,
  className = "",
}) => {
  const Tag = id ? "section" : "div";
  const sectionClass = [
    "home-split",
    flip ? "home-split--flip" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag id={id} className={sectionClass}>
      <ScrollReveal className="home-split__copy">
        <p className="home-section__eyebrow">{eyebrow}</p>
        <h2 className="home-section__title">{title}</h2>
        <p className="home-split__body">{body}</p>
        {points.length > 0 && (
          <ul className="home-split__points">
            {points.map((point) => (
              <li key={point}>
                <span className="home-split__chev" aria-hidden="true">
                  ›
                </span>
                {point}
              </li>
            ))}
          </ul>
        )}
      </ScrollReveal>
      <ScrollReveal className="home-split__visual" scale>
        <TiltedReveal>{frame}</TiltedReveal>
      </ScrollReveal>
    </Tag>
  );
};

export default FeatureSplit;
