import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { BarChart3, Users, Building2, Briefcase, TrendingDown, TrendingUp, AlertTriangle, Scale } from 'lucide-react';
import api from '../services/api';
import { abbreviateNumber } from '../utils/numberUtils';
import { toFormatedDate } from '../utils/dateUtils';
import { getTimeGreeting } from '../utils/greetingUtils';
import { RelatedItem, RelatedSection } from '../components/RecordPane';
import { MetricCard } from '../components/MetricCard';
import styles from './Dashboard.module.css';

interface StaleDeal {
  id: string;
  title: string;
  companyName?: string;
  updatedAt: string;
}

interface PendingTicket {
  id: string;
  title: string;
  companyName?: string;
  dueDate: string;
}

const daysSince = (date: string) =>
  Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 3600 * 24));

const isOverdue = (dueDate: string) => new Date(dueDate).getTime() < Date.now();

interface FinancialSummary {
  receivableThisMonth: number;
  payableThisMonth: number;
  overdueReceivable: number;
  overduePayable: number;
  projectedBalance: number;
}

const emptyFinancialSummary: FinancialSummary = {
  receivableThisMonth: 0,
  payableThisMonth: 0,
  overdueReceivable: 0,
  overduePayable: 0,
  projectedBalance: 0,
};

type MetricConfig = {
  key: keyof typeof initialTotals;
  labelKey: string;
  icon: React.ElementType;
  colorVar: string;
  href: string;
};

const initialTotals = { deals: 0, revenueRes: 0, contacts: 0, companies: 0 };

const metrics: MetricConfig[] = [
  { key: 'deals',      labelKey: 'dashboard.totalDeals',     icon: Briefcase,  colorVar: '--secondary-color', href: '/deals' },
  { key: 'contacts',   labelKey: 'dashboard.totalContacts',  icon: Users,      colorVar: '--success-color',   href: '/contacts' },
  { key: 'companies',  labelKey: 'dashboard.totalCompanies', icon: Building2,  colorVar: '--warning-color',   href: '/companies' },
  { key: 'revenueRes', labelKey: 'dashboard.totalRevenue',   icon: BarChart3,  colorVar: '--accent-color',    href: '/deals' },
];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { t } = useTranslation();

  const [totals, setTotals] = useState(initialTotals);
  const [loading, setLoading] = useState(true);
  const [staleDeals, setStaleDeals] = useState<StaleDeal[]>([]);
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [loadingActionable, setLoadingActionable] = useState(true);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(emptyFinancialSummary);
  const [loadingFinancial, setLoadingFinancial] = useState(true);

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const [dealsRes, revenueRes, contactsRes, companiesRes] = await Promise.all([
          api.get('/deals/total'),
          api.get('/deals/revenue'),
          api.get('/contacts/total'),
          api.get('/companies/total'),
        ]);
        setTotals({
          deals: dealsRes.data || 0,
          revenueRes: revenueRes.data || 0,
          contacts: contactsRes.data || 0,
          companies: companiesRes.data || 0,
        });
      } catch {
        // intentional no-op — keep zeros on error
      } finally {
        setLoading(false);
      }
    };
    fetchTotals();
  }, []);

  useEffect(() => {
    const fetchActionable = async () => {
      try {
        const [staleRes, pendingRes] = await Promise.all([
          api.get('/deals/stale'),
          api.get('/tickets/pending'),
        ]);
        setStaleDeals(staleRes.data || []);
        setPendingTickets(pendingRes.data || []);
      } catch {
        // intentional no-op — keep widgets empty on error
      } finally {
        setLoadingActionable(false);
      }
    };
    fetchActionable();
  }, []);

  useEffect(() => {
    const fetchFinancialSummary = async () => {
      try {
        const response = await api.get('/financial/summary');
        setFinancialSummary(response.data || emptyFinancialSummary);
      } catch {
        // intentional no-op — keep zeros on error
      } finally {
        setLoadingFinancial(false);
      }
    };
    fetchFinancialSummary();
  }, []);

  const formatValue = (key: keyof typeof initialTotals, value: number) =>
    key === 'revenueRes' ? abbreviateNumber(value) : String(value);

  return (
    <div className={styles.dashboardRoot}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {t('dashboard.welcomeMessage', {
            greeting: getTimeGreeting(language),
            name: user?.firstName || user?.username || 'Usuário',
          })}
        </h1>
      </div>

      <div className={styles.metricsGrid}>
        {metrics.map(({ key, labelKey, icon, colorVar, href }) => (
          <MetricCard
            key={key}
            icon={icon}
            colorVar={colorVar}
            href={href}
            label={t(labelKey)}
            value={formatValue(key, totals[key])}
            loading={loading}
          />
        ))}
      </div>

      <h2 className={styles.sectionTitle}>{t('dashboard.financialHealth')}</h2>
      <div className={styles.metricsGrid}>
        <MetricCard
          icon={TrendingUp}
          colorVar="--success-color"
          href="/financial"
          label={t('dashboard.receivableThisMonth')}
          value={abbreviateNumber(financialSummary.receivableThisMonth)}
          loading={loadingFinancial}
        />
        <MetricCard
          icon={TrendingDown}
          colorVar="--warning-color"
          href="/financial"
          label={t('dashboard.payableThisMonth')}
          value={abbreviateNumber(financialSummary.payableThisMonth)}
          loading={loadingFinancial}
        />
        <MetricCard
          icon={AlertTriangle}
          colorVar="--danger-color"
          href="/financial"
          label={t('dashboard.overdueTotal')}
          value={abbreviateNumber(financialSummary.overdueReceivable + financialSummary.overduePayable)}
          loading={loadingFinancial}
        />
        <MetricCard
          icon={Scale}
          colorVar="--accent-color"
          href="/financial"
          label={t('dashboard.projectedBalance')}
          value={abbreviateNumber(financialSummary.projectedBalance)}
          loading={loadingFinancial}
        />
      </div>

      <div className={styles.actionableGrid}>
        <RelatedSection title={t('dashboard.staleDeals')} emptyText={loadingActionable ? t('common.loading') : t('dashboard.noStaleDeals')}>
          {staleDeals.map((deal) => (
            <RelatedItem
              key={deal.id}
              to={`/deals/${deal.id}`}
              primary={deal.title}
              secondary={t('dashboard.staleDealsAgo', { company: deal.companyName || '-', days: String(daysSince(deal.updatedAt)) })}
            />
          ))}
        </RelatedSection>

        <RelatedSection title={t('dashboard.pendingTickets')} emptyText={loadingActionable ? t('common.loading') : t('dashboard.noPendingTickets')}>
          {pendingTickets.map((ticket) => (
            <RelatedItem
              key={ticket.id}
              to={`/tickets/${ticket.id}`}
              primary={ticket.title}
              secondary={`${ticket.companyName || '-'} · ${isOverdue(ticket.dueDate) ? t('dashboard.overdue') : ''} ${toFormatedDate(ticket.dueDate)}`}
            />
          ))}
        </RelatedSection>
      </div>
    </div>
  );
};
