import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { getInitials, getAvatarStyle } from '../utils/avatarUtils';
import styles from './RecordPane.module.css';

interface RecordPaneProps {
  title: string;
  subtitle?: string;
  loading: boolean;
  error?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

export const RecordPane: React.FC<RecordPaneProps> = ({
  title,
  subtitle,
  loading,
  error,
  onEdit,
  onDelete,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <div>
          <h2 className={styles.paneTitle}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {(onEdit || onDelete) && (
          <div className="toolbar-actions">
            {onEdit && (
              <button type="button" className="btn-secondary" onClick={onEdit}>
                <Edit2 size={16} />
                {t('common.edit')}
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn-icon-danger" onClick={onDelete} title={t('common.delete')}>
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      {loading ? <div className="page-loading">{t('common.loading')}</div> : children}
    </div>
  );
};

interface RecordPaneEmptyStateProps {
  text: string;
}

export const RecordPaneEmptyState: React.FC<RecordPaneEmptyStateProps> = ({ text }) => (
  <div className={styles.emptyPane}>
    <p className={styles.emptyPaneText}>{text}</p>
  </div>
);

interface RelatedSectionProps {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}

export const RelatedSection: React.FC<RelatedSectionProps> = ({ title, emptyText, children }) => {
  const hasItems = React.Children.count(children) > 0;

  return (
    <div className={`card ${styles.relatedCard}`}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {hasItems ? (
        <div className={styles.relatedList}>{children}</div>
      ) : (
        <p className={styles.emptyText}>{emptyText}</p>
      )}
    </div>
  );
};

interface RelatedItemProps {
  to: string;
  primary: string;
  secondary?: string;
}

export const RelatedItem: React.FC<RelatedItemProps> = ({ to, primary, secondary }) => (
  <Link to={to} draggable={false} className={styles.relatedItem}>
    <span className={styles.relatedItemAvatar} style={getAvatarStyle(primary)}>
      {getInitials(primary)}
    </span>
    <span className={styles.relatedItemText}>
      <span className={styles.relatedItemPrimary}>{primary}</span>
      {secondary && <span className={styles.relatedItemSecondary}>{secondary}</span>}
    </span>
    <ChevronRight size={16} />
  </Link>
);
