import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from './Modal';
import Input from './Input';
import Textarea from './Textarea';
import { CompanyCombobox } from './CompanyCombobox';
import { ContactCombobox } from './ContactCombobox';
import { SimpleDropdown } from './SimpleDropdown';
import { CurrencyInput } from './CurrencyInput';
import styles from './FinancialEntryModal.module.css';

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
  entryId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'details' | 'installments';

const todayIso = () => new Date().toISOString().slice(0, 10);

export const FinancialEntryModal: React.FC<FinancialEntryModalProps> = ({ isOpen, type, entryId, onClose, onSaved }) => {
  const { t } = useTranslation();
  const isEdit = !!entryId;

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [canRegenerate, setCanRegenerate] = useState(true);

  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [installmentCount, setInstallmentCount] = useState('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(todayIso());
  const [recurrence, setRecurrence] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [notes, setNotes] = useState('');

  const [installments, setInstallments] = useState<InstallmentPreview[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const tabContentRef = useRef<HTMLDivElement>(null);
  const [tabHeight, setTabHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('details');
    setError('');
    setCanRegenerate(true);
    setTabHeight(undefined);

    api.get(`/financial/categories?type=${type}`)
      .then(res => setCategories(res.data || []))
      .catch(err => console.error('Error fetching categories', err));

    if (entryId) {
      setLoadingEntry(true);
      api.get(`/financial/entries/${entryId}`)
        .then(res => {
          const data = res.data;
          setDescription(data.description || '');
          setCategoryId(data.categoryId || '');
          setCompanyId(data.companyId || '');
          setContactId(data.contactId || '');
          setTotalAmount(Number(data.totalAmount) || 0);
          setInstallmentCount(String(data.installmentCount ?? 1));
          setFirstInstallmentDate(data.firstInstallmentDate ? data.firstInstallmentDate.slice(0, 10) : todayIso());
          setRecurrence((data.recurrence as 'MONTHLY' | 'WEEKLY') || 'MONTHLY');
          setNotes(data.notes || '');
          setCanRegenerate(Boolean(data.canRegenerate));

          if (!data.canRegenerate) {
            api.get(`/financial/installments/search?entryId=${entryId}&size=360`)
              .then(instRes => {
                const items = (instRes.data.content || []).map((i: any) => ({
                  installmentNumber: i.installmentNumber,
                  dueDate: i.dueDate,
                  amount: i.amount
                }));
                setInstallments(items);
              })
              .catch(err => console.error('Error fetching entry installments', err));
          }
        })
        .catch(err => console.error('Error fetching entry', err))
        .finally(() => setLoadingEntry(false));
    } else {
      setDescription('');
      setCategoryId('');
      setCompanyId('');
      setContactId('');
      setTotalAmount(0);
      setInstallmentCount('1');
      setFirstInstallmentDate(todayIso());
      setRecurrence('MONTHLY');
      setNotes('');
      setInstallments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, entryId]);

  const generatePreview = async () => {
    const count = parseInt(installmentCount, 10) || 1;
    if (!totalAmount || totalAmount <= 0 || !firstInstallmentDate) {
      setInstallments([]);
      return;
    }
    try {
      const response = await api.post('/financial/entries/preview', {
        totalAmount,
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
    if (!isOpen || loadingEntry || !canRegenerate) return;
    generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, installmentCount, firstInstallmentDate, recurrence, isOpen, loadingEntry, canRegenerate]);

  // Locks the "Parcelas" tab to the natural height of the "Dados" tab, so
  // switching tabs never resizes the modal - only the installments table
  // scrolls internally if it would otherwise be taller than that.
  useLayoutEffect(() => {
    if (!isOpen || activeTab !== 'details' || loadingEntry || !tabContentRef.current) return;
    setTabHeight(tabContentRef.current.offsetHeight);
  }, [isOpen, activeTab, loadingEntry, categories, isEdit, canRegenerate]);

  const updateInstallmentDate = (index: number, value: string) => {
    setInstallments(prev => prev.map((i, idx) => idx === index ? { ...i, dueDate: value } : i));
  };

  const updateInstallmentAmount = (index: number, value: number) => {
    setInstallments(prev => prev.map((i, idx) => idx === index ? { ...i, amount: value } : i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (canRegenerate && installments.length === 0) {
      setError(t('financial.errorNoInstallments'));
      return;
    }

    setSaving(true);
    try {
      if (isEdit && canRegenerate) {
        await api.post(`/financial/entries/${entryId}/regenerate`, {
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
      } else if (isEdit) {
        await api.put(`/financial/entries/${entryId}`, {
          type,
          description,
          categoryId: categoryId || null,
          companyId: companyId || null,
          contactId: contactId || null,
          totalAmount,
          installmentCount: parseInt(installmentCount, 10) || 1,
          firstInstallmentDate,
          recurrence: recurrence || null,
          notes
        });
      } else {
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
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving entry', err);
      setError(t('financial.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit
    ? t('financial.editEntry')
    : (type === 'INCOME' ? t('financial.newIncome') : t('financial.newExpense'));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} contentClassName={styles.wide}>
      {isEdit && loadingEntry ? (
        <div className="page-loading">{t('common.loading')}</div>
      ) : (
        <form autoComplete="off" onSubmit={handleSubmit}>
          {isEdit && !canRegenerate && (
            <p className={styles.readonlyNotice}>{t('financial.regenerateBlocked')}</p>
          )}

          <div className={`selector-options ${styles.tabs}`}>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`selector-button selector-button--surface ${activeTab === 'details' ? 'selector-button--active' : 'selector-button--inactive'}`}
            >
              {t('financial.tabDetails')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('installments')}
              className={`selector-button selector-button--surface ${activeTab === 'installments' ? 'selector-button--active' : 'selector-button--inactive'}`}
            >
              {t('financial.tabInstallments')}{installments.length > 0 ? ` (${installments.length})` : ''}
            </button>
          </div>

          <div
            ref={tabContentRef}
            className={activeTab === 'installments' ? styles.tabPanelScroll : undefined}
            style={activeTab === 'installments' && tabHeight ? { height: tabHeight } : undefined}
          >
            {activeTab === 'details' && (
              <>
                <Input required label={t('financial.description')} value={description} onChange={e => setDescription(e.target.value)} />

                <SimpleDropdown
                  label={t('financial.category')}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder={t('financial.noCategory')}
                  options={[{ id: '', name: t('financial.noCategory') }, ...categories.map(c => ({ id: c.id, name: c.name }))]}
                />

                <div className={styles.fieldRow}>
                  <CompanyCombobox value={companyId} onChange={setCompanyId} />
                  <ContactCombobox value={contactId} onChange={setContactId} companyId={companyId} />
                </div>

                <div className={styles.fieldRow}>
                  <CurrencyInput required disabled={!canRegenerate} label={t('financial.totalAmount')} value={totalAmount} onChange={setTotalAmount} />
                  <Input required disabled={!canRegenerate} label={t('financial.installmentCount')} type="number" min="1" max="360" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} />
                  <Input required disabled={!canRegenerate} label={t('financial.firstInstallmentDate')} type="date" value={firstInstallmentDate} onChange={e => setFirstInstallmentDate(e.target.value)} />
                  <SimpleDropdown
                    label={t('financial.recurrence')}
                    value={recurrence}
                    onChange={value => setRecurrence(value as 'MONTHLY' | 'WEEKLY')}
                    options={[
                      { id: 'MONTHLY', name: t('financial.monthly') },
                      { id: 'WEEKLY', name: t('financial.weekly') }
                    ]}
                  />
                </div>

                <Textarea label={t('financial.notes')} value={notes} onChange={e => setNotes(e.target.value)} />
              </>
            )}

            {activeTab === 'installments' && (
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
                          {canRegenerate ? (
                            <input
                              type="date"
                              className="input-field"
                              value={i.dueDate.slice(0, 10)}
                              onChange={e => updateInstallmentDate(index, e.target.value)}
                            />
                          ) : i.dueDate.slice(0, 10)}
                        </td>
                        <td>
                          {canRegenerate ? (
                            <CurrencyInput value={i.amount} onChange={value => updateInstallmentAmount(index, value)} />
                          ) : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.amount)}
                        </td>
                      </tr>
                    ))}
                    {installments.length === 0 && (
                      <tr>
                        <td colSpan={3} className="empty-state">{t('financial.noInstallments')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error && <div className="form-feedback">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{t('common.save')}</button>
          </div>
        </form>
      )}
    </Modal>
  );
};
