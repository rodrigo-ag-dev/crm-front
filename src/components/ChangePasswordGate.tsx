import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Input from './Input';
import styles from './ChangePasswordGate.module.css';

export const ChangePasswordGate: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError(t('changePassword.errorTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errorMismatch'));
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword });
      updateUser(response.data);
    } catch (err) {
      console.error('Error changing password', err);
      setError(t('changePassword.errorGeneric'));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={styles.overlay}>
      <div className={`card ${styles.card}`}>
        <div className={styles.header}>
          <KeyRound size={28} />
          <h1 className={styles.title}>{t('changePassword.title')}</h1>
        </div>
        <p className={styles.subtitle}>{t('changePassword.forcedSubtitle')}</p>

        <form autoComplete="off" onSubmit={handleSubmit}>
          <Input
            required
            type="password"
            label={t('changePassword.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            required
            type="password"
            label={t('changePassword.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            required
            type="password"
            label={t('changePassword.confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <div className="form-feedback">{error}</div>}

          <div className="modal-footer">
            <button type="submit" className="btn-primary" disabled={saving}>
              {t('changePassword.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
