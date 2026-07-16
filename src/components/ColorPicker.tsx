import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import styles from './ColorPicker.module.css';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#FF6B6B', // Vermelho
  '#FF922B', // Laranja
  '#FDD835', // Amarelo
  '#51CF66', // Verde
  '#15AABF', // Ciano
  '#4361EE', // Azul
  '#9C27B0', // Roxo
  '#EC407A', // Rosa
  '#757575', // Cinza
  '#1976D2', // Azul profundo
];

const STORAGE_KEY = '@CRM:recent_colors';
const MAX_RECENT_COLORS = 8;

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value || '#0E6B52');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [position, setPosition] = useState<{ top: number; left: number; buttonWidth: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setRecentColors(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (!isOpen || !buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 380; // Altura do dropdown (incluindo padding)
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const gap = 8; // Espaço entre botão e dropdown
      const padding = 8; // Padding da borda

      // Determina posição vertical
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top: number;

      // Se tem espaço abaixo, coloca lá
      if (spaceBelow > dropdownHeight + gap) {
        top = rect.bottom + gap;
      }
      // Se tem espaço acima, coloca lá
      else if (spaceAbove > dropdownHeight + gap) {
        top = rect.top - dropdownHeight - gap;
      }
      // Caso contrário, coloca onde tem mais espaço
      else {
        if (spaceBelow > spaceAbove) {
          top = rect.bottom + gap;
        } else {
          top = Math.max(padding, rect.top - dropdownHeight - gap);
        }
      }

      // Determina posição horizontal - alinha com o botão
      let left = rect.left;
      const dropdownWidth = Math.max(rect.width, 300);

      // Se vai sair da borda direita, ajusta para a esquerda
      if (left + dropdownWidth > viewportWidth - padding) {
        left = viewportWidth - dropdownWidth - padding;
      }

      // Se vai sair da borda esquerda, alinha à esquerda com padding
      if (left < padding) {
        left = padding;
      }

      setPosition({
        top: Math.max(padding, top),
        left: Math.max(padding, left),
        buttonWidth: rect.width
      });
    };

    if (isOpen) {
      updatePosition();

      // Recalcula quando a janela é redimensionada ou faz scroll
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const displayColor = value || customColor;

  const addToRecentColors = (color: string) => {
    const cleanColor = color.replace('#', '').toUpperCase();
    const updated = [
      cleanColor,
      ...recentColors.filter(c => c !== cleanColor)
    ].slice(0, MAX_RECENT_COLORS);

    setRecentColors(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handlePresetColor = (color: string) => {
    const cleanColor = color.replace('#', '');
    onChange(cleanColor);
    addToRecentColors(cleanColor);
    setIsOpen(false);
  };

  const handleCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value.replace('#', '').toUpperCase();
    setCustomColor(`#${color}`);
    onChange(color);
    addToRecentColors(color);
  };

  const handleHexInput = (val: string) => {
    const cleanVal = val.replace('#', '').toUpperCase();
    if (/^[0-9A-F]{0,6}$/.test(cleanVal)) {
      onChange(cleanVal);
      if (cleanVal.length === 6) {
        addToRecentColors(cleanVal);
      }
    }
  };

  const getDisplayHex = () => {
    if (!displayColor) return '#FFFFFF';
    return displayColor.startsWith('#') ? displayColor : `#${displayColor}`;
  };

  return (
    <div className={`form-group ${styles.wrapper}`}>
      {label && (
        <label className="form-label">{label}</label>
      )}

      <div className={styles.trigger}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={styles.triggerButton}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <span className={styles.triggerSwatchGroup}>
            <span className={styles.triggerSwatch} style={{ backgroundColor: getDisplayHex() }} />
            <span className={styles.triggerHex}>{getDisplayHex().toUpperCase()}</span>
          </span>
          <ChevronDown size={18} />
        </button>
      </div>

      {isOpen && position && createPortal(
        <div
          ref={dropdownRef}
          className={styles.dropdown}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            minWidth: `${position.buttonWidth}px`,
            maxWidth: '350px',
            zIndex: 1000010,
          }}
        >
          {recentColors.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Cores Recentes</span>
              <div className={styles.swatchGrid}>
                {recentColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handlePresetColor(color)}
                    className={`${styles.swatch} ${displayColor === color ? styles['swatch--selected'] : ''}`}
                    style={{ backgroundColor: `#${color}` }}
                    title={`#${color}`}
                  />
                ))}
              </div>
              <hr className={styles.divider} />
            </div>
          )}

          <div className={styles.section}>
            <span className={styles.sectionLabel}>Cores Predefinidas</span>
            <div className={`${styles.swatchGrid} ${styles['swatchGrid--presets']}`}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetColor(color)}
                  className={`${styles.swatch} ${styles['swatch--preset']} ${displayColor === color.replace('#', '') ? styles['swatch--selected'] : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className={styles.customRow}>
            <input
              type="color"
              value={getDisplayHex()}
              onChange={handleCustomColor}
              className={styles.colorInput}
              aria-label="Selecionar cor personalizada"
            />
            <input
              type="text"
              value={getDisplayHex().toUpperCase()}
              onChange={(e) => handleHexInput(e.target.value)}
              placeholder="RRGGBB"
              className={styles.hexInput}
              maxLength={7}
              aria-label="Código hexadecimal da cor"
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
