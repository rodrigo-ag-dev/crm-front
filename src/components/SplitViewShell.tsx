import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { getInitials, getAvatarStyle } from '../utils/avatarUtils';
import styles from './SplitViewShell.module.css';

interface SplitViewShellProps {
  left: React.ReactNode;
  right: React.ReactNode;
  hasSelection: boolean;
}

export const SplitViewShell: React.FC<SplitViewShellProps> = ({ left, right, hasSelection }) => (
  <div className={`${styles.shell}${hasSelection ? ` ${styles.showingDetail}` : ''}`}>
    <div className={styles.listPane}>{left}</div>
    <div className={styles.detailPane}>{right}</div>
  </div>
);

interface RecordListRowProps {
  to: string;
  isActive: boolean;
  primary: string;
  secondary?: string;
  meta?: string;
}

export const RecordListRow: React.FC<RecordListRowProps> = ({ to, isActive, primary, secondary, meta }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`${styles.row}${isActive ? ` ${styles.rowActive}` : ''}`}
      onClick={() => navigate(to)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') navigate(to);
      }}
    >
      <span className={styles.rowAvatar} style={getAvatarStyle(primary)}>
        {getInitials(primary)}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowPrimary}>{primary}</span>
        {secondary && <span className={styles.rowSecondary}>{secondary}</span>}
      </span>
      {meta && <span className={styles.rowMeta}>{meta}</span>}
    </div>
  );
};

interface CollapsibleSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export const CollapsibleSearchBar: React.FC<CollapsibleSearchBarProps> = ({ value, onChange, placeholder }) => {
  const { t } = useTranslation();
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const open = manuallyOpened || Boolean(value);

  useEffect(() => {
    if (open) wrapRef.current?.querySelector('input')?.focus();
  }, [open]);

  const close = () => {
    setManuallyOpened(false);
    onChange('');
  };

  if (!open) {
    return (
      <button type="button" className={styles.searchToggle} onClick={() => setManuallyOpened(true)} title={t('common.search')}>
        <Search size={16} />
      </button>
    );
  }

  return (
    <div className={styles.searchRow} ref={wrapRef}>
      <Search size={14} className={styles.searchIcon} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
      />
      <button type="button" className={styles.searchClose} onClick={close} aria-label={t('common.close')}>
        <X size={14} />
      </button>
    </div>
  );
};
