import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ContactModal } from '../components/ContactModal';
import { DealModal } from '../components/DealModal';
import { TicketModal } from '../components/TicketModal';
import { SplitViewShell, RecordListRow, RecordListRowsSkeleton, CollapsibleSearchBar } from '../components/SplitViewShell';
import { RecordPane, RecordPaneEmptyState, RelatedItem, RelatedSection } from '../components/RecordPane';
import { TaskWidget } from '../components/TaskWidget';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import { SimpleDropdown } from '../components/SimpleDropdown';
import { abbreviateNumber } from '../utils/numberUtils';
import { getListCache, setListCache } from '../utils/listCache';
import { useFittedPageSize } from '../hooks/useFittedPageSize';
import { getTicketStages, type TicketStageOption } from '../services/ticketStageService';
import splitStyles from '../components/SplitViewShell.module.css';
import paneStyles from '../components/RecordPane.module.css';
import styles from './Companies.module.css';

const LIST_CACHE_KEY = 'companies';

export type CompanyStatus = 'LEAD' | 'PROSPECT' | 'CLIENT' | 'LOST' | 'INACTIVE';

interface Company {
  id?: string;
  name: string;
  alias: string;
  email: string;
  phone: string;
  description: string;
  idRegional: string;
  status: CompanyStatus;
}

interface RelatedContact {
  id: string;
  name: string;
  email: string;
}

interface RelatedDeal {
  id: string;
  title: string;
  amount: number;
  stageId?: string;
}

interface RelatedTicket {
  id: string;
  title: string;
  contactName?: string;
  ticketStageId?: string;
}

interface StageOption {
  id: string;
  description?: string;
}

const emptyCompany: Company = { name: '', alias: '', email: '', phone: '', description: '', idRegional: '', status: 'LEAD' };

const STATUS_BADGE_CLASS: Record<CompanyStatus, string> = {
  LEAD: styles.statusLead,
  PROSPECT: styles.statusProspect,
  CLIENT: styles.statusClient,
  LOST: styles.statusLost,
  INACTIVE: styles.statusInactive,
};

const STATUS_LABEL_KEY: Record<CompanyStatus, string> = {
  LEAD: 'companies.statusLead',
  PROSPECT: 'companies.statusProspect',
  CLIENT: 'companies.statusClient',
  LOST: 'companies.statusLost',
  INACTIVE: 'companies.statusInactive',
};

const StatusBadge: React.FC<{ status: CompanyStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span className={`${styles.statusBadge} ${STATUS_BADGE_CLASS[status]}`}>
      {t(STATUS_LABEL_KEY[status])}
    </span>
  );
};

