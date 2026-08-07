import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useComboboxPosition } from '../hooks/useComboboxPosition';
import { tenantService, type TenantRecord } from '../services/tenantService';
import styles from './Layout.module.css';

// Only rendered for a platform admin - a regular user's tenant is fixed, so
// the badge stays a plain display element for them (see Layout.tsx).
export const TenantSwitcher: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [switching, setSwitching] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { openUpward, maxHeight } = useComboboxPosition(wrapperRef, isOpen);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    setIsOpen((current) => !current);
    if (!loaded) {
      setLoading(true);
      tenantService.listTenants()
        .then((response) => setTenants((response.data || []).filter((tenant) => tenant.active)))
        .catch((err) => console.error('Error fetching tenants', err))
        .finally(() => {
          setLoading(false);
          setLoaded(true);
        });
    }
  };

  const handleSwitch = async (tenantId: string) => {
    if (switching) return;
    if (tenantId === user?.tenantId) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    try {
      const response = await tenantService.switchTenant(tenantId);
      if (response.data.token) {
        window.localStorage.setItem('crm_token', response.data.token);
      }
      updateUser(response.data.user);
      setIsOpen(false);
      setFilter('');
      navigate('/');
    } catch (err) {
      console.error('Error switching tenant', err);
    } finally {
      setSwitching(false);
    }
  };

  if (!user?.tenantName) return null;

  const filtered = filter
    ? tenants.filter((tenant) => tenant.name.toLowerCase().includes(filter.toLowerCase()))
    : tenants;

  return (
    <div ref={wrapperRef} className="combobox-wrapper">
      <button
        type="button"
        className={styles.tenantBadge}
        onClick={toggleOpen}
        title={user.tenantName}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Building2 size={14} />
        <span>{user.tenantName}</span>
        <ChevronDown size={13} className={`combobox-trigger-icon${isOpen ? ' combobox-trigger-icon-open' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="combobox-dropdown"
          style={{
            maxHeight,
            // The trigger is a compact badge, not a full-width field like other
            // comboboxes - left:0/right:0 alone would size the panel to the
            // badge's own (often tiny) width and crush the tenant names/check
            // icon. Anchor to the left edge and give it its own width instead.
            left: 0,
            right: 'auto',
            width: 280,
            maxWidth: 'calc(100vw - 32px)',
            ...(openUpward ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {}),
          }}
        >
          <input
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="input-field combobox-input"
            placeholder={t('layout.searchTenants')}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            style={{ flexShrink: 0, marginBottom: 4 }}
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', minHeight: 0 }}>
            {loading ? (
              <li className="combobox-empty"><Loader2 size={14} className="combobox-loading" /></li>
            ) : filtered.length === 0 ? (
              <li className="combobox-empty"><small>{t('combobox.noResults')}</small></li>
            ) : (
              filtered.map((tenant) => (
                <li
                  key={tenant.id}
                  className="combobox-option"
                  onClick={() => handleSwitch(tenant.id)}
                >
                  <span className="combobox-option-icon"><Building2 size={16} /></span>
                  <span className="combobox-option-text">
                    <span className="combobox-option-primary">{tenant.name}</span>
                    <span className="combobox-option-secondary">{tenant.slug}</span>
                  </span>
                  {tenant.id === user.tenantId && <Check size={14} />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
