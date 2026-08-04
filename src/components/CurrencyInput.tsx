import React, { useId } from 'react';

interface CurrencyInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
}

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ label, value, onChange, required, disabled }) => {
  const inputId = useId();

  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={inputId}>{label} {required && '*'}</label>}
      <input
        id={inputId}
        className="input-field"
        type="text"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        autoComplete="off"
        value={formatter.format(value || 0)}
        onChange={e => {
          const digitsOnly = e.target.value.replace(/\D/g, '');
          onChange(Number(digitsOnly) / 100);
        }}
      />
    </div>
  );
};
