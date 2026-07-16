import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, Briefcase, Loader2, Search, Ticket, Users } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { abbreviateNumber } from '../utils/numberUtils';
import styles from './CommandPalette.module.css';

interface ResultItem {
  id: string;
  primary: string;
  secondary?: string;
  to: string;
}

interface GroupedResults {
  companies: ResultItem[];
  contacts: ResultItem[];
  deals: ResultItem[];
  tickets: ResultItem[];
}

const emptyResults: GroupedResults = { companies: [], contacts: [], deals: [], tickets: [] };

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GroupedResults>(emptyResults);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setResults(emptyResults);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults(emptyResults);
      return;
    }

    setLoading(true);
    const delay = setTimeout(async () => {
      const term = encodeURIComponent(query.trim());
      try {
        const [companiesRes, contactsRes, dealsRes, ticketsRes] = await Promise.all([
          api.get(`/companies/search?name=${term}&size=5`),
          api.get(`/contacts/search?name=${term}&size=5`),
          api.get(`/deals/search?title=${term}&size=5`),
          api.get(`/tickets/search?title=${term}&size=5`),
        ]);
        setResults({
          companies: (companiesRes.data.content || []).map((company: any) => ({
            id: company.id,
            primary: company.name,
            secondary: company.email,
            to: `/companies/${company.id}`,
          })),
          contacts: (contactsRes.data.content || []).map((contact: any) => ({
            id: contact.id,
            primary: contact.name,
            secondary: contact.email,
            to: `/contacts/${contact.id}`,
          })),
          deals: (dealsRes.data.content || []).map((deal: any) => ({
            id: deal.id,
            primary: deal.title,
            secondary: abbreviateNumber(deal.amount),
            to: `/deals/${deal.id}`,
          })),
          tickets: (ticketsRes.data.content || []).map((ticket: any) => ({
            id: ticket.id,
            primary: ticket.title,
            secondary: ticket.companyName,
            to: `/tickets/${ticket.id}`,
          })),
        });
      } catch (error) {
        console.error('Error searching', error);
        setResults(emptyResults);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleSelect = (to: string) => {
    onClose();
    navigate(to);
  };

  const groups: { key: keyof GroupedResults; label: string; icon: React.ElementType }[] = [
    { key: 'companies', label: t('navigation.companies'), icon: Building2 },
    { key: 'contacts', label: t('navigation.contacts'), icon: Users },
    { key: 'deals', label: t('navigation.deals'), icon: Briefcase },
    { key: 'tickets', label: t('navigation.tickets'), icon: Ticket },
  ];
  const hasAnyResults = groups.some((group) => results[group.key].length > 0);

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.palette} role="dialog" aria-modal="true">
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            className={styles.searchInput}
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading && <Loader2 size={16} className={styles.spinner} />}
        </div>

        <div className={styles.results}>
          {query.trim().length < 2 && <p className={styles.hint}>{t('commandPalette.hint')}</p>}
          {query.trim().length >= 2 && !loading && !hasAnyResults && (
            <p className={styles.hint}>{t('combobox.noResults')}</p>
          )}
          {groups.map(({ key, label, icon: Icon }) => (
            results[key].length > 0 && (
              <div key={key} className={styles.group}>
                <span className={styles.groupLabel}>{label}</span>
                {results[key].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.resultItem}
                    onClick={() => handleSelect(item.to)}
                  >
                    <Icon size={16} className={styles.resultIcon} />
                    <span className={styles.resultText}>
                      <span className={styles.resultPrimary}>{item.primary}</span>
                      {item.secondary && <span className={styles.resultSecondary}>{item.secondary}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
