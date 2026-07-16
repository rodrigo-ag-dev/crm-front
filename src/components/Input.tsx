import React, { useId } from 'react';

interface MyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label: string;
  value: any;
  required?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}

const Input: React.FC<MyInputProps> = ({
  label,
  value,
  required = false,
  onChange,
  type = "text",
  placeholder,
  id,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={inputId}>{label} {required && "*"}</label>}
      <input
        id={inputId}
        className="input-field"
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        {...rest}
      />
    </div>
  );
};

export default Input;
