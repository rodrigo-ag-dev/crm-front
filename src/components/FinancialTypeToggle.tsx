import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import styles from './ViewToggle.module.css';

type FinancialEntryType = 'INCOME' | 'EXPENSE';

interface FinancialTypeToggleProps {
  value: FinancialEntryType;
  onChange: (type: FinancialEntryType) => void;
}

export const FinancialTypeToggle: React.FC<FinancialTypeToggleProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.toggle} role="group" aria-label={t('financial.title')}>
      <button
        type="button"
        className={`${styles.toggleButton} ${value === 'EXPENSE' ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange('EXPENSE')}
        title={t('financial.payable')}
      >
        <TrendingDown size={16} />
        {t('financial.payable')}
      </button>
      <button
        type="button"
        className={`${styles.toggleButton} ${value === 'INCOME' ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange('INCOME')}
        title={t('financial.receivable')}
      >
        <TrendingUp size={16} />
        {t('financial.receivable')}
      </button>
    </div>
  );
};