export const Companies: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cached = getListCache<Company>(LIST_CACHE_KEY);
  const [companies, setCompanies] = useState<Company[]>(cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [page, setPage] = useState(cached?.page ?? 0);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 0);
  const listBodyRef = useRef<HTMLDivElement>(null);
  const { size, rowHeight } = useFittedPageSize(listBodyRef, companies.length, cached?.size ?? 10);
  const [searchTerm, setSearchTerm] = useState(cached?.searchTerm ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(cached?.debouncedSearch ?? '');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Company>(emptyCompany);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [detail, setDetail] = useState<Company | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [contacts, setContacts] = useState<RelatedContact[]>([]);
  const [deals, setDeals] = useState<RelatedDeal[]>([]);
  const [tickets, setTickets] = useState<RelatedTicket[]>([]);
  const [dealStages, setDealStages] = useState<StageOption[]>([]);
  const [ticketStages, setTicketStages] = useState<TicketStageOption[]>([]);
  const [createRelatedModal, setCreateRelatedModal] = useState<'contact' | 'deal' | 'ticket' | null>(null);

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
    fetchCompanies();
  }, [page, debouncedSearch, statusFilter, size]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as CompanyStatus | '');
    if (page !== 0) setPage(0);
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    api.get('/stages/search?size=200').then((res) => setDealStages(res.data.content || [])).catch(() => setDealStages([]));
    getTicketStages().then((res) => setTicketStages(res.data || [])).catch(() => setTicketStages([]));
  }, []);

  const dealStageDescription = (stageId?: string) => dealStages.find((s) => s.id === stageId)?.description;
  const ticketStageName = (stageId?: string) => ticketStages.find((s) => s.id === stageId)?.name;

  async function fetchCompanies() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (debouncedSearch) queryParams.append('name', debouncedSearch);
      if (statusFilter) queryParams.append('status', statusFilter);
      const response = await api.get(`/companies/search?${queryParams.toString()}`);
      const items = response.data.content || [];
      const total = response.data.totalPages || 0;
      setCompanies(items);
      setTotalPages(total);
      setListCache<Company>(LIST_CACHE_KEY, { items, page, totalPages: total, searchTerm, debouncedSearch, size });
      if (page > 0 && page >= total) setPage(Math.max(0, total - 1));
    } catch (err) {
      console.error('Error fetching companies', err);
      setCompanies([]);
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
      const [companyRes, contactsRes, dealsRes, ticketsRes] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get(`/contacts/search?companyId=${id}&size=50`),
        api.get(`/deals/search?companyId=${id}&size=50`),
        api.get(`/tickets/search?companyId=${id}&size=50`),
      ]);
      setDetail(companyRes.data);
      setContacts(contactsRes.data.content || []);
      setDeals(dealsRes.data.content || []);
      setTickets(ticketsRes.data.content || []);
    } catch (err) {
      console.error('Error fetching company detail', err);
      setDetailError(t('companies.errorSaving'));
    } finally {
      setDetailLoading(false);
    }
  }

  const handleOpenModal = (company?: Company) => {
    setEditingCompany(company || null);
    setFormData(company || emptyCompany);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (formData.id) {
        await api.put(`/companies/${formData.id}`, formData);
      } else {
        await api.post('/companies', formData);
      }
      fetchCompanies();
      if (formData.id === id) fetchDetail();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving company', err);
      setError(t('companies.errorSaving'));
    }
  };

  const performDelete = async (confirmed: boolean) => {
    const targetId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!confirmed || !targetId) return;
    try {
      await api.delete(`/companies/${targetId}`);
      fetchCompanies();
      if (targetId === id) navigate('/companies');
    } catch (err) {
      console.error('Error deleting company', err);
      setError(t('companies.errorDeleting'));
    }
  };

  return (
    <>
      <div className={splitStyles.page}>
        <div className="page-header">
          <h1 className="page-title">{t('companies.title')}</h1>
          <div className="toolbar-actions">
            <SimpleDropdown
              wrapperClassName={styles.statusFilter}
              value={statusFilter}
              onChange={handleStatusFilterChange}
              placeholder={t('companies.allStatuses')}
              options={[
                { id: '', name: t('companies.allStatuses') },
                { id: 'LEAD', name: t('companies.statusLead') },
                { id: 'PROSPECT', name: t('companies.statusProspect') },
                { id: 'CLIENT', name: t('companies.statusClient') },
                { id: 'LOST', name: t('companies.statusLost') },
                { id: 'INACTIVE', name: t('companies.statusInactive') },
              ]}
            />
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              {t('companies.createCompany')}
            </button>
          </div>
        </div>

        <SplitViewShell
          hasSelection={!!id}
          left={
            <>
              <div className={splitStyles.listPaneHeader}>
                <span className={splitStyles.listPaneTitle}>{t('companies.title')}</span>
                <CollapsibleSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={`${t('common.search')} ${t('companies.title').toLowerCase()}...`}
                />
              </div>

              <div
                className={splitStyles.listPaneBody}
                ref={listBodyRef}
                style={rowHeight ? ({ '--row-height': `${rowHeight}px` } as React.CSSProperties) : undefined}
              >
                {detail && id && !companies.some((company) => company.id === id) && (
                  <div className={splitStyles.notInPageBanner}>
                    <span>{t('common.notInCurrentPage')}</span>
                    <button
                      type="button"
                      className={splitStyles.notInPageBannerButton}
                      onClick={() => {
                        if (statusFilter) handleStatusFilterChange('');
                        setSearchTerm(detail.name);
                      }}
                    >
                      {t('buttons.locate')}
                    </button>
                  </div>
                )}
                {loading && companies.length === 0 ? (
                  <RecordListRowsSkeleton />
                ) : (
                  <>
                    {companies.map((company) => (
                      <RecordListRow
                        key={company.id}
                        to={`/companies/${company.id}`}
                        isActive={company.id === id}
                        primary={company.name}
                        secondary={company.email || company.alias}
                        badge={<StatusBadge status={company.status} />}
                      />
                    ))}
                    {companies.length === 0 && (
                      <p className="empty-state">{t('companies.noCompanies')}</p>
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
          right={
            id ? (
              <RecordPane
                title={detail?.name || ''}
                subtitle={detail?.description}
                badge={detail ? <StatusBadge status={detail.status} /> : undefined}
                loading={detailLoading}
                error={detailError}
                onEdit={detail ? () => handleOpenModal(detail) : undefined}
                onDelete={detail ? () => setConfirmDeleteId(id) : undefined}
              >
                <div className={`card ${paneStyles.relatedCard}`}>
                  <div className={paneStyles.infoGrid}>
                    <div className={paneStyles.infoField}>
                      <span className={paneStyles.infoLabel}>{t('companies.alias')}</span>
                      <span className={paneStyles.infoValue}>{detail?.alias || '-'}</span>
                    </div>
                    <div className={paneStyles.infoField}>
                      <span className={paneStyles.infoLabel}>{t('companies.email')}</span>
                      <span className={paneStyles.infoValue}>{detail?.email || '-'}</span>
                    </div>
                    <div className={paneStyles.infoField}>
                      <span className={paneStyles.infoLabel}>{t('companies.phone')}</span>
                      <span className={paneStyles.infoValue}>{detail?.phone || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className={paneStyles.relatedGrid}>
                  <RelatedSection
                    title={t('contacts.title')}
                    emptyText={t('contacts.noContacts')}
                    onCreate={() => setCreateRelatedModal('contact')}
                    createLabel={t('contacts.createContact')}
                  >
                    {contacts.map((contact) => (
                      <RelatedItem key={contact.id} to={`/contacts/${contact.id}`} primary={contact.name} secondary={contact.email} />
                    ))}
                  </RelatedSection>

                  <RelatedSection
                    title={t('deals.title')}
                    emptyText={t('deals.noDeals')}
                    onCreate={() => setCreateRelatedModal('deal')}
                    createLabel={t('deals.createDeal')}
                  >
                    {deals.map((deal) => (
                      <RelatedItem
                        key={deal.id}
                        to={`/deals/${deal.id}`}
                        primary={deal.title}
                        secondary={abbreviateNumber(deal.amount)}
                        description={dealStageDescription(deal.stageId)}
                      />
                    ))}
                  </RelatedSection>

                  <RelatedSection
                    title={t('tickets.title')}
                    emptyText={t('tickets.noTickets')}
                    onCreate={() => setCreateRelatedModal('ticket')}
                    createLabel={t('tickets.createTicket')}
                  >
                    {tickets.map((ticket) => (
                      <RelatedItem
                        key={ticket.id}
                        to={`/tickets/${ticket.id}`}
                        primary={ticket.title}
                        secondary={ticket.contactName}
                        description={ticketStageName(ticket.ticketStageId)}
                      />
                    ))}
                  </RelatedSection>
                </div>

                <div className={`card ${paneStyles.relatedCard}`}>
                  <TaskWidget entityType="COMPANY" entityId={id} />
                </div>
              </RecordPane>
            ) : (
              <RecordPaneEmptyState text={t('common.selectRecordPrompt')} />
            )
          }
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCompany ? t('companies.editCompany') : t('companies.createCompany')}>
        <form autoComplete="off" onSubmit={handleSubmit}>
          <Input required label={t('companies.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <Input label={t('companies.alias')} value={formData.alias} onChange={(e) => setFormData({ ...formData, alias: e.target.value })} />
          <Input label={t('companies.email')} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label={t('companies.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <SimpleDropdown
            label={t('companies.status')}
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value as CompanyStatus })}
            options={[
              { id: 'LEAD', name: t('companies.statusLead') },
              { id: 'PROSPECT', name: t('companies.statusProspect') },
              { id: 'CLIENT', name: t('companies.statusClient') },
              { id: 'LOST', name: t('companies.statusLost') },
              { id: 'INACTIVE', name: t('companies.statusInactive') },
            ]}
          />
          <Textarea label={t('deals.description')} rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />

          {error && <div className="form-feedback">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ContactModal
        isOpen={createRelatedModal === 'contact'}
        onClose={() => setCreateRelatedModal(null)}
        presetCompanyId={id}
        onContactSaved={() => {
          setCreateRelatedModal(null);
          fetchDetail();
        }}
      />

      <DealModal
        isOpen={createRelatedModal === 'deal'}
        onClose={() => setCreateRelatedModal(null)}
        presetCompanyId={id}
        onDealSaved={() => {
          setCreateRelatedModal(null);
          fetchDetail();
        }}
      />

      <TicketModal
        isOpen={createRelatedModal === 'ticket'}
        onClose={() => setCreateRelatedModal(null)}
        presetCompanyId={id}
        onTicketSaved={() => {
          setCreateRelatedModal(null);
          fetchDetail();
        }}
      />

      <ConfirmModal
        isOpen={confirmDeleteId != null}
        title={''}
        message={t('companies.deleteConfirm')}
        onConfirm={performDelete}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />
    </>
  );
};
