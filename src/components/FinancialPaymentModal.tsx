import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from './Modal';
import Input from './Input';
import { abbreviateNumber } from '../utils/numberUtils';

interface InstallmentTarget {
  id: string;
  amount: number;
}

interface FinancialPaymentModalProps {
  isOpen: boolean;
  installments: InstallmentTarget[];
  onClose: () => void;
  onSaved: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const FinancialPaymentModal: React.FC<FinancialPaymentModalProps> = ({ isOpen, installments, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [interestAmount, setInterestAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSingle = installments.length === 1;

  useEffect(() => {
    if (!isOpen) return;
    setPaymentDate(todayIso());
    setInterestAmount('0');
    setDiscountAmount('0');
    setPaymentMethod('');
    setError('');
  }, [isOpen, installments]);

  const interest = parseFloat(interestAmount.replace(',', '.')) || 0;
  const discount = parseFloat(discountAmount.replace(',', '.')) || 0;
  const totalToPay = isSingle ? installments[0].amount + interest - discount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isSingle) {
        await api.post(`/financial/installments/${installments[0].id}/pay`, {
          paymentDate,
          interestAmount: interest,
          discountAmount: discount,
          paymentMethod: paymentMethod || null
        });
      } else {
        await api.post('/financial/installments/pay-batch', {
          installmentIds: installments.map(i => i.id),
          paymentDate,
          paymentMethod: paymentMethod || null
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error paying installment(s)', err);
      setError(t('financial.errorPayment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isSingle ? t('financial.markAsPaid') : t('financial.markSelectedAsPaid')}>
      <form autoComplete="off" onSubmit={handleSubmit}>
        {!isSingle && (
          <p className="text-secondary">{t('financial.batchPaymentInfo', { count: installments.length })}</p>
        )}

        <Input required label={t('financial.paymentDate')} type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />

        {isSingle && (
          <>
            <div className="form-group">
              <label className="form-label">{t('financial.originalAmount')}</label>
              <div className="input-field" style={{ background: 'var(--bg-color)' }}>{abbreviateNumber(installments[0].amount)}</div>
            </div>
            <Input label={t('financial.interestAmount')} type="number" step="0.01" min="0" value={interestAmount} onChange={e => setInterestAmount(e.target.value)} />
            <Input label={t('financial.discountAmount')} type="number" step="0.01" min="0" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
            <div className="form-group">
              <label className="form-label">{t('financial.totalToPay')}</label>
              <div className="input-field" style={{ background: 'var(--bg-color)', fontWeight: 600 }}>{abbreviateNumber(totalToPay)}</div>
            </div>
          </>
        )}

        <Input label={t('financial.paymentMethod')} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} />

        {error && <div className="form-feedback">{error}</div>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
};
