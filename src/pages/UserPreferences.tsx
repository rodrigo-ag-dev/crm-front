import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { ThemeSelector } from '../components/ThemeSelector';
import {
  parameterService,
  type ParameterDefinition,
  type UserParameterOverride,
} from '../services/parameterService';
import { applyAnimationPreference } from '../utils/animationPreferences';
import styles from './UserSettings.module.css';

interface ParameterOption {
  parameterId: string;
  parameterName?: string;
  value: string;
}

export const UserPreferences: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [parameters, setParameters] = useState<ParameterOption[]>([]);
  const [selectedParameters, setSelectedParameters] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');

  const parseBooleanValue = (value: string | undefined) => value?.toLowerCase() === 'true';

  const resolveParameterId = (parameter: ParameterDefinition | UserParameterOverride) =>
    parameter.parameterId ?? parameter.id ?? parameter.name ?? '';

  const resolveParameterName = (parameter: ParameterDefinition | UserParameterOverride) =>
    parameter.name?.trim() || '';

  const getParameterLabel = (parameterId: string, parameterName?: string) => {
    const candidates = [parameterName, parameterId].filter(
      (candidate): candidate is string => Boolean(candidate?.trim())
    );

    for (const candidate of candidates) {
      const translatedLabel = t(`settings.${candidate}`);
      if (translatedLabel !== `settings.${candidate}`) {
        return translatedLabel;
      }
    }

    return candidates[0] ?? parameterId;
  };

  const fetchParameters = async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    try {
      const [globalResponse, userResponse] = await Promise.all([
        parameterService.listParameters(),
        parameterService.listUserParameters(user.id),
      ]);

      const globalParameters = Array.isArray(globalResponse.data) ? globalResponse.data : [];
      const userParameters = Array.isArray(userResponse.data) ? userResponse.data : [];

      const userOverrides = userParameters.reduce<Record<string, string>>((accumulator, parameter) => {
        const parameterId = resolveParameterId(parameter);
        if (parameterId) {
          accumulator[parameterId] = parameter.value ?? 'false';
        }
        return accumulator;
      }, {});

      const nextParameters = globalParameters.map((parameter) => {
        const parameterId = resolveParameterId(parameter);
        const parameterName = resolveParameterName(parameter);
        return {
          parameterId,
          parameterName,
          value: userOverrides[parameterId] ?? parameter.value ?? 'false',
        };
      });

      setParameters(nextParameters);
      setSelectedParameters(
        nextParameters.reduce<Record<string, boolean>>((accumulator, parameter) => {
          accumulator[parameter.parameterId] = parseBooleanValue(parameter.value) ?? false;
          return accumulator;
        }, {})
      );
    } catch (error) {
      console.error('Error fetching parameters', error);
      setStatusTone('error');
      setStatusMessage(t('settings.loadError'));
      setParameters([]);
      setSelectedParameters({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
  }, [user?.id]);

  const showStatus = (message: string, tone: 'success' | 'error') => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  const toggleParameter = (parameterId: string) => {
    setSelectedParameters((current) => ({
      ...current,
      [parameterId]: !current[parameterId],
    }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      return;
    }

    setSaving(true);
    setStatusMessage('');

    try {
      await Promise.all(
        parameters.map((parameter) =>
          parameterService.saveUserParameter({
            userId: user.id,
            parameterId: parameter.parameterId,
            value: String(selectedParameters[parameter.parameterId] ?? false),
          })
        )
      );

      const animationEnabled = selectedParameters.animationActive ?? false;
      applyAnimationPreference(animationEnabled);

      showStatus(t('settings.saveSuccess'), 'success');
      await fetchParameters();
    } catch (error) {
      console.error('Error saving user parameters', error);
      showStatus(t('settings.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className={styles.settingsDescription}>{t('settings.description')}</p>

      <div className={`card ${styles.settingsCard}`}>
        <ThemeSelector
          label={t('settings.appearanceTitle')}
          description={t('settings.appearanceHint')}
        />
      </div>

      {statusMessage && (
        <div className={`${styles.statusMessage} ${statusTone === 'success' ? styles.statusMessageSuccess : styles.statusMessageError}`}>
          {statusMessage}
        </div>
      )}

      <div className="card">
        <div className={styles.settingsHeader}>
          <div>
            <h2 className={styles.settingsTitle}>{t('settings.listTitle')}</h2>
            <p className={styles.settingsSubtitle}>
              {t('settings.listHint')}
            </p>
          </div>
          <div className={styles.settingsCount}>
            {Object.values(selectedParameters).filter(Boolean).length} {t('settings.parametersCount')}
          </div>
        </div>

        {loading ? (
          <p className={styles.settingsLoading}>{t('common.loading')}</p>
        ) : parameters.length === 0 ? (
          <div className={styles.settingsEmpty}>
            <p className={styles.settingsEmptyTitle}>{t('settings.emptyTitle')}</p>
            <p>{t('settings.emptyHint')}</p>
          </div>
        ) : (
          <div className={styles.settingsList}>
            {parameters.map((parameter) => {
              const isSelected = selectedParameters[parameter.parameterId] ?? false;

              return (
                <label
                  key={parameter.parameterId}
                  className={`${styles.settingsOption}${isSelected ? ` ${styles.settingsOptionSelected}` : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleParameter(parameter.parameterId)}
                    className={styles.settingsOptionCheckbox}
                  />
                  <div>
                    <div className={styles.settingsOptionTitle}>
                      {getParameterLabel(parameter.parameterId, parameter.parameterName)}
                    </div>
                    <div className={styles.settingsOptionSubtitle}>
                      {isSelected ? t('settings.enabled') : t('settings.disabled')}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className={styles.settingsActions}>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? t('common.loading') : t('settings.ok')}
          </button>
        </div>
      </div>
    </div>
  );
};
