import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import Input from './Input';
import styles from './DataTablePage.module.css';

interface DataTablePageProps {
  title: string;
  primaryActionText: string;
  onPrimaryAction: () => void;
  loading: boolean;
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  tableHeaders: React.ReactNode;
  children: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  error?: string;
  titleActions?: React.ReactNode;
  scrollAreaRef?: React.RefObject<HTMLDivElement | null>;
}

export const DataTablePage: React.FC<DataTablePageProps> = ({
  title,
  primaryActionText,
  onPrimaryAction,
  loading,
  page,
  totalPages,
  setPage,
  tableHeaders,
  children,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  error,
  titleActions,
  scrollAreaRef
}) => {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(Boolean(searchTerm));
  const searchBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) {
      searchBarRef.current?.querySelector('input')?.focus();
    }
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange?.('');
  };

  return (
    <div className={styles.pageShell}>
      <div className={`${styles.pageHeader} ${styles.pageToolbar}`}>
        <div className={styles.titleGroup}>
          <h1 className="page-title">{title}</h1>
          {titleActions}
        </div>
        <div className={styles.toolbarActions}>
          {onSearchChange && !searchOpen && (
            <button
              type="button"
              className="btn-secondary icon-button"
              onClick={() => setSearchOpen(true)}
              title={t('common.search')}
            >
              <Search size={18} />
            </button>
          )}
          <button className="btn-primary" onClick={onPrimaryAction}><Plus size={18} />{primaryActionText}</button>
        </div>
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      <div className={`card ${styles.pageMainCard}`}>
        {onSearchChange && searchOpen && (
          <div className={styles.searchBar} ref={searchBarRef}>
            <Input
              label=''
              type="text"
              placeholder={searchPlaceholder || "Buscar..."}
              value={searchTerm || ''}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }}
            />
            <button
              type="button"
              className="btn-icon"
              onClick={closeSearch}
              title={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div ref={scrollAreaRef} className={`${styles.tableScrollArea}${loading ? ` ${styles.tableScrollAreaLoading}` : ''}`}>
          <table className="data-table">
            <thead>
              <tr>
                {tableHeaders}
              </tr>
            </thead>
            <tbody>
              {children}
            </tbody>
          </table>
        </div>

        <div className={styles.paginationBar}>
          <div>
            {t('pagination.pageOf', { page: page + 1, total: totalPages || 1 })}
          </div>
          <div className={styles.paginationActions}>
            <button
              className="btn-secondary icon-button"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              title={t('buttons.previous')}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="btn-secondary icon-button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              title={t('buttons.next')}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
