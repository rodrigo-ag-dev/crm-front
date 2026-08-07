import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import { useFocusFirstInput } from '../hooks/useFocusFirstInput';
import Input from '../components/Input';
import qsIcon from '../assets/brand/qs-icon.svg';
import styles from './Login.module.css';

const ERROR_DISMISS_MS = 6000;

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useFocusFirstInput();

  // Auto-dismiss so a stale "wrong credentials" tooltip doesn't sit over the
  // form forever — and clear immediately once the user starts fixing either
  // field, same as most login forms.
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), ERROR_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });

      const user = response.data?.user;
      const token = response.data?.token;
      if (!user) {
        throw new Error('User not found in login response');
      }

      if (token) {
        window.localStorage.setItem('crm_token', token);
      }

      signIn(user);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(t('login.authError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={formRef} className={styles.loginScreen}>
      <div className={`card ${styles.loginCard}`}>
        <div className={styles.loginHeader}>
          <img src={qsIcon} alt="" className={styles.loginLogo} />
          <h1 className={styles.loginTitle}>{t('login.title')}</h1>
          <p className={styles.loginSubtitle}>{t('login.subtitle')}</p>
        </div>

        <form autoComplete='off' onSubmit={handleLogin}>
          <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
            <Input
              label={t('login.email')}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
              placeholder="seu@email.com"
            />
          </div>

          <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
            <Input
              label={t('login.password')}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
              placeholder="********"
            />
            {error && (
              <div className={styles.errorTooltip} role="alert">
                {error}
              </div>
            )}
          </div>

          <button type="submit" className={`btn-primary ${styles.loginSubmit}`} disabled={loading}>
            {loading ? t('login.loginProcessing') : t('login.loginButton')}
          </button>
        </form>
      </div >
    </div >
  );
};
