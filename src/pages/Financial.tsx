import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckSquare, CircleDollarSign, Edit2, RotateCcw, Wallet, XCircle } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useFittedPageSize } from '../hooks/useFittedPageSize';
import { DataTablePage } from '../components/DataTablePage';
import { FinancialEntryModal } from '../components/FinancialEntryModal';
import { FinancialPaymentModal } from '../components/FinancialPaymentModal';
import { FinancialTypeToggle } from '../components/FinancialTypeToggle';
import { ConfirmModal } from '../components/ConfirmModal';
import { MetricCard } from '../components/MetricCard';
import { abbreviateNumber } from '../utils/numberUtils';
import { toFormatedDate } from '../utils/dateUtils';
import styles from './Financial.module.css';

type EntryType = 'INCOME' | 'EXPENSE';
type StatusFilter = '' | 'PENDING' | 'OVERDUE' | 'PAID' | 'CANCELED';

interface Installment {
  id: string;
  entryId: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'CANCELED';
  description: string;
  categoryName?: string;
  companyName?: string;
  contactName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'var(--text-secondary)',
  OVERDUE: 'var(--danger-color)',
  PAID: 'var(--primary-color)',
  CANCELED: 'var(--text-light)'
};

interface Totals {
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
  openCount: number;
  openAmount: number;
  paidThisMonthAmount: number;
}

const emptyTotals: Totals = {
  overdueCount: 0,
  overdueAmount: 0,
  upcomingCount: 0,
  upcomingAmount: 0,
  openCount: 0,
  openAmount: 0,
  paidThisMonthAmount: 0
};

const readTypeParam = (searchParams: URLSearchParams): EntryType =>
  searchParams.get('type') === 'INCOME' ? 'INCOME' : 'EXPENSE';

