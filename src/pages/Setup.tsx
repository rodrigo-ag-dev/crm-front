import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import { useFocusFirstInput } from '../hooks/useFocusFirstInput';
import Input from '../components/Input';
import qsIcon from '../assets/brand/qs-icon.svg';
import styles from './Setup.module.css';

export const Setup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { markSetupComplete } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useFocusFirstInput();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('setup.errorPasswordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/setup', { username, fullName, email, password });
      markSetupComplete();
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || t('setup.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={formRef} className={styles.setupScreen}>
      <div className={`card ${styles.setupCard}`}>
        <div className={styles.setupHeader}>
          <img src={qsIcon} alt="" className={styles.setupLogo} />
          <h1 className={styles.setupTitle}>{t('setup.title')}</h1>
          <p className={styles.setupSubtitle}>{t('setup.subtitle')}</p>
        </div>

        {error && (
          <div className={styles.setupError}>
            {error}
          </div>
        )}

        <form autoComplete="off" onSubmit={handleSubmit}>
          <Input
            label={t('setup.fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label={t('setup.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            label={t('setup.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
          />

          <Input
            label={t('setup.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="********"
          />

          <button type="submit" className={`btn-primary ${styles.setupSubmit}`} disabled={loading}>
            {loading ? t('setup.processing') : t('setup.submitButton')}
          </button>
        </form>
      </div>
    </div>
  );
};
