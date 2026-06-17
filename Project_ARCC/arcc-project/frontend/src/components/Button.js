import React from "react";

const Button = ({
  children,
  onClick,
  type = "button",
  className = "",
  disabled = false,
  arrow = false,
  as = "button",
  href,
  ...rest
}) => {
  const classes = ["btn", className].filter(Boolean).join(" ");
  const content = (
    <>
      {children}
      {arrow && (
        <span className="btn__arrow" aria-hidden="true">
          →
        </span>
      )}
    </>
  );

  if (as === "a") {
    return (
      <a
        href={href}
        className={`${classes} btn--as-link`}
        onClick={onClick}
        {...rest}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled}
      {...rest}
    >
      {content}
    </button>
  );
};

export default Button;
