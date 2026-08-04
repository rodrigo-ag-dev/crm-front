import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from './Modal';
import Input from './Input';
import Textarea from './Textarea';
import { CompanyCombobox } from './CompanyCombobox';
import { ContactCombobox } from './ContactCombobox';
import { SimpleDropdown } from './SimpleDropdown';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
}

interface InstallmentPreview {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

interface FinancialEntryModalProps {
  isOpen: boolean;
  type: 'INCOME' | 'EXPENSE';
  onClose: () => void;
  onSaved: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const FinancialEntryModal: React.FC<FinancialEntryModalProps> = ({ isOpen, type, onClose, onSaved }) => {
  const { t } = useTranslation();

  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(todayIso());
  const [recurrence, setRecurrence] = useState<'' | 'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [notes, setNotes] = useState('');

  const [installments, setInstallments] = useState<InstallmentPreview[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDescription('');
    setCategoryId('');
    setCompanyId('');
    setContactId('');
    setTotalAmount('');
    setInstallmentCount('1');
    setFirstInstallmentDate(todayIso());
    setRecurrence('MONTHLY');
    setNotes('');
    setInstallments([]);
    setError('');

    api.get(`/financial/categories?type=${type}`)
      .then(res => setCategories(res.data || []))
      .catch(err => console.error('Error fetching categories', err));
  }, [isOpen, type]);

  const generatePreview = async () => {
    const amount = parseFloat(totalAmount.replace(',', '.'));
    const count = parseInt(installmentCount, 10) || 1;
    if (!amount || amount <= 0 || !firstInstallmentDate) {
      setInstallments([]);
      return;
    }
    try {
      const response = await api.post('/financial/entries/preview', {
        totalAmount: amount,
        installmentCount: count,
        firstInstallmentDate,
        recurrence: recurrence || null
      });
      setInstallments(response.data);
    } catch (err) {
      console.error('Error generating preview', err);
    }
  };

  useEffect(() => {
    if (isOpen) generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, installmentCount, firstInstallmentDate, recurrence, isOpen]);

  const updateInstallment = (index: number, field: 'dueDate' | 'amount', value: string) => {
    setInstallments(prev => prev.map((i, idx) => idx === index
      ? { ...i, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
      : i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (installments.length === 0) {
      setError(t('financial.errorNoInstallments'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/financial/entries', {
        type,
        description,
        categoryId: categoryId || null,
        companyId: companyId || null,
        contactId: contactId || null,
        totalAmount: installments.reduce((sum, i) => sum + i.amount, 0),
        installmentCount: installments.length,
        firstInstallmentDate,
        recurrence: recurrence || null,
        notes,
        installments
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving entry', err);
      setError(t('financial.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const title = type === 'INCOME' ? t('financial.newIncome') : t('financial.newExpense');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form autoComplete="off" onSubmit={handleSubmit}>
        <Input required label={t('financial.description')} value={description} onChange={e => setDescription(e.target.value)} />

        <SimpleDropdown
          label={t('financial.category')}
          value={categoryId}
          onChange={setCategoryId}
          placeholder={t('financial.noCategory')}
          options={[{ id: '', name: t('financial.noCategory') }, ...categories.map(c => ({ id: c.id, name: c.name }))]}
        />

        <CompanyCombobox value={companyId} onChange={setCompanyId} />
        <ContactCombobox value={contactId} onChange={setContactId} companyId={companyId} />

        <Input required label={t('financial.totalAmount')} type="number" step="0.01" min="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
        <Input required label={t('financial.installmentCount')} type="number" min="1" max="360" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} />
        <Input required label={t('financial.firstInstallmentDate')} type="date" value={firstInstallmentDate} onChange={e => setFirstInstallmentDate(e.target.value)} />

        <SimpleDropdown
          label={t('financial.recurrence')}
          value={recurrence}
          onChange={value => setRecurrence(value as 'MONTHLY' | 'WEEKLY')}
          options={[
            { id: 'MONTHLY', name: t('financial.monthly') },
            { id: 'WEEKLY', name: t('financial.weekly') }
          ]}
        />

        <Textarea label={t('financial.notes')} value={notes} onChange={e => setNotes(e.target.value)} />

        {installments.length > 0 && (
          <div className="form-group">
            <label className="form-label">{t('financial.installmentsPreview')}</label>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('financial.dueDate')}</th>
                    <th>{t('financial.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((i, index) => (
                    <tr key={index}>
                      <td>{i.installmentNumber}/{installments.length}</td>
                      <td>
                        <input
                          type="date"
                          className="input-field"
                          value={i.dueDate.slice(0, 10)}
                          onChange={e => updateInstallment(index, 'dueDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="input-field"
                          value={i.amount}
                          onChange={e => updateInstallment(index, 'amount', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <div className="form-feedback">{error}</div>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
};
