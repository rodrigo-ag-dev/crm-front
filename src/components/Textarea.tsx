import React, { useId } from 'react';

interface MyInputProps {
  label: string;
  value: any;
  required?: boolean;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement, HTMLTextAreaElement> | undefined;
  type?: string;
  placeholder?: string;
  rows?: number;
}

const Textarea: React.FC<MyInputProps> = ({
  label,
  value,
  required = false,
  onChange,
  placeholder,
  rows
}) => {
  const inputId = useId();

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={inputId}>{label} {required && "*"}</label>
      <textarea id={inputId} className="input-field" required={required} value={value} onChange={onChange} placeholder={placeholder} rows={rows} spellCheck={false} />
    </div>
  );
};

export default Textarea;
