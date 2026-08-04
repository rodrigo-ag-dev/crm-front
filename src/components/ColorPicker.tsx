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
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number; buttonWidth: number; maxHeight: number } | null>(null);

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
      const preferredHeight = 380; // Altura ideal do dropdown (incluindo padding)
      const minHeight = 160; // Abaixo disso preferimos abrir do lado com mais espaço, ainda que role
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const gap = 8; // Espaço entre botão e dropdown
      const padding = 8; // Padding da borda

      // Espaço realmente disponível de cada lado do botão.
      const spaceBelow = viewportHeight - rect.bottom - gap - padding;
      const spaceAbove = rect.top - gap - padding;

      // Sempre ancora no lado com mais espaço, nunca "pula" para longe do
      // botão - quando nenhum lado comporta a altura ideal, o dropdown some
      // com um maxHeight menor (a CSS já tem overflow-y: auto para isso).
      const openBelow = spaceBelow >= spaceAbove;
      const availableSpace = Math.max(minHeight, openBelow ? spaceBelow : spaceAbove);
      const maxHeight = Math.min(preferredHeight, availableSpace);

      // Ao abrir para cima, ancora pela borda inferior (bottom) em vez do
      // topo: como o conteúdo real quase sempre é mais baixo que maxHeight,
      // ancorar pelo topo deixava um vão entre o dropdown e o botão. Usando
      // bottom, o dropdown cresce para cima a partir do botão, do tamanho
      // que precisar, sem depender de adivinhar a altura final.
      let top: number | undefined;
      let bottom: number | undefined;
      if (openBelow) {
        top = rect.bottom + gap;
      } else {
        bottom = Math.max(padding, viewportHeight - rect.top + gap);
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
        top: top !== undefined ? Math.max(padding, top) : undefined,
        bottom,
        left: Math.max(padding, left),
        buttonWidth: rect.width,
        maxHeight
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
            ...(position.top !== undefined ? { top: `${position.top}px` } : { bottom: `${position.bottom}px` }),
            left: `${position.left}px`,
            minWidth: `${position.buttonWidth}px`,
            maxWidth: '350px',
            maxHeight: `${position.maxHeight}px`,
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
