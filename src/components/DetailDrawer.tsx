import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import styles from './DetailDrawer.module.css';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose, children }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.drawer} role="dialog" aria-modal="true">
        <div className={styles.drawerBar}>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerContent}>{children}</div>
      </div>
    </div>,
    document.body
  );
};
