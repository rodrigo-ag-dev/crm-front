import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from './Modal';
import { CompanyCombobox } from './CompanyCombobox';
import Input from './Input';

export interface Contact {
  id?: string;
  companyId: string;
  name: string;
  alias: string;
  email: string;
  phone: string;
}

const emptyContact = (companyId = ''): Contact => ({
  name: '',
  alias: '',
  email: '',
  phone: '',
  companyId,
});

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactSaved?: (contact: Contact) => void;
  initialContact?: Contact | null;
  presetCompanyId?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  onContactSaved,
  initialContact = null,
  presetCompanyId,
}) => {
  const { t } = useTranslation();
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Contact>(emptyContact());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (initialContact) {
      setEditingContact(initialContact);
      setFormData(initialContact);
    } else {
      setEditingContact(null);
      setFormData(emptyContact(presetCompanyId));
    }
  }, [isOpen, initialContact, presetCompanyId]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const response = await api.post('/contacts', formData);
      onContactSaved?.(response.data as Contact);
      handleClose();
    } catch (err) {
      console.error('Error saving contact', err);
      setError(t('contacts.errorSaving'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editingContact ? t('contacts.editContact') : t('contacts.createContact')}>
      <form autoComplete="off" onSubmit={handleSubmit}>
        <Input required label={t('contacts.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <Input label={t('contacts.alias')} value={formData.alias} onChange={(e) => setFormData({ ...formData, alias: e.target.value })} />
        <Input type="email" label={t('contacts.email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        <Input label={t('contacts.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        <CompanyCombobox value={formData.companyId} onChange={(companyId) => setFormData({ ...formData, companyId })} />

        {error && <div className="form-feedback">{error}</div>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary">{t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
};
