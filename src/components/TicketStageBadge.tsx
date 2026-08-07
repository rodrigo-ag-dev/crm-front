import React from 'react';
import { getStageColor, type TicketStageOption } from '../services/ticketStageService';
import styles from './TicketStageBadge.module.css';

interface TicketStageBadgeProps {
  ticketStageId?: string;
  stages: TicketStageOption[];
}

// Same visual pattern as Companies.tsx's status badge, just colored from the
// stage's own configured color (services/ticketStageService.ts's
// getStageColor) instead of a fixed per-value class, since ticket stages are
// user-defined rather than a closed enum. Shared by the tickets list/detail
// pane and by the related-tickets sections on Companies/Contacts.
export const TicketStageBadge: React.FC<TicketStageBadgeProps> = ({ ticketStageId, stages }) => {
  const stage = stages.find((s) => s.id === ticketStageId);
  return (
    <span
      className={styles.stageBadge}
      style={{ '--stage-color': getStageColor(stage?.color) } as React.CSSProperties}
    >
      {stage?.name || ticketStageId || '-'}
    </span>
  );
};
