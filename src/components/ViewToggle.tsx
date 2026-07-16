import React from 'react';
import { KanbanSquare, List } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import type { ViewMode } from '../utils/viewPreferences';
import styles from './ViewToggle.module.css';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.toggle} role="group" aria-label={t('common.viewMode')}>
      <button
        type="button"
        className={`${styles.toggleButton} ${value === 'list' ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange('list')}
        title={t('common.viewList')}
      >
        <List size={16} />
        {t('common.viewList')}
      </button>
      <button
        type="button"
        className={`${styles.toggleButton} ${value === 'kanban' ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange('kanban')}
        title={t('common.viewKanban')}
      >
        <KanbanSquare size={16} />
        {t('common.viewKanban')}
      </button>
    </div>
  );
};
