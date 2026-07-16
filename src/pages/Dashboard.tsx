import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { BarChart3, Users, Building2, Briefcase, ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { abbreviateNumber } from '../utils/numberUtils';
import { toFormatedDate } from '../utils/dateUtils';
import { getTimeGreeting } from '../utils/greetingUtils';
import { RelatedItem, RelatedSection } from '../components/RecordPane';
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
        {metrics.map(({ key, labelKey, icon: Icon, colorVar, href }) => (
          <div key={key} className={`card ${styles.metricCard}`}>
            <div className={styles.metricCardBar} style={{ background: `var(${colorVar})` }} />
            <div className={styles.metricCardBody}>
              <div className={styles.metricIconWrap} style={{ color: `var(${colorVar})`, background: `color-mix(in srgb, var(${colorVar}) 12%, transparent)` }}>
                <Icon size={22} />
              </div>
              <div className={styles.metricInfo}>
                <p className={styles.metricLabel}>{t(labelKey)}</p>
                {loading ? (
                  <div className={styles.metricSkeleton} />
                ) : (
                  <h2 className={styles.metricValue}>{formatValue(key, totals[key])}</h2>
                )}
              </div>
            </div>
            <NavLink to={href} className={styles.metricLink}>
              <ArrowRight size={14} />
            </NavLink>
          </div>
        ))}
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
