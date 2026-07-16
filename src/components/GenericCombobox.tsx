import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useComboboxPosition } from '../hooks/useComboboxPosition';
import { getInitials, getAvatarStyle } from '../utils/avatarUtils';

export interface ComboboxOption {
  id: string;
  name: string;
  subtitle?: string;
}

interface GenericComboboxProps {
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  endpoint: string;
  label: string;
  mapOption: (data: any) => ComboboxOption;
  mapSelectedName?: (data: any) => string;
}

interface Option {
  id: string;
}

export const GenericCombobox: React.FC<GenericComboboxProps> = ({
  value,
  onChange,
  placeholder,
  endpoint,
  label,
  mapOption,
  mapSelectedName = (data) => data?.name
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const internalValueRef = React.useRef(value);
  const { t } = useTranslation();
  const { openUpward, maxHeight } = useComboboxPosition(wrapperRef, isOpen);

  useEffect(() => {
    if (value) {
      if (value === internalValueRef.current && selectedName) {
        return;
      }
      api.get(`${endpoint}/${value}`).then(res => {
        const name = mapSelectedName(res.data) || value;
        setSearchTerm(name);
        setSelectedName(name);
        internalValueRef.current = value;
      }).catch(err => {
        console.error(err);
        setSearchTerm(value);
        setSelectedName(value);
        internalValueRef.current = value;
      });
    } else {
      setSearchTerm('');
      setSelectedName('');
      internalValueRef.current = '';
    }
  }, [value, endpoint, mapSelectedName, selectedName]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedName);
    }
  }, [isOpen, selectedName]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`${endpoint}/search?name=${searchTerm}&page=${page}&size=5`);
        const newOptions = (response.data.content || []).map(mapOption);
        if (page === 0) {
          setOptions(newOptions);
        } else {
          setOptions(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNewOptions = newOptions.filter((n: Option) => !existingIds.has(n.id));
            return [...prev, ...uniqueNewOptions];
          });
        }
        setHasMore(!response.data.last);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    const delayDebounceFn = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isOpen, page, endpoint, mapOption]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 10;
    if (bottom && hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div ref={wrapperRef} className="combobox-wrapper">
        <input
          autoComplete='off'
          spellCheck={false}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(0); setIsOpen(true); setLoading(true); }}
          onFocus={() => { setPage(0); setIsOpen(true); setLoading(true); }}
          onClick={() => { if (!isOpen) { setPage(0); setIsOpen(true); setLoading(true); } }}
          onBlur={(e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.relatedTarget as Node)) {
              setIsOpen(false);
            }
          }}
          className="input-field combobox-input"
        />
        <div className="combobox-action-group">
          {loading && <Loader2 size={16} className="text-secondary combobox-loading" />}
          {!loading && value && (
            <X
              size={16}
              className="text-secondary combobox-clear"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => {
                e.stopPropagation();
                internalValueRef.current = '';
                onChange('');
                setSearchTerm('');
                setSelectedName('');
                setIsOpen(false);
              }}
            />
          )}
        </div>
        {isOpen && (!loading || page > 0) && (
          <ul
            onMouseDown={e => e.preventDefault()}
            onScroll={handleScroll}
            className="combobox-dropdown"
            style={{ maxHeight, ...(openUpward ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {}) }}
          >
            {options.map(option => (
              <li
                key={option.id}
                className="combobox-option"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  internalValueRef.current = option.id;
                  onChange(option.id);
                  setSearchTerm(option.name);
                  setSelectedName(option.name);
                  setIsOpen(false);
                }}
              >
                <span className="combobox-option-avatar" style={getAvatarStyle(option.name)}>
                  {getInitials(option.name)}
                </span>
                <span className="combobox-option-text">
                  <span className="combobox-option-primary">{option.name}</span>
                  {option.subtitle && <span className="combobox-option-secondary">{option.subtitle}</span>}
                </span>
              </li>
            ))}
            {!loading && options.length === 0 && <li className="text-secondary combobox-empty"><small>{t('combobox.noResults')}</small></li>}
          </ul>
        )}
      </div>
    </div>
  );
};
