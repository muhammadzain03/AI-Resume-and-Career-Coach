import React, { useState } from "react";

const FaqItem = ({ id, q, a }) => {
  const [open, setOpen] = useState(false);

  return (
    <div id={id} className={`home-faq__item${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="home-faq__q"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{q}</span>
        <span className="home-faq__chev" aria-hidden="true">
          ⌄
        </span>
      </button>
      <div className="home-faq__a">
        <div className="home-faq__a-inner">
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
};

export default FaqItem;
