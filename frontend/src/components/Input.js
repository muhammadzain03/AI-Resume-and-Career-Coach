import React from "react";

const Input = ({
  id,
  name,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  ariaInvalid = false,
  ariaDescribedBy,
  className = "",
}) => {
  return (
    <div className="input-group">
      {label ? (
        <label className="input-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        name={name || id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`input ${className}`}
      />
    </div>
  );
};

export default Input;
