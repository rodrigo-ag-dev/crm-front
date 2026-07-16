import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import { LogIn } from 'lucide-react';
import { useFocusFirstInput } from '../hooks/useFocusFirstInput';
import Input from '../components/Input';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useFocusFirstInput();

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
          <h1 className={styles.loginTitle}>
            <LogIn size={28} /> {t('login.title')}
          </h1>
          <p className={styles.loginSubtitle}>{t('login.subtitle')}</p>
        </div>

        {error && (
          <div className={styles.loginError}>
            {error}
          </div>
        )}

        <form autoComplete='off' onSubmit={handleLogin}>
          <div className="form-group">
            <Input
              label={t('login.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>

          <Input
            label={t('login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="********"
          />

          <button type="submit" className={`btn-primary ${styles.loginSubmit}`} disabled={loading}>
            {loading ? t('login.loginProcessing') : t('login.loginButton')}
          </button>
        </form>
      </div >
    </div >
  );
};
