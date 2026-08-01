import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { DealModal } from '../components/DealModal';
import { SalesFunnelDealCard } from '../components/SalesFunnelDealCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { ViewToggle } from '../components/ViewToggle';
import type { ViewMode } from '../utils/viewPreferences';
import { Plus } from 'lucide-react';
import styles from './Funnel.module.css';

interface Stage {
  id: string;
  name: string;
  color?: string;
}

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
}

interface DealsKanbanViewProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const getStageColor = (color?: string) => {
  if (!color) return 'var(--primary-color)';
  return color.startsWith('#') || color.startsWith('var(') ? color : `#${color}`;
};

export const DealsKanbanView: React.FC<DealsKanbanViewProps> = ({ viewMode, onViewModeChange }) => {
  const { t } = useTranslation();
  const [stages, setStages] = useState<Stage[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'won' | 'lost' | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const autoScrollInterval = useRef<number | null>(null);
  const lastDirection = useRef<number>(0);
  const hasLoadedRef = useRef(false);

  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const EDGE_THRESHOLD = 80;
  const SCROLL_STEP = 20;
  const SCROLL_INTERVAL_MS = 16;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Only the first load shows the skeleton. Later refetches (drag error retry,
    // won/lost error retry, modal save) must not unmount/remount the board, or
    // every card replays its entrance animation instead of just the one that
    // actually changed.
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const stagesRes = await api.get('/stages/search?size=100');
      setStages(stagesRes.data.content || []);

      const companiesRes = await api.get('/companies/search?size=1000');
      setCompanies(companiesRes.data.content || []);

      const dealsRes = await api.get('/deals/search?size=1000');
      setDeals(dealsRes.data.content || []);
    } catch (error) {
      console.error('Error fetching sales funnel data', error);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
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
    setShowRightIndicator(board.scrollLeft < maxScrollLeft - 1); // small tolerance
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
        const b = boardRef.current;
        if (!b) return;
        const maxScrollLeft = b.scrollWidth - b.clientWidth;
        const newScrollLeft = Math.max(0, Math.min(maxScrollLeft, b.scrollLeft + SCROLL_STEP * lastDirection.current));
        if (newScrollLeft !== b.scrollLeft) {
          b.scrollLeft = newScrollLeft;
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

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', dealId);
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

    if (!draggedDealId) {
      setDraggedDealId(null);
      return;
    }

    const deal = deals.find(d => d.id === draggedDealId);
    if (deal && deal.stageId !== targetStageId) {
      setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, stageId: targetStageId } : d));

      try {
        await api.post('/deals/stage', { id: draggedDealId, stageId: targetStageId });
      } catch (err) {
        console.error('Failed to update deal stage', err);
        fetchData();
      }
    }
    setDraggedDealId(null);
    requestAnimationFrame(updateIndicators);
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

  const scrollBoardByChunk = (direction: 'left' | 'right') => {
    const board = boardRef.current;
    if (!board) return;
    clearAutoScroll();
    const chunk = Math.floor(board.clientWidth * 0.7);
    const target = direction === 'left' ? Math.max(0, board.scrollLeft - chunk) : Math.min(board.scrollWidth - board.clientWidth, board.scrollLeft + chunk);
    board.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(updateIndicators, 300);
  };

  const getDealAgeIndicator = (createdAt?: string) => {
    if (!createdAt) return { color: 'var(--text-secondary)', label: 'Unknown' };
    const days = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24));
    if (days < 7) return { color: '#10b981', label: 'New' }; // Green
    if (days <= 14) return { color: '#f59e0b', label: '7-14 days' }; // Yellow
    return { color: '#ef4444', label: '> 14 days' }; // Red
  };

  const handleWonClick = (dealId: string) => {
    setSelectedDealId(dealId);
    setConfirmAction('won');
    setConfirmModalOpen(true);
  };

  const handleLostClick = (dealId: string) => {
    setSelectedDealId(dealId);
    setConfirmAction('lost');
    setConfirmModalOpen(true);
  };

  const handleConfirmAction = async (confirmed: boolean) => {
    if (confirmed && selectedDealId && confirmAction) {
      try {
        setDeals(prev => prev.map(d =>
          d.id === selectedDealId
            ? {
              ...d,
              ...(confirmAction === 'won' ? { won: true, lost: false } : { lost: true, won: false }),
            }
            : d
        ));

        if (confirmAction === 'won') {
          await api.post('/deals/won', { id: selectedDealId });
        } else {
          await api.post('/deals/lost', { id: selectedDealId });
        }
      } catch (err) {
        console.error('Failed to update deal status', err);
        fetchData();
      }
    }
    setConfirmModalOpen(false);
    setSelectedDealId(null);
    setConfirmAction(null);
  };

  useEffect(() => {
    requestAnimationFrame(updateIndicators);
  }, [stages.length, deals.length]);

  return (
    <div className={styles.funnelPage}>
      <div className="page-header page-toolbar">
        <div className={styles.funnelTitleGroup}>
          <h1 className="page-title">{t('deals.title')}</h1>
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        </div>
        <div className="toolbar-actions">
          <button className="btn-primary" onClick={() => { setEditingDeal(null); setIsModalOpen(true); }}>
            <Plus size={18} /> {t('deals.createDeal')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">{t('common.loading')}</div>
      ) : (
        <div
          className={styles.funnelBoard}
          ref={boardRef}
          onDragOver={handleBoardDragOver}
          onScroll={handleBoardScroll}
          onWheel={handleBoardWheel}
        >
          {stages.map(stage => {
            const stageDeals = deals.filter(d => d.stageId === stage.id);
            const stageColor = getStageColor(stage.color);

            return (
              <div
                key={stage.id}
                className={styles.funnelColumn}
                style={{ '--stage-color': stageColor } as React.CSSProperties}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className={styles.funnelColumnHeader}>
                  <h3 className={styles.funnelColumnTitle}>{stage.name}</h3>
                  <span className={styles.funnelColumnCount}>
                    {stageDeals.length}
                  </span>
                </div>

                <div className={styles.funnelColumnContent}>
                  {stageDeals.map(deal => {
                    const age = getDealAgeIndicator(deal.createdAt);
                    const hasNoActivity = true;

                    return (
                      <SalesFunnelDealCard
                        key={deal.id}
                        deal={deal}
                        companies={companies}
                        isDragging={draggedDealId === deal.id}
                        ageColor={age.color}
                        ageLabel={age.label}
                        hasNoActivity={hasNoActivity}
                        onDragStart={(e) => handleDragStart(e, deal.id!)}
                        onWon={() => handleWonClick(deal.id!)}
                        onLost={() => handleLostClick(deal.id!)}
                      />
                    );
                  })}
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

      <DealModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDeal(null);
        }}
        onDealSaved={fetchData}
        initialDeal={editingDeal}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        title={''}
        message={
          confirmAction === 'won'
            ? t('deals.confirmDealWon')
            : t('deals.confirmDealLost')
        }
        onConfirm={handleConfirmAction}
        confirmText={confirmAction === 'won' ? t('deals.won') : t('deals.lost')}
        isDangerous={confirmAction === 'lost'}
      />
    </div>
  );
};