export const Financial: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setTypeState] = useState<EntryType>(() => readTypeParam(searchParams));
  const [status, setStatus] = useState<StatusFilter>('');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { size } = useFittedPageSize(scrollAreaRef, installments.length, 15);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; amount: number }[] | null>(null);
  const [reverseTargetId, setReverseTargetId] = useState<string | null>(null);

  const [totals, setTotals] = useState<Totals>(emptyTotals);
  const [loadingTotals, setLoadingTotals] = useState(true);

  // Keeps `type` in sync with the URL: reacts to navigation with a
  // different ?type= (e.g. the Dashboard's totals cards) even while this
  // page is already mounted, since a lazy useState initializer alone would
  // only run once on first mount.
  useEffect(() => {
    setTypeState(readTypeParam(searchParams));
  }, [searchParams]);

  const setType = (value: EntryType) => {
    setTypeState(value);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('type', value);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [type, status]);

  useEffect(() => {
    fetchInstallments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, page, size]);

  useEffect(() => {
    fetchTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const fetchInstallments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, page: page.toString(), size: size.toString() });
      if (status) params.append('status', status);
      const response = await api.get(`/financial/installments/search?${params.toString()}`);
      const total = response.data.totalPages || 0;
      setInstallments(response.data.content || []);
      setTotalPages(total);
      if (page > 0 && page >= total) setPage(Math.max(0, total - 1));
    } catch (err) {
      console.error('Error fetching installments', err);
      setInstallments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotals = async () => {
    setLoadingTotals(true);
    try {
      const response = await api.get(`/financial/installments/totals?type=${type}`);
      setTotals(response.data || emptyTotals);
    } catch (err) {
      console.error('Error fetching totals', err);
      setTotals(emptyTotals);
    } finally {
      setLoadingTotals(false);
    }
  };

  const refresh = () => {
    fetchInstallments();
    fetchTotals();
  };

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/financial/installments/${id}/cancel`);
      refresh();
    } catch (err) {
      console.error('Error canceling installment', err);
      setError(t('financial.errorCanceling'));
    }
  };

  const handleReverse = async (confirmed: boolean) => {
    const targetId = reverseTargetId;
    setReverseTargetId(null);
    if (!confirmed || !targetId) return;
    try {
      await api.post(`/financial/installments/${targetId}/reverse`);
      refresh();
    } catch (err) {
      console.error('Error reversing installment payment', err);
      setError(t('financial.errorReverse'));
    }
  };

  const handleEntrySaved = () => {
    setEditingEntryId(null);
    refresh();
  };

  const selectedInstallments = installments.filter(i => selected.has(i.id)).map(i => ({ id: i.id, amount: i.amount }));

  return (
    <>
      <div className={styles.pageRoot}>
        <div className={styles.totalsGrid}>
          <MetricCard
            icon={AlertTriangle}
            colorVar="--danger-color"
            label={t('financial.overdueTotalLabel')}
            value={`${abbreviateNumber(totals.overdueAmount)} (${totals.overdueCount})`}
            loading={loadingTotals}
            onClick={() => setStatus('OVERDUE')}
            active={status === 'OVERDUE'}
          />
          <MetricCard
            icon={CalendarClock}
            colorVar="--warning-color"
            label={t('financial.upcomingTotalLabel')}
            value={`${abbreviateNumber(totals.upcomingAmount)} (${totals.upcomingCount})`}
            loading={loadingTotals}
            onClick={() => setStatus('PENDING')}
            active={status === 'PENDING'}
          />
          <MetricCard
            icon={Wallet}
            colorVar="--secondary-color"
            label={t('financial.openTotalLabel')}
            value={`${abbreviateNumber(totals.openAmount)} (${totals.openCount})`}
            loading={loadingTotals}
            onClick={() => setStatus('')}
            active={status === ''}
          />
          <MetricCard
            icon={CircleDollarSign}
            colorVar="--success-color"
            label={t('financial.paidThisMonthLabel')}
            value={abbreviateNumber(totals.paidThisMonthAmount)}
            loading={loadingTotals}
            onClick={() => setStatus('PAID')}
            active={status === 'PAID'}
          />
        </div>

        <div className={styles.tableWrapper}>
          <DataTablePage
            title={t('financial.title')}
            primaryActionText={type === 'INCOME' ? t('financial.newIncome') : t('financial.newExpense')}
            onPrimaryAction={() => setIsEntryModalOpen(true)}
            loading={loading}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            error={error}
            scrollAreaRef={scrollAreaRef}
            titleActions={
              <>
                <FinancialTypeToggle value={type} onChange={setType} />
                <select className="input-field" style={{ maxWidth: 180 }} value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
                  <option value="">{t('financial.allStatuses')}</option>
                  <option value="PENDING">{t('financial.pending')}</option>
                  <option value="OVERDUE">{t('financial.overdue')}</option>
                  <option value="PAID">{t('financial.paid')}</option>
                  <option value="CANCELED">{t('financial.canceled')}</option>
                </select>
                {selected.size > 0 && (
                  <button type="button" className="btn-primary" onClick={() => setPaymentTarget(selectedInstallments)}>
                    <CheckSquare size={16} />
                    {t('financial.markSelectedAsPaid')} ({selected.size})
                  </button>
                )}
              </>
            }
            tableHeaders={
              <>
                <th></th>
                <th>{t('financial.description')}</th>
                <th>{t('financial.category')}</th>
                <th>{t('financial.installment')}</th>
                <th>{t('financial.dueDate')}</th>
                <th className="table-header-actions--right">{t('financial.amount')}</th>
                <th>{t('financial.status')}</th>
                <th className="table-header-actions">{t('common.actions')}</th>
              </>
            }
            skeletonColumns={8}
          >
            {installments.map(installment => (
              <tr key={installment.id} data-record-row>
                <td>
                  {installment.status !== 'PAID' && installment.status !== 'CANCELED' && (
                    <input
                      type="checkbox"
                      checked={selected.has(installment.id)}
                      onChange={() => toggleSelected(installment.id)}
                    />
                  )}
                </td>
                <td>
                  <strong>{installment.description}</strong>
                  {(installment.companyName || installment.contactName) && (
                    <div className="text-secondary"><small>{installment.companyName || installment.contactName}</small></div>
                  )}
                </td>
                <td>{installment.categoryName || '-'}</td>
                <td>{installment.installmentNumber}/{installment.totalInstallments}</td>
                <td>{toFormatedDate(installment.dueDate)}</td>
                <td className="table-cell-right">{abbreviateNumber(installment.amount)}</td>
                <td>
                  <span className="badge" style={{ color: STATUS_COLORS[installment.status], borderColor: STATUS_COLORS[installment.status] }}>
                    {t(`financial.${installment.status.toLowerCase()}`)}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    {installment.status !== 'PAID' && installment.status !== 'CANCELED' && (
                      <>
                        <button onClick={() => setPaymentTarget([{ id: installment.id, amount: installment.amount }])} className="btn-icon" title={t('financial.markAsPaid')}>
                          <CheckSquare size={18} />
                        </button>
                        <button onClick={() => setEditingEntryId(installment.entryId)} className="btn-icon" title={t('financial.editEntry')}>
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleCancel(installment.id)} className="btn-icon-danger" title={t('common.cancel')}>
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    {installment.status === 'PAID' && (
                      <button onClick={() => setReverseTargetId(installment.id)} className="btn-icon" title={t('financial.reversePayment')}>
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && installments.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">{t('financial.noInstallments')}</td>
              </tr>
            )}
          </DataTablePage>
        </div>
      </div>

      <FinancialEntryModal
        isOpen={isEntryModalOpen}
        type={type}
        onClose={() => setIsEntryModalOpen(false)}
        onSaved={refresh}
      />

      <FinancialEntryModal
        isOpen={editingEntryId != null}
        type={type}
        entryId={editingEntryId}
        onClose={() => setEditingEntryId(null)}
        onSaved={handleEntrySaved}
      />

      <FinancialPaymentModal
        isOpen={paymentTarget != null}
        installments={paymentTarget || []}
        onClose={() => setPaymentTarget(null)}
        onSaved={() => {
          setSelected(new Set());
          refresh();
        }}
      />

      <ConfirmModal
        isOpen={reverseTargetId != null}
        message={t('financial.reverseConfirm')}
        onConfirm={handleReverse}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />
    </>
  );
};
