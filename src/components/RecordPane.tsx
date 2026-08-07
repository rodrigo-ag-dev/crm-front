import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Edit2, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { getInitials, getAvatarStyle } from '../utils/avatarUtils';
import { SkeletonBar } from './Skeleton';
import styles from './RecordPane.module.css';

interface RecordPaneProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  loading: boolean;
  error?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

export const RecordPane: React.FC<RecordPaneProps> = ({
  title,
  subtitle,
  badge,
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
          <h2 className={styles.paneTitle}>
            {title}
            {badge}
          </h2>
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

      {loading ? <RecordPaneSkeleton /> : children}
    </div>
  );
};

const RecordPaneSkeleton: React.FC = () => (
  <>
    <div className={`card ${styles.relatedCard}`} aria-hidden="true">
      <div className={styles.infoGrid}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.infoField}>
            <SkeletonBar width={i === 0 ? '30%' : '45%'} height={10} />
            <SkeletonBar width={i === 1 ? '55%' : '70%'} height={13} style={{ marginTop: 5 }} />
          </div>
        ))}
      </div>
    </div>
    <div className={styles.relatedGrid} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`card ${styles.relatedCard}`}>
          <SkeletonBar width="35%" height={13} style={{ marginBottom: 12 }} />
          <SkeletonBar width="80%" height={11} style={{ marginBottom: 8 }} />
          <SkeletonBar width="60%" height={11} />
        </div>
      ))}
    </div>
  </>
);

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
  onCreate?: () => void;
  createLabel?: string;
  children: React.ReactNode;
}

export const RelatedSection: React.FC<RelatedSectionProps> = ({ title, emptyText, onCreate, createLabel, children }) => {
  const hasItems = React.Children.count(children) > 0;

  return (
    <div className={`card ${styles.relatedCard}`}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {onCreate && (
          <button
            type="button"
            className={styles.createButton}
            onClick={onCreate}
            title={createLabel}
            aria-label={createLabel}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
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
  description?: string;
  badge?: React.ReactNode;
}

export const RelatedItem: React.FC<RelatedItemProps> = ({ to, primary, secondary, description, badge }) => (
  <Link to={to} draggable={false} className={styles.relatedItem}>
    <span className={styles.relatedItemAvatar} style={getAvatarStyle(primary)}>
      {getInitials(primary)}
    </span>
    <span className={styles.relatedItemText}>
      <span className={styles.relatedItemPrimary}>{primary}</span>
      {secondary && <span className={styles.relatedItemSecondary}>{secondary}</span>}
      {description && (
        <span className={styles.relatedItemDescription} title={description}>
          {description}
        </span>
      )}
    </span>
    {badge && <span className={styles.relatedItemBadge}>{badge}</span>}
    <ChevronRight size={16} />
  </Link>
);
