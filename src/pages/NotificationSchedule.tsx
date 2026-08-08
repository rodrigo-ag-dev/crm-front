import React, { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useToast } from '../contexts/ToastContext';
import { parameterService, type ParameterDefinition } from '../services/parameterService';
import Input from '../components/Input';
import settingsStyles from './UserSettings.module.css';
import styles from './NotificationSchedule.module.css';

const DEFAULT_TIME = '07:00';

const SOURCES: { name: string; labelKey: string }[] = [
  { name: 'dealNotifyDailyTime', labelKey: 'settings.dealNotifyDailyTime' },
  { name: 'ticketNotifyDailyTime', labelKey: 'settings.ticketNotifyDailyTime' },
  { name: 'financialNotifyDailyTime', labelKey: 'settings.financialNotifyDailyTime' },
];

export const NotificationSchedule: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [parameters, setParameters] = useState<Record<string, ParameterDefinition>>({});
  const [times, setTimes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState<string | null>(null);

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const response = await parameterService.listParameters();
      const byName: Record<string, ParameterDefinition> = {};
      const initialTimes: Record<string, string> = {};
      for (const source of SOURCES) {
        const found = response.data.find(p => p.name === source.name);
        if (found) {
          byName[source.name] = found;
        }
        initialTimes[source.name] = found?.value || DEFAULT_TIME;
      }
      setParameters(byName);
      setTimes(initialTimes);
    } catch (err) {
      console.error('Error fetching notification schedule parameters', err);
      showToast(t('settings.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (name: string) => {
    setSavingName(name);
    try {
      const existing = parameters[name];
      const response = await parameterService.saveParameter({
        id: existing?.id,
        name,
        value: times[name] || DEFAULT_TIME,
        userSpecific: false,
      });
      setParameters(prev => ({ ...prev, [name]: response.data }));
      showToast(t('settings.saveSuccess'));
    } catch (err) {
      console.error('Error saving notification schedule parameter', err);
      showToast(t('settings.saveError'), 'error');
    } finally {
      setSavingName(null);
    }
  };

  return (
    <div>
      <p className={settingsStyles.settingsDescription}>{t('settings.notificationScheduleHint')}</p>

      <div className={`card ${settingsStyles.settingsCard}`}>
        {loading ? (
          <p className={settingsStyles.settingsLoading}>{t('common.loading')}</p>
        ) : (
          SOURCES.map(source => (
            <div key={source.name} className={styles.row}>
              <div className={styles.input}>
                <Input
                  label={t(source.labelKey)}
                  type="time"
                  value={times[source.name] ?? DEFAULT_TIME}
                  onChange={e => setTimes(prev => ({ ...prev, [source.name]: e.target.value }))}
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={savingName === source.name}
                onClick={() => handleSave(source.name)}
              >
                {t('common.save')}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
