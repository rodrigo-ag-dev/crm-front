import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from './Modal';
import { CompanyCombobox } from './CompanyCombobox';
import { StageCombobox } from './StageCombobox';
import { ContactCombobox } from './ContactCombobox';
import Input from './Input';
import Textarea from './Textarea';

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

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDealSaved?: () => void;
  initialDeal?: Deal | null;
  presetCompanyId?: string;
  presetContactId?: string;
}

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  onDealSaved,
  initialDeal = null,
  presetCompanyId,
  presetContactId
}) => {
  const { t } = useTranslation();
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Deal>({
    title: '',
    description: '',
    closeDateExpected: '',
    amount: 0,
    probability: 0,
    companyId: '',
    stageId: '',
    contactId: ''
  });

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialDeal) {
        setEditingDeal(initialDeal);
        setFormData({
          ...initialDeal,
          closeDateExpected: initialDeal.closeDateExpected
            ? initialDeal.closeDateExpected.substring(0, 10)
            : ''
        });
      } else {
        setEditingDeal(null);
        setFormData({
          title: '',
          description: '',
          closeDateExpected: '',
          amount: 0,
          probability: 0,
          companyId: presetCompanyId || '',
          stageId: '',
          contactId: presetContactId || ''
        });
      }
    }
  }, [isOpen, initialDeal, presetCompanyId, presetContactId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData };
      if (payload.closeDateExpected) {
        payload.closeDateExpected = `${payload.closeDateExpected}T00:00:00`;
      }
      await api.post('/deals', payload);
      onDealSaved?.();
      handleClose();
    } catch (err) {
      console.error('Error saving deal', err);
      setError(t('deals.errorSaving'));
    }
  };

  const handleClose = () => {
    setEditingDeal(null);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editingDeal ? t('deals.editDeal') : t('deals.createDeal')} >
      <form autoComplete="off" onSubmit={handleSubmit}>
        {error && <div className="status-message status-message--error">{error}</div>}
        <Input
          required
          label={t('deals.dealName')}
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
        />

        <Textarea label={t('deals.description')} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />

        <Input
          type="date"
          label={t('deals.expectedCloseDate')}
          value={formData.closeDateExpected}
          onChange={e => setFormData({ ...formData, closeDateExpected: e.target.value })}
        />

        <Input
          label={t('deals.amount')}
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.amount || 0)}
          onChange={e => {
            const rawValue = e.target.value.replace(/\D/g, '');
            setFormData({ ...formData, amount: Number(rawValue) / 100 });
          }}
        />

        <Input
          type="number"
          label={t('deals.probability')}
          value={formData.probability}
          onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })}
        />

        <StageCombobox value={formData.stageId} onChange={id => setFormData({ ...formData, stageId: id })} />
        <CompanyCombobox value={formData.companyId} onChange={id => setFormData({ ...formData, companyId: id })} />
        <ContactCombobox value={formData.contactId} onChange={id => setFormData({ ...formData, contactId: id })} />

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
