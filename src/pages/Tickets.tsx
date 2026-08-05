import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../services/api';
import { ticketService } from '../services/ticketService';
import { useTranslation } from '../hooks/useTranslation';
import { TicketModal, type Ticket } from '../components/TicketModal';
import { ViewToggle } from '../components/ViewToggle';
import { DetailDrawer } from '../components/DetailDrawer';
import { SplitViewShell, RecordListRow, RecordListRowsSkeleton, CollapsibleSearchBar } from '../components/SplitViewShell';
import { RecordPane, RecordPaneEmptyState, RelatedItem, RelatedSection } from '../components/RecordPane';
import { TaskWidget } from '../components/TaskWidget';
import { TicketTimeline } from '../components/TicketTimeline';
import { TicketShareLinkPanel } from '../components/TicketShareLinkPanel';
import { getTicketStages, type TicketStageOption } from '../services/ticketStageService';
import { toFormatedDate } from '../utils/dateUtils';
import { getStoredViewMode, setStoredViewMode, type ViewMode } from '../utils/viewPreferences';
import { getListCache, setListCache } from '../utils/listCache';
import { useFittedPageSize } from '../hooks/useFittedPageSize';
import { TicketsKanbanView } from './TicketsKanbanView';
import splitStyles from '../components/SplitViewShell.module.css';
import paneStyles from '../components/RecordPane.module.css';

const LIST_CACHE_KEY = 'tickets';

const stageLabelById = (ticketStageId: string, stages: TicketStageOption[]) => {
  return stages.find((stage) => stage.id === ticketStageId)?.name || ticketStageId || '-';
};

