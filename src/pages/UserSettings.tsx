import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserPreferences } from './UserPreferences';
import { Stages } from './Stages';
import { Users } from './Users';
import { Tenants } from './Tenants';
import { FinancialCategories } from './FinancialCategories';
import styles from './UserSettings.module.css';

type SettingsTab = 'preferences' | 'stages' | 'financialCategories' | 'users' | 'tenants';

export const UserSettings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');

  const isAdmin = user?.role === 'ADMIN';
  const isPlatformAdmin = Boolean(user?.platformAdmin);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('settings.title')}</h1>
      </div>

      <div className="selector-options">
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`selector-button selector-button--surface ${activeTab === 'preferences' ? 'selector-button--active' : 'selector-button--inactive'}`}
          aria-pressed={activeTab === 'preferences'}
        >
          {t('settings.tabPreferences')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stages')}
          className={`selector-button selector-button--surface ${activeTab === 'stages' ? 'selector-button--active' : 'selector-button--inactive'}`}
          aria-pressed={activeTab === 'stages'}
        >
          {t('settings.tabStages')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('financialCategories')}
          className={`selector-button selector-button--surface ${activeTab === 'financialCategories' ? 'selector-button--active' : 'selector-button--inactive'}`}
          aria-pressed={activeTab === 'financialCategories'}
        >
          {t('settings.tabFinancialCategories')}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`selector-button selector-button--surface ${activeTab === 'users' ? 'selector-button--active' : 'selector-button--inactive'}`}
            aria-pressed={activeTab === 'users'}
          >
            {t('settings.tabUsers')}
          </button>
        )}
        {isPlatformAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`selector-button selector-button--surface ${activeTab === 'tenants' ? 'selector-button--active' : 'selector-button--inactive'}`}
            aria-pressed={activeTab === 'tenants'}
          >
            {t('settings.tabTenants')}
          </button>
        )}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'preferences' && <UserPreferences />}
        {activeTab === 'stages' && <Stages />}
        {activeTab === 'financialCategories' && <FinancialCategories />}
        {activeTab === 'users' && isAdmin && <Users />}
        {activeTab === 'tenants' && isPlatformAdmin && <Tenants />}
      </div>
    </div>
  );
};
