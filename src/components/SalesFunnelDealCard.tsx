import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarX, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { abbreviateNumber } from '../utils/numberUtils';
import { toFormatedDate } from '../utils/dateUtils';
import styles from '../pages/Funnel.module.css';

interface Company {
  id: string;
  name: string;
}

interface Deal {
  id?: string;
  title: string;
  description: string;
  closeDateExpected: string;
  amount: number;
  probability: number;
  stageId: string;
  companyId: string;
  contactId: string;
  ownerId?: string;
  createdAt?: string;
  lost?: boolean;
  won?: boolean;
}

interface SalesFunnelDealCardProps {
  deal: Deal;
  companies: Company[];
  isDragging: boolean;
  ageColor: string;
  ageLabel: string;
  hasNoActivity: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onWon: () => void;
  onLost: () => void;
}

export const SalesFunnelDealCard: React.FC<SalesFunnelDealCardProps> = ({
  deal,
  companies,
  isDragging,
  ageColor,
  ageLabel,
  hasNoActivity,
  onDragStart,
  onWon,
  onLost,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`${styles.funnelCard}${isDragging ? ` ${styles.funnelCardDragging}` : ''}`}
      draggable
      onDragStart={onDragStart}
    >
      <div className={styles.funnelCardHeader}>
        <Link to={`/deals/${deal.id}`} className={styles.funnelCardTitle} onMouseDown={(e) => e.stopPropagation()}>
          <strong>{deal.title}</strong>
        </Link>
        <div className={styles.funnelCardBadges}>
          {deal.won && (
            <span className={`${styles.funnelCardBadge} ${styles.funnelCardBadgeWon}`}>
              {t('buttons.won')}
            </span>
          )}
          {deal.lost && (
            <span className={`${styles.funnelCardBadge} ${styles.funnelCardBadgeLost}`}>
              {t('buttons.lost')}
            </span>
          )}
        </div>
      </div>

      <div className={styles.funnelCardBody}>
        <div>
          <strong>{t('cardDetails.amount')}:</strong> {abbreviateNumber(deal.amount)}
        </div>
        {deal.companyId && (
          <div className={styles.funnelCardBodyRow}>
            <strong>{t('cardDetails.company')}:</strong>{' '}
            {companies.find(c => c.id === deal.companyId)?.name || deal.companyId}
          </div>
        )}
        {deal.closeDateExpected && (
          <div className={styles.funnelCardBodyRow}>
            <strong>{t('cardDetails.closeDate')}:</strong>{' '}
            {toFormatedDate(deal.closeDateExpected)}
          </div>
        )}
      </div>

      <div className={styles.funnelCardFooter}>
        <div className={styles.funnelCardAge}>
          <span
            title={`Idade: ${ageLabel}`}
            className={styles.funnelCardAgeDot}
            style={{ backgroundColor: ageColor }}
          />
          {hasNoActivity && <CalendarX size={22} color="var(--secondary-color)" />}
        </div>
        <div className={styles.funnelCardActions}>
          <button
            onClick={onWon}
            disabled={deal.won || deal.lost}
            className={`${styles.funnelCardAction} ${styles.funnelCardActionWon}${deal.won || deal.lost ? ` ${styles.funnelCardActionDisabled}` : ''}`}
            title={deal.won || deal.lost ? t('common.loading') : t('buttons.won')}
          >
            <CheckCircle2 size={22} />
          </button>
          <button
            onClick={onLost}
            disabled={deal.won || deal.lost}
            className={`${styles.funnelCardAction} ${styles.funnelCardActionLost}${deal.won || deal.lost ? ` ${styles.funnelCardActionDisabled}` : ''}`}
            title={deal.won || deal.lost ? t('common.loading') : t('buttons.lost')}
          >
            <XCircle size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
