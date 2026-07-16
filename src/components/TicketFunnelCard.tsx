import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { toFormatedDate } from '../utils/dateUtils';
import styles from '../pages/Funnel.module.css';

interface Ticket {
  id?: string;
  companyId: string;
  companyName?: string;
  contactId: string;
  contactName?: string;
  ticketStageId: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt?: string;
  canceled?: boolean;
  closedAt?: string;
}

interface TicketFunnelCardProps {
  ticket: Ticket;
  isDragging: boolean;
  stageName: string;
  stageColor: string;
  onDragStart: (e: React.DragEvent) => void;
}

export const TicketFunnelCard: React.FC<TicketFunnelCardProps> = ({
  ticket,
  isDragging,
  stageName,
  stageColor,
  onDragStart,
}) => {
  const { t } = useTranslation();

  const companyName = ticket.companyName || ticket.companyId;
  const contactName = ticket.contactName || ticket.contactId;

  return (
    <div
      className={`${styles.funnelCard}${isDragging ? ` ${styles.funnelCardDragging}` : ''}`}
      draggable
      onDragStart={onDragStart}
      style={{ '--stage-color': stageColor } as React.CSSProperties}
    >
      <div className={styles.funnelCardHeader}>
        <Link to={`/tickets/${ticket.id}`} className={styles.funnelCardTitle} onMouseDown={(e) => e.stopPropagation()}>
          <strong>{ticket.title}</strong>
        </Link>
      </div>

      <div className={styles.funnelCardBody}>
        <div
          className={styles.funnelCardEllipsis}
          title={ticket.description || ''}
        >
          {ticket.description || '-'}
        </div>
        <div
          className={styles.funnelCardEllipsis}
          title={companyName || ''}
        >
          <strong>{t('tickets.filterCompany')}:</strong> {companyName || '-'}
        </div>
        <div
          className={styles.funnelCardEllipsis}
          title={contactName || ''}
        >
          <strong>{t('tickets.filterContact')}:</strong> {contactName || '-'}
        </div>
        {ticket.dueDate && (
          <div>
            <strong>{t('tickets.dueDate')}:</strong> {toFormatedDate(ticket.dueDate)}
          </div>
        )}
      </div>

      <div className={styles.funnelCardFooter}>
        <span className={styles.funnelCardStatus}>
          {ticket.canceled
            ? t('tickets.statusCanceled')
            : ticket.closedAt
              ? t('tickets.statusClosed')
              : stageName}
        </span>
        {ticket.createdAt && (
          <small className="text-secondary">
            {toFormatedDate(ticket.createdAt)}
          </small>
        )}
      </div>
    </div>
  );
};
