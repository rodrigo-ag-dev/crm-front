import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { ticketService } from '../services/ticketService';
import { useTranslation } from '../hooks/useTranslation';
import { TicketModal, type Ticket } from '../components/TicketModal';
import { TicketFunnelCard } from '../components/TicketFunnelCard';
import { ViewToggle } from '../components/ViewToggle';
import type { ViewMode } from '../utils/viewPreferences';
import {
  getTicketStages,
  sortTicketStages,
  type TicketStageOption,
} from '../services/ticketStageService';
import styles from './Funnel.module.css';

interface TicketsKanbanViewProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const getStageColor = (color?: string) => {
  if (!color) return 'var(--primary-color)';
  return color.startsWith('#') || color.startsWith('var(') ? color : `#${color}`;
};

export const TicketsKanbanView: React.FC<TicketsKanbanViewProps> = ({ viewMode, onViewModeChange }) => {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketStages, setTicketStages] = useState<TicketStageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const autoScrollInterval = useRef<number | null>(null);
  const lastDirection = useRef<number>(0);

  const EDGE_THRESHOLD = 80;
  const SCROLL_STEP = 20;
  const SCROLL_INTERVAL_MS = 16;

  const stageMap = useMemo(() => sortTicketStages(ticketStages), [ticketStages]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [ticketsRes, ticketStagesRes] = await Promise.all([
        ticketService.searchTickets<Ticket>({ canceled: false, page: 0, size: 1000 }),
        getTicketStages(),
      ]);

      setTickets(ticketsRes.data.content || []);
      setTicketStages(ticketStagesRes.data || []);
    } catch (error) {
      console.error('Error fetching ticket funnel data', error);
      setTickets([]);
      setTicketStages([]);
    } finally {
      setLoading(false);
      requestAnimationFrame(updateIndicators);
    }
  }

  const clearAutoScroll = () => {
    if (autoScrollInterval.current !== null) {
      window.clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
      lastDirection.current = 0;
    }
  };

  const updateIndicators = () => {
    const board = boardRef.current;
    if (!board) {
      setShowLeftIndicator(false);
      setShowRightIndicator(false);
      return;
    }

    const maxScrollLeft = board.scrollWidth - board.clientWidth;
    setShowLeftIndicator(board.scrollLeft > 0);
    setShowRightIndicator(board.scrollLeft < maxScrollLeft - 1);
  };

  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = e.clientX;

    let direction = 0;
    if (x < rect.left + EDGE_THRESHOLD) direction = -1;
    else if (x > rect.right - EDGE_THRESHOLD) direction = 1;

    if (direction === 0) {
      clearAutoScroll();
      updateIndicators();
      return;
    }

    if (lastDirection.current !== direction) {
      clearAutoScroll();
      lastDirection.current = direction;
    }

    if (!autoScrollInterval.current) {
      autoScrollInterval.current = window.setInterval(() => {
        const currentBoard = boardRef.current;
        if (!currentBoard) return;

        const maxScrollLeft = currentBoard.scrollWidth - currentBoard.clientWidth;
        const newScrollLeft = Math.max(0, Math.min(maxScrollLeft, currentBoard.scrollLeft + SCROLL_STEP * lastDirection.current));

        if (newScrollLeft !== currentBoard.scrollLeft) {
          currentBoard.scrollLeft = newScrollLeft;
          updateIndicators();
        } else {
          clearAutoScroll();
          updateIndicators();
        }
      }, SCROLL_INTERVAL_MS);
    }
  };

  const handleBoardScroll = () => {
    updateIndicators();
  };

  const handleBoardWheel = (e: React.WheelEvent) => {
    if (e.shiftKey) {
      requestAnimationFrame(updateIndicators);
    }
  };

  const scrollBoardByChunk = (direction: 'left' | 'right') => {
    const board = boardRef.current;
    if (!board) return;

    clearAutoScroll();
    const chunk = Math.floor(board.clientWidth * 0.7);
    const target = direction === 'left'
      ? Math.max(0, board.scrollLeft - chunk)
      : Math.min(board.scrollWidth - board.clientWidth, board.scrollLeft + chunk);

    board.scrollTo({ left: target, behavior: 'smooth' });
    window.setTimeout(updateIndicators, 300);
  };

  const handleOpenModal = (ticket?: Ticket) => {
    setEditingTicket(ticket || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTicket(null);
  };

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicketId(ticketId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', ticketId);
    } catch {
      // no-op
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    clearAutoScroll();

    if (!draggedTicketId) {
      setDraggedTicketId(null);
      return;
    }

    const ticket = tickets.find((currentTicket) => currentTicket.id === draggedTicketId);
    if (!ticket || ticket.ticketStageId === targetStageId) {
      setDraggedTicketId(null);
      return;
    }

    setTickets((currentTickets) =>
      currentTickets.map((currentTicket) =>
        currentTicket.id === draggedTicketId
          ? { ...currentTicket, ticketStageId: targetStageId }
          : currentTicket
      )
    );

    try {
      await api.patch(`/tickets/${draggedTicketId}/stage`, { ticketStageId: targetStageId });
    } catch (error) {
      console.error('Error updating ticket stage', error);
      fetchData();
    } finally {
      setDraggedTicketId(null);
      requestAnimationFrame(updateIndicators);
    }
  };

  useEffect(() => {
    const onDragEnd = () => {
      clearAutoScroll();
      updateIndicators();
    };
    const onMouseUp = () => {
      clearAutoScroll();
      updateIndicators();
    };
    const onResize = () => {
      updateIndicators();
    };

    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      clearAutoScroll();
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(updateIndicators);
  }, [tickets.length, ticketStages.length]);

  return (
    <div className={styles.funnelContainer}>
      <div className="page-header">
        <div className={styles.funnelTitleGroup}>
          <h1 className="page-title">{t('tickets.title')}</h1>
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        </div>
        <div className="toolbar-actions">
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> {t('tickets.newTicket')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.funnelLoading}>{t('common.loading')}</div>
      ) : (
        <div
          ref={boardRef}
          className={styles.funnelBoard}
          onDragOver={handleBoardDragOver}
          onScroll={handleBoardScroll}
          onWheel={handleBoardWheel}
        >
          {stageMap.map((stage) => {
            const stageTickets = tickets.filter((ticket) => ticket.ticketStageId === stage.id);
            const stageColor = getStageColor(stage.color);

            return (
              <div
                key={stage.id}
                className={styles.funnelColumn}
                style={{ '--stage-color': stageColor } as React.CSSProperties}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, stage.id)}
              >
                <div className={styles.funnelColumnHeader}>
                  <h3 className={styles.funnelColumnName}>{stage.name}</h3>
                  <span className={styles.funnelColumnBadge}>
                    {stageTickets.length}
                  </span>
                </div>

                <div className={styles.funnelColumnContent}>
                  {stageTickets.map((ticket) => (
                    <TicketFunnelCard
                      key={ticket.id}
                      ticket={ticket}
                      isDragging={draggedTicketId === ticket.id}
                      stageName={stage.name}
                      stageColor={stageColor}
                      onDragStart={(event) => handleDragStart(event, ticket.id!)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLeftIndicator && (
        <button className={`${styles.funnelScroll} ${styles.funnelScrollLeft}`} aria-label="Scroll left" onClick={() => scrollBoardByChunk('left')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {showRightIndicator && (
        <button className={`${styles.funnelScroll} ${styles.funnelScrollRight}`} aria-label="Scroll right" onClick={() => scrollBoardByChunk('right')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <TicketModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onTicketSaved={fetchData}
        initialTicket={editingTicket}
      />
    </div>
  );
};
