import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserPreferences } from './UserPreferences';
import { Stages } from './Stages';
import { Users } from './Users';
import styles from './UserSettings.module.css';

type SettingsTab = 'preferences' | 'stages' | 'users';

export const UserSettings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');

  const isAdmin = user?.role === 'ADMIN';

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
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'preferences' && <UserPreferences />}
        {activeTab === 'stages' && <Stages />}
        {activeTab === 'users' && isAdmin && <Users />}
      </div>
    </div>
  );
};