export const Tickets: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('tickets'));

  const cached = getListCache<Ticket>(LIST_CACHE_KEY);
  const [tickets, setTickets] = useState<Ticket[]>(cached?.items ?? []);
  const [ticketStages, setTicketStages] = useState<TicketStageOption[]>([]);
  const [loading, setLoading] = useState(!cached);
  const [page, setPage] = useState(cached?.page ?? 0);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 0);
  const listBodyRef = useRef<HTMLDivElement>(null);
  const { size, rowHeight } = useFittedPageSize(listBodyRef, tickets.length, cached?.size ?? 10);
  const [searchTerm, setSearchTerm] = useState(cached?.searchTerm ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(cached?.debouncedSearch ?? '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [detail, setDetail] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setStoredViewMode('tickets', mode);
  };

  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (page !== 0) setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (viewMode === 'list') fetchTickets();
  }, [page, debouncedSearch, size, viewMode]);

  useEffect(() => {
    fetchTicketStages();
  }, []);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchTicketStages() {
    try {
      const response = await getTicketStages();
      setTicketStages(response.data || []);
    } catch (error) {
      console.error('Error fetching ticket stages', error);
      setTicketStages([]);
    }
  }

  async function fetchTickets() {
    setLoading(true);
    try {
      const response = await ticketService.searchTickets<Ticket>({ page, size, title: debouncedSearch });
      const items = response.data.content || [];
      const total = response.data.totalPages || 0;
      setTickets(items);
      setTotalPages(total);
      setListCache<Ticket>(LIST_CACHE_KEY, { items, page, totalPages: total, searchTerm, debouncedSearch, size });
      if (page > 0 && page >= total) setPage(Math.max(0, total - 1));
    } catch (error) {
      console.error('Error fetching tickets', error);
      setTickets([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDetail() {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await api.get(`/tickets/${id}`);
      setDetail(response.data);
    } catch (err) {
      console.error('Error fetching ticket detail', err);
      setDetailError(t('tickets.errorSaving'));
    } finally {
      setDetailLoading(false);
    }
  }

  const handleOpenModal = (ticket?: Ticket) => {
    setEditingTicket(ticket || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTicket(null);
  };

  const handleTicketSaved = () => {
    fetchTickets();
    fetchDetail();
  };

  const stageName = ticketStages.find((stage) => stage.id === detail?.ticketStageId)?.name || '';

  const detailPane = (
    <RecordPane
      title={detail?.title || ''}
      subtitle={detail?.canceled ? t('tickets.statusCanceled') : stageName}
      loading={detailLoading}
      error={detailError}
      onEdit={detail ? () => handleOpenModal(detail) : undefined}
    >
      <div className={`card ${paneStyles.relatedCard}`}>
        <div className={paneStyles.infoGrid}>
          <div className={paneStyles.infoField}>
            <span className={paneStyles.infoLabel}>{t('tickets.description')}</span>
            <span className={paneStyles.infoValue}>{detail?.description || '-'}</span>
          </div>
          <div className={paneStyles.infoField}>
            <span className={paneStyles.infoLabel}>{t('tickets.dueDate')}</span>
            <span className={paneStyles.infoValue}>{toFormatedDate(detail?.dueDate)}</span>
          </div>
          <div className={paneStyles.infoField}>
            <span className={paneStyles.infoLabel}>{t('tickets.createdAt')}</span>
            <span className={paneStyles.infoValue}>{toFormatedDate(detail?.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className={paneStyles.relatedGrid}>
        <RelatedSection title={t('tickets.filterCompany')} emptyText={t('companies.noCompanies')}>
          {detail?.companyId && (
            <RelatedItem to={`/companies/${detail.companyId}`} primary={detail.companyName || detail.companyId} />
          )}
        </RelatedSection>

        <RelatedSection title={t('tickets.filterContact')} emptyText={t('contacts.noContacts')}>
          {detail?.contactId && (
            <RelatedItem to={`/contacts/${detail.contactId}`} primary={detail.contactName || detail.contactId} />
          )}
        </RelatedSection>
      </div>

      {id && (
        <div className={`card ${paneStyles.relatedCard}`}>
          <TaskWidget entityType="TICKET" entityId={id} />
        </div>
      )}

      {id && <TicketShareLinkPanel ticketId={id} />}

      {id && <TicketTimeline ticketId={id} ticket={detail} />}
    </RecordPane>
  );

  if (viewMode === 'kanban') {
    return (
      <>
        <TicketsKanbanView viewMode={viewMode} onViewModeChange={handleViewModeChange} />

        <DetailDrawer isOpen={!!id} onClose={() => navigate('/tickets')}>
          {id && detailPane}
        </DetailDrawer>

        <TicketModal isOpen={isModalOpen} onClose={handleCloseModal} onTicketSaved={handleTicketSaved} initialTicket={editingTicket} />
      </>
    );
  }

  return (
    <>
      <div className={splitStyles.page}>
        <div className="page-header">
          <div className={splitStyles.titleGroup}>
            <h1 className="page-title">{t('tickets.title')}</h1>
            <ViewToggle value={viewMode} onChange={handleViewModeChange} />
          </div>
          <div className="toolbar-actions">
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              {t('tickets.newTicket')}
            </button>
          </div>
        </div>

        <SplitViewShell
          hasSelection={!!id}
          left={
            <>
              <div className={splitStyles.listPaneHeader}>
                <span className={splitStyles.listPaneTitle}>{t('tickets.title')}</span>
                <CollapsibleSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={`${t('common.search')} ${t('tickets.title').toLowerCase()}...`}
                />
              </div>

              <div
                className={splitStyles.listPaneBody}
                ref={listBodyRef}
                style={rowHeight ? ({ '--row-height': `${rowHeight}px` } as React.CSSProperties) : undefined}
              >
                {detail && id && !tickets.some((ticket) => ticket.id === id) && (
                  <div className={splitStyles.notInPageBanner}>
                    <span>{t('common.notInCurrentPage')}</span>
                    <button
                      type="button"
                      className={splitStyles.notInPageBannerButton}
                      onClick={() => setSearchTerm(detail.title)}
                    >
                      {t('buttons.locate')}
                    </button>
                  </div>
                )}
                {loading && tickets.length === 0 ? (
                  <RecordListRowsSkeleton />
                ) : (
                  <>
                    {tickets.map((ticket) => (
                      <RecordListRow
                        key={ticket.id}
                        to={`/tickets/${ticket.id}`}
                        isActive={ticket.id === id}
                        primary={ticket.title}
                        secondary={ticket.companyName || ticket.contactName}
                        meta={stageLabelById(ticket.ticketStageId, ticketStages)}
                      />
                    ))}
                    {tickets.length === 0 && (
                      <p className="empty-state">{t('tickets.noTickets')}</p>
                    )}
                  </>
                )}
              </div>

              <div className={splitStyles.listPaneFooter}>
                <span>{t('pagination.pageOf', { page: page + 1, total: totalPages || 1 })}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-secondary icon-button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} title={t('buttons.previous')}>
                    <ChevronLeft size={16} />
                  </button>
                  <button className="btn-secondary icon-button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} title={t('buttons.next')}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          }
          right={id ? detailPane : <RecordPaneEmptyState text={t('common.selectRecordPrompt')} />}
        />
      </div>

      <TicketModal isOpen={isModalOpen} onClose={handleCloseModal} onTicketSaved={handleTicketSaved} initialTicket={editingTicket} />
    </>
  );
};
