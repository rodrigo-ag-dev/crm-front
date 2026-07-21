import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from './Modal';
import { CompanyCombobox } from './CompanyCombobox';
import { ContactCombobox } from './ContactCombobox';
import { SimpleDropdown } from './SimpleDropdown';
import Input from './Input';
import Textarea from './Textarea';
import {
  getInitialTicketStageId,
  getTicketStages,
  sortTicketStages,
  type TicketStageOption,
} from '../services/ticketStageService';

export interface Ticket {
  id?: string;
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
  ownerId?: string;
  ticketStageId: string;
  canceledStageId?: string;
  title: string;
  description: string;
  dueDate: string;
  closedAt: string;
  canceledAt: string;
  canceled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const emptyTicket = (ticketStageId = ''): Ticket => ({
  companyId: '',
  companyName: '',
  contactId: '',
  contactName: '',
  ownerId: '',
  ticketStageId,
  canceledStageId: '',
  title: '',
  description: '',
  dueDate: '',
  closedAt: '',
  canceledAt: '',
  canceled: false,
});

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeInputValue = (value: string) => {
  return value ? `${value}:00` : null;
};

const mapTicketToForm = (ticket: Ticket, defaultTicketStageId = ''): Ticket => ({
  ...emptyTicket(),
  ...ticket,
  companyId: ticket.companyId || '',
  companyName: ticket.companyName || '',
  contactId: ticket.contactId || '',
  contactName: ticket.contactName || '',
  ownerId: ticket.ownerId || '',
  ticketStageId: ticket.ticketStageId || defaultTicketStageId,
  canceledStageId: ticket.canceledStageId || '',
  title: ticket.title || '',
  description: ticket.description || '',
  dueDate: toDateTimeInputValue(ticket.dueDate),
  closedAt: toDateTimeInputValue(ticket.closedAt),
  canceledAt: toDateTimeInputValue(ticket.canceledAt),
  canceled: Boolean(ticket.canceled),
});

const buildPayload = (ticket: Ticket) => ({
  companyId: ticket.companyId,
  companyName: ticket.companyName,
  contactId: ticket.contactId,
  contactName: ticket.contactName,
  ownerId: ticket.ownerId || null,
  ticketStageId: ticket.ticketStageId,
  canceledStageId: ticket.canceledStageId || null,
  title: ticket.title,
  description: ticket.description || null,
  dueDate: fromDateTimeInputValue(ticket.dueDate),
  closedAt: fromDateTimeInputValue(ticket.closedAt),
  canceledAt: fromDateTimeInputValue(ticket.canceledAt),
  canceled: ticket.canceled ?? false,
});

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketSaved?: (ticket: Ticket) => void;
  initialTicket?: Ticket | null;
  presetCompanyId?: string;
  presetContactId?: string;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  onTicketSaved,
  initialTicket = null,
  presetCompanyId,
  presetContactId,
}) => {
  const { t } = useTranslation();
  const [ticketStages, setTicketStages] = useState<TicketStageOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Ticket>(emptyTicket());
  const [errorMessage, setErrorMessage] = useState('');

  const sortedTicketStages = sortTicketStages(ticketStages);
  const defaultTicketStageId = getInitialTicketStageId(ticketStages);

  useEffect(() => {
    const fetchTicketStages = async () => {
      try {
        const response = await getTicketStages();
        setTicketStages(response.data || []);
      } catch (error) {
        console.error('Error fetching ticket stages', error);
        setTicketStages([]);
      }
    };
    fetchTicketStages();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    if (initialTicket) {
      setFormData(mapTicketToForm(initialTicket, defaultTicketStageId));
    } else {
      setFormData({
        ...emptyTicket(defaultTicketStageId),
        companyId: presetCompanyId || '',
        contactId: presetContactId || '',
      });
    }
  }, [isOpen, initialTicket, presetCompanyId, presetContactId]);

  const handleClose = () => {
    setErrorMessage('');
    onClose();
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    let savedSuccessfully = false;
    try {
      const payload = buildPayload(formData);

      const response = initialTicket?.id
        ? await api.put(`/tickets/${initialTicket.id}`, payload)
        : await api.post('/tickets', payload);

      const savedTicket = response.data as Ticket;
      onTicketSaved?.(savedTicket);
      savedSuccessfully = true;
    } catch (error) {
      console.error('Error saving ticket', error);
      setErrorMessage(t('tickets.errorSaving'));
    } finally {
      setSaving(false);
      if (savedSuccessfully) {
        handleClose();
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialTicket ? t('tickets.editTicket') : t('tickets.createTicket')}
    >
      <form autoComplete="off" onSubmit={handleSave}>
        <Input
          required
          label={t('tickets.titleField')}
          value={formData.title}
          onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
        />

        <Textarea
          label={t('tickets.description')}
          rows={4}
          value={formData.description}
          onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
        />

        <div className="form-grid-two">
          <Input
            type="datetime-local"
            label={t('tickets.dueDate')}
            value={formData.dueDate}
            onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
          />
          <SimpleDropdown
            label={t('tickets.stage')}
            value={formData.ticketStageId}
            onChange={(id) => setFormData((current) => ({ ...current, ticketStageId: id }))}
            options={sortedTicketStages.map((stage) => ({ id: stage.id, name: stage.name }))}
          />
        </div>

        <div className="form-grid-two">
          <CompanyCombobox
            value={formData.companyId}
            onChange={(id) => setFormData((current) => ({ ...current, companyId: id }))}
          />
          <ContactCombobox
            value={formData.contactId}
            onChange={(id) => setFormData((current) => ({ ...current, contactId: id }))}
          />
        </div>

        {errorMessage && <div className="form-feedback">{errorMessage}</div>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
