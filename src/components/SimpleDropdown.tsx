import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useComboboxPosition } from '../hooks/useComboboxPosition';
import { getInitials, getAvatarStyle } from '../utils/avatarUtils';

export interface SimpleDropdownOption {
  id: string;
  name: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

interface SimpleDropdownProps {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  options: SimpleDropdownOption[];
  placeholder?: string;
  wrapperClassName?: string;
}

export const SimpleDropdown: React.FC<SimpleDropdownProps> = ({ label, value, onChange, options, placeholder, wrapperClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { openUpward, maxHeight } = useComboboxPosition(wrapperRef, isOpen);

  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdown = (
    <div ref={wrapperRef} className={`combobox-wrapper${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
      <button
        type="button"
        className="input-field combobox-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={selected ? undefined : 'combobox-trigger-placeholder'}>
          {selected?.name || placeholder || ''}
        </span>
        <ChevronDown size={16} className={`combobox-trigger-icon${isOpen ? ' combobox-trigger-icon-open' : ''}`} />
      </button>
      {isOpen && (
        <ul
          className="combobox-dropdown"
          style={{ maxHeight, ...(openUpward ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {}) }}
        >
          {options.map((option) => (
            <li
              key={option.id}
              className="combobox-option"
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
            >
              {option.icon ? (
                <span className="combobox-option-icon">{option.icon}</span>
              ) : (
                <span className="combobox-option-avatar" style={getAvatarStyle(option.name)}>
                  {getInitials(option.name)}
                </span>
              )}
              <span className="combobox-option-text">
                <span className="combobox-option-primary">{option.name}</span>
                {option.subtitle && <span className="combobox-option-secondary">{option.subtitle}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (!label) return dropdown;

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {dropdown}
    </div>
  );
};
