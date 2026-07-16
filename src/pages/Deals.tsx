import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { DealModal } from '../components/DealModal';
import { ViewToggle } from '../components/ViewToggle';
import { ConfirmModal } from '../components/ConfirmModal';
import { DetailDrawer } from '../components/DetailDrawer';
import { SplitViewShell, RecordListRow, CollapsibleSearchBar } from '../components/SplitViewShell';
import { RecordPane, RecordPaneEmptyState, RelatedItem, RelatedSection } from '../components/RecordPane';
import { abbreviateNumber } from '../utils/numberUtils';
import { toFormatedDate } from '../utils/dateUtils';
import { getStoredViewMode, setStoredViewMode, type ViewMode } from '../utils/viewPreferences';
import { DealsKanbanView } from './DealsKanbanView';
import splitStyles from '../components/SplitViewShell.module.css';
import paneStyles from '../components/RecordPane.module.css';

interface Deal {
  id?: string;
  title: string;
  description: string;
  closeDateExpected: string;
  amount: number;
  probability: number;
  stageId: string;
  stageName: string;
  companyId: string;
  contactId: string;
  won?: boolean;
  lost?: boolean;
  ownerId?: string;
  createdAt?: string;
}

interface NamedEntity {
  id: string;
  name?: string;
}

export const Deals: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('deals'));

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const size = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [detail, setDetail] = useState<Deal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [company, setCompany] = useState<NamedEntity | null>(null);
  const [contact, setContact] = useState<NamedEntity | null>(null);
  const [stageName, setStageName] = useState('');

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setStoredViewMode('deals', mode);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (page !== 0) setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (viewMode === 'list') fetchDeals();
  }, [page, debouncedSearch, viewMode]);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchDeals() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (debouncedSearch) queryParams.append('title', debouncedSearch);
      const response = await api.get(`/deals/search?${queryParams.toString()}`);
      setDeals(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
    } catch (err) {
      console.error('Error fetching deals', err);
      setDeals([]);
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
      const dealRes = await api.get(`/deals/${id}`);
      const dealData: Deal = dealRes.data;
      setDetail(dealData);

      const [companyRes, contactRes, stageRes] = await Promise.all([
        dealData.companyId ? api.get(`/companies/${dealData.companyId}`) : Promise.resolve(null),
        dealData.contactId ? api.get(`/contacts/${dealData.contactId}`) : Promise.resolve(null),
        dealData.stageId ? api.get(`/stages/${dealData.stageId}`) : Promise.resolve(null),
      ]);
      setCompany(companyRes?.data || null);
      setContact(contactRes?.data || null);
      setStageName(stageRes?.data?.name || '');
    } catch (err) {
      console.error('Error fetching deal detail', err);
      setDetailError(t('deals.errorSaving'));
    } finally {
      setDetailLoading(false);
    }
  }

  const handleOpenModal = (deal?: Deal) => {
    setEditingDeal(deal || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDeal(null);
  };

  const handleDealSaved = () => {
    fetchDeals();
    fetchDetail();
  };

  const performDelete = async (confirmed: boolean) => {
    const targetId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!confirmed || !targetId) return;
    try {
      await api.delete(`/deals/${targetId}`);
      fetchDeals();
      if (targetId === id) navigate('/deals');
    } catch (err) {
      console.error('Error deleting deal', err);
      setError(t('deals.errorDeleting'));
    }
  };

  const detailPane = (
    <RecordPane
      title={detail?.title || ''}
      subtitle={detail?.won ? t('deals.won') : detail?.lost ? t('deals.lost') : stageName}
      loading={detailLoading}
      error={detailError}
      onEdit={detail ? () => handleOpenModal(detail) : undefined}
      onDelete={detail ? () => setConfirmDeleteId(id!) : undefined}
    >
      <div className={`card ${paneStyles.relatedCard}`}>
        <div className={paneStyles.infoGrid}>
          <div className={paneStyles.infoField}>
            <span className={paneStyles.infoLabel}>{t('deals.amount')}</span>
            <span className={paneStyles.infoValue}>{abbreviateNumber(detail?.amount || 0)}</span>
          </div>
          <div className={paneStyles.infoField}>
            <span className={paneStyles.infoLabel}>{t('deals.probability')}</span>
            <span className={paneStyles.infoValue}>{detail?.probability ?? '-'}</span>
          </div>
          <div className={paneStyles.infoField}>
            <span className={paneStyles.infoLabel}>{t('deals.expectedCloseDate')}</span>
            <span className={paneStyles.infoValue}>{toFormatedDate(detail?.closeDateExpected)}</span>
          </div>
          <div className={paneStyles.infoField}>
            <span className={paneStyles.infoLabel}>{t('deals.description')}</span>
            <span className={paneStyles.infoValue}>{detail?.description || '-'}</span>
          </div>
        </div>
      </div>

      <div className={paneStyles.relatedGrid}>
        <RelatedSection title={t('deals.company')} emptyText={t('companies.noCompanies')}>
          {company && <RelatedItem to={`/companies/${company.id}`} primary={company.name || ''} />}
        </RelatedSection>

        <RelatedSection title={t('deals.contact')} emptyText={t('contacts.noContacts')}>
          {contact && <RelatedItem to={`/contacts/${contact.id}`} primary={contact.name || ''} />}
        </RelatedSection>
      </div>
    </RecordPane>
  );

  if (viewMode === 'kanban') {
    return (
      <>
        <DealsKanbanView viewMode={viewMode} onViewModeChange={handleViewModeChange} />

        <DetailDrawer isOpen={!!id} onClose={() => navigate('/deals')}>
          {id && detailPane}
        </DetailDrawer>

        <DealModal isOpen={isModalOpen} onClose={handleCloseModal} onDealSaved={handleDealSaved} initialDeal={editingDeal} />

        <ConfirmModal
          isOpen={confirmDeleteId != null}
          title={''}
          message={t('deals.deleteConfirm')}
          onConfirm={performDelete}
          confirmText={t('modals.yes')}
          isDangerous={true}
        />
      </>
    );
  }

  return (
    <>
      <div className={splitStyles.page}>
        <div className="page-header">
          <div className={splitStyles.titleGroup}>
            <h1 className="page-title">{t('deals.title')}</h1>
            <ViewToggle value={viewMode} onChange={handleViewModeChange} />
          </div>
          <div className="toolbar-actions">
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              {t('deals.createDeal')}
            </button>
          </div>
        </div>

        {error && <div className="status-message status-message--error">{error}</div>}

        <SplitViewShell
          hasSelection={!!id}
          left={
            <>
              <div className={splitStyles.listPaneHeader}>
                <span className={splitStyles.listPaneTitle}>{t('deals.title')}</span>
                <CollapsibleSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={`${t('common.search')} ${t('deals.title').toLowerCase()}...`}
                />
              </div>

              <div className={splitStyles.listPaneBody}>
                {deals.map((deal) => (
                  <RecordListRow
                    key={deal.id}
                    to={`/deals/${deal.id}`}
                    isActive={deal.id === id}
                    primary={deal.title}
                    secondary={deal.stageName}
                    meta={abbreviateNumber(deal.amount)}
                  />
                ))}
                {!loading && deals.length === 0 && (
                  <p className="empty-state">{t('deals.noDeals')}</p>
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

      <DealModal isOpen={isModalOpen} onClose={handleCloseModal} onDealSaved={handleDealSaved} initialDeal={editingDeal} />

      <ConfirmModal
        isOpen={confirmDeleteId != null}
        title={''}
        message={t('deals.deleteConfirm')}
        onConfirm={performDelete}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />
    </>
  );
};
