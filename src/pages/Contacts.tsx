import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { CompanyCombobox } from '../components/CompanyCombobox';
import { SplitViewShell, RecordListRow, CollapsibleSearchBar } from '../components/SplitViewShell';
import { RecordPane, RecordPaneEmptyState, RelatedItem, RelatedSection } from '../components/RecordPane';
import Input from '../components/Input';
import { abbreviateNumber } from '../utils/numberUtils';
import splitStyles from '../components/SplitViewShell.module.css';
import paneStyles from '../components/RecordPane.module.css';

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

const emptyContact: Contact = { name: '', alias: '', email: '', phone: '', companyId: '' };

export const Contacts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const size = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Contact>(emptyContact);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [detail, setDetail] = useState<Contact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [deals, setDeals] = useState<RelatedDeal[]>([]);
  const [tickets, setTickets] = useState<RelatedTicket[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (page !== 0) setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchContacts();
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchContacts() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (debouncedSearch) queryParams.append('name', debouncedSearch);
      const response = await api.get(`/contacts/search?${queryParams.toString()}`);
      setContacts(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
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
    setFormData(contact || emptyContact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/contacts', formData);
      fetchContacts();
      if (formData.id === id) fetchDetail();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving contact', err);
      setError(t('contacts.errorSaving'));
    }
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
      setError(t('contacts.errorDeleting'));
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

              <div className={splitStyles.listPaneBody}>
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

                  <RelatedSection title={t('deals.title')} emptyText={t('deals.noDeals')}>
                    {deals.map((deal) => (
                      <RelatedItem key={deal.id} to={`/deals/${deal.id}`} primary={deal.title} secondary={abbreviateNumber(deal.amount)} />
                    ))}
                  </RelatedSection>

                  <RelatedSection title={t('tickets.title')} emptyText={t('tickets.noTickets')}>
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingContact ? t('contacts.editContact') : t('contacts.createContact')}>
        <form autoComplete="off" onSubmit={handleSubmit}>
          <Input required label={t('contacts.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <Input label={t('contacts.alias')} value={formData.alias} onChange={(e) => setFormData({ ...formData, alias: e.target.value })} />
          <Input type="email" label={t('contacts.email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label={t('contacts.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <CompanyCombobox value={formData.companyId} onChange={(companyId) => setFormData({ ...formData, companyId })} />

          {error && <div className="form-feedback">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

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
