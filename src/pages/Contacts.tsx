import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { ConfirmModal } from '../components/ConfirmModal';
import { ContactModal } from '../components/ContactModal';
import { DealModal } from '../components/DealModal';
import { TicketModal } from '../components/TicketModal';
import { SplitViewShell, RecordListRow, CollapsibleSearchBar } from '../components/SplitViewShell';
import { RecordPane, RecordPaneEmptyState, RelatedItem, RelatedSection } from '../components/RecordPane';
import { abbreviateNumber } from '../utils/numberUtils';
import { getListCache, setListCache } from '../utils/listCache';
import { useFittedPageSize } from '../hooks/useFittedPageSize';
import splitStyles from '../components/SplitViewShell.module.css';
import paneStyles from '../components/RecordPane.module.css';

const LIST_CACHE_KEY = 'contacts';

interface Contact {
  id?: string;
  companyId: string;
  name: string;
  alias: string;
  email: string;
  phone: string;
}

interface Company {
  id: string;
  name: string;
}

interface RelatedDeal {
  id: string;
  title: string;
  amount: number;
}

interface RelatedTicket {
  id: string;
  title: string;
  companyName?: string;
}

export const Contacts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cached = getListCache<Contact>(LIST_CACHE_KEY);
  const [contacts, setContacts] = useState<Contact[]>(cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [page, setPage] = useState(cached?.page ?? 0);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 0);
  const listBodyRef = useRef<HTMLDivElement>(null);
  const { size, rowHeight } = useFittedPageSize(listBodyRef, contacts.length, cached?.size ?? 10);
  const [searchTerm, setSearchTerm] = useState(cached?.searchTerm ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(cached?.debouncedSearch ?? '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [createRelatedModal, setCreateRelatedModal] = useState<'deal' | 'ticket' | null>(null);

  const [detail, setDetail] = useState<Contact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [deals, setDeals] = useState<RelatedDeal[]>([]);
  const [tickets, setTickets] = useState<RelatedTicket[]>([]);

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
    fetchContacts();
  }, [page, debouncedSearch, size]);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (debouncedSearch) queryParams.append('name', debouncedSearch);
      const response = await api.get(`/contacts/search?${queryParams.toString()}`);
      const items = response.data.content || [];
      const total = response.data.totalPages || 0;
      setContacts(items);
      setTotalPages(total);
      setListCache<Contact>(LIST_CACHE_KEY, { items, page, totalPages: total, searchTerm, debouncedSearch, size });
      if (page > 0 && page >= total) setPage(Math.max(0, total - 1));
    } catch (err) {
      console.error('Error fetching contacts', err);
      setContacts([]);
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
      const contactRes = await api.get(`/contacts/${id}`);
      const contactData: Contact = contactRes.data;
      setDetail(contactData);

      const [companyRes, dealsRes, ticketsRes] = await Promise.all([
        contactData.companyId ? api.get(`/companies/${contactData.companyId}`) : Promise.resolve(null),
        api.get(`/deals/search?contactId=${id}&size=50`),
        api.get(`/tickets/search?contactId=${id}&size=50`),
      ]);
      setCompany(companyRes?.data || null);
      setDeals(dealsRes.data.content || []);
      setTickets(ticketsRes.data.content || []);
    } catch (err) {
      console.error('Error fetching contact detail', err);
      setDetailError(t('contacts.errorSaving'));
    } finally {
      setDetailLoading(false);
    }
  }

  const handleOpenModal = (contact?: Contact) => {
    setEditingContact(contact || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleContactSaved = (savedContact: Contact) => {
    fetchContacts();
    if (savedContact.id === id) fetchDetail();
  };

  const performDelete = async (confirmed: boolean) => {
    const targetId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!confirmed || !targetId) return;
    try {
      await api.delete(`/contacts/${targetId}`);
      fetchContacts();
      if (targetId === id) navigate('/contacts');
    } catch (err) {
      console.error('Error deleting contact', err);
      setDetailError(t('contacts.errorDeleting'));
    }
  };

  return (
    <>
      <div className={splitStyles.page}>
        <div className="page-header">
          <h1 className="page-title">{t('contacts.title')}</h1>
          <div className="toolbar-actions">
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              {t('contacts.createContact')}
            </button>
          </div>
        </div>

        <SplitViewShell
          hasSelection={!!id}
          left={
            <>
              <div className={splitStyles.listPaneHeader}>
                <span className={splitStyles.listPaneTitle}>{t('contacts.title')}</span>
                <CollapsibleSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={`${t('common.search')} ${t('contacts.title').toLowerCase()}...`}
                />
              </div>

              <div
                className={splitStyles.listPaneBody}
                ref={listBodyRef}
                style={rowHeight ? ({ '--row-height': `${rowHeight}px` } as React.CSSProperties) : undefined}
              >
                {detail && id && !contacts.some((contact) => contact.id === id) && (
                  <div className={splitStyles.notInPageBanner}>
                    <span>{t('common.notInCurrentPage')}</span>
                    <button
                      type="button"
                      className={splitStyles.notInPageBannerButton}
                      onClick={() => setSearchTerm(detail.name)}
                    >
                      {t('buttons.locate')}
                    </button>
                  </div>
                )}
                {contacts.map((contact) => (
                  <RecordListRow
                    key={contact.id}
                    to={`/contacts/${contact.id}`}
                    isActive={contact.id === id}
                    primary={contact.name}
                    secondary={contact.email || contact.alias}
                  />
                ))}
                {!loading && contacts.length === 0 && (
                  <p className="empty-state">{t('contacts.noContacts')}</p>
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
                subtitle={detail?.email}
                loading={detailLoading}
                error={detailError}
                onEdit={detail ? () => handleOpenModal(detail) : undefined}
                onDelete={detail ? () => setConfirmDeleteId(id) : undefined}
              >
                <div className={`card ${paneStyles.relatedCard}`}>
                  <div className={paneStyles.infoGrid}>
                    <div className={paneStyles.infoField}>
                      <span className={paneStyles.infoLabel}>{t('contacts.alias')}</span>
                      <span className={paneStyles.infoValue}>{detail?.alias || '-'}</span>
                    </div>
                    <div className={paneStyles.infoField}>
                      <span className={paneStyles.infoLabel}>{t('contacts.phone')}</span>
                      <span className={paneStyles.infoValue}>{detail?.phone || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className={paneStyles.relatedGrid}>
                  <RelatedSection title={t('contacts.company')} emptyText={t('companies.noCompanies')}>
                    {company && <RelatedItem to={`/companies/${company.id}`} primary={company.name} />}
                  </RelatedSection>

                  <RelatedSection
                    title={t('deals.title')}
                    emptyText={t('deals.noDeals')}
                    onCreate={() => setCreateRelatedModal('deal')}
                    createLabel={t('deals.createDeal')}
                  >
                    {deals.map((deal) => (
                      <RelatedItem key={deal.id} to={`/deals/${deal.id}`} primary={deal.title} secondary={abbreviateNumber(deal.amount)} />
                    ))}
                  </RelatedSection>

                  <RelatedSection
                    title={t('tickets.title')}
                    emptyText={t('tickets.noTickets')}
                    onCreate={() => setCreateRelatedModal('ticket')}
                    createLabel={t('tickets.createTicket')}
                  >
                    {tickets.map((ticket) => (
                      <RelatedItem key={ticket.id} to={`/tickets/${ticket.id}`} primary={ticket.title} secondary={ticket.companyName} />
                    ))}
                  </RelatedSection>
                </div>
              </RecordPane>
            ) : (
              <RecordPaneEmptyState text={t('common.selectRecordPrompt')} />
            )
          }
        />
      </div>

      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialContact={editingContact}
        onContactSaved={handleContactSaved}
      />

      <DealModal
        isOpen={createRelatedModal === 'deal'}
        onClose={() => setCreateRelatedModal(null)}
        presetContactId={id}
        presetCompanyId={company?.id}
        onDealSaved={() => {
          setCreateRelatedModal(null);
          fetchDetail();
        }}
      />

      <TicketModal
        isOpen={createRelatedModal === 'ticket'}
        onClose={() => setCreateRelatedModal(null)}
        presetContactId={id}
        presetCompanyId={company?.id}
        onTicketSaved={() => {
          setCreateRelatedModal(null);
          fetchDetail();
        }}
      />

      <ConfirmModal
        isOpen={confirmDeleteId != null}
        title={''}
        message={t('contacts.deleteConfirm')}
        onConfirm={performDelete}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />
    </>
  );
};
