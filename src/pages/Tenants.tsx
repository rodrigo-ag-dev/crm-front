import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { tenantService, type TenantRecord } from '../services/tenantService';
import { Modal } from '../components/Modal';
import Input from '../components/Input';
import { SkeletonTableRows } from '../components/Skeleton';
import splitStyles from '../components/SplitViewShell.module.css';
import styles from './Tenants.module.css';

interface TenantFormData {
  name: string;
  slug: string;
}

const emptyForm: TenantFormData = { name: '', slug: '' };

export const Tenants: React.FC = () => {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchTenants() {
    setLoading(true);
    setError('');
    try {
      const response = await tenantService.listTenants();
      setTenants(response.data || []);
    } catch (err) {
      console.error('Error fetching tenants', err);
      setError(t('tenants.errorLoading'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const response = await tenantService.createTenant(formData);
      setTenants((prev) => [...prev, response.data]);
      handleCloseModal();
    } catch (err) {
      console.error('Error creating tenant', err);
      setFormError(t('tenants.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={splitStyles.page}>
      <div className="page-header">
        <h1 className="page-title">{t('tenants.title')}</h1>
        <div className="toolbar-actions">
          <button className="btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            {t('tenants.createTenant')}
          </button>
        </div>
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      <div className={`card ${styles.card}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('tenants.name')}</th>
              <th>{t('tenants.slug')}</th>
              <th>{t('users.status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && tenants.length === 0 ? (
              <SkeletonTableRows columns={3} />
            ) : (
              <>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td><strong>{tenant.name}</strong></td>
                    <td><span className={styles.slugCell}>{tenant.slug}</span></td>
                    <td>
                      <span className={`badge ${tenant.active ? styles.badgeActive : styles.badgeInactive}`}>
                        {tenant.active ? t('users.statusActive') : t('users.statusInactive')}
                      </span>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-state">{t('tenants.noTenants')}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={t('tenants.createTenant')}>
        <form autoComplete="off" onSubmit={handleSubmit}>
          <p className={styles.hint}>{t('tenants.createHint')}</p>
          <Input
            required
            label={t('tenants.name')}
            value={formData.name}
            onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
          />
          <Input
            required
            label={t('tenants.slug')}
            placeholder={t('tenants.slugPlaceholder')}
            pattern="^[a-z][a-z0-9_]{1,45}$"
            title={t('tenants.slugHint')}
            value={formData.slug}
            onChange={(e) => setFormData((current) => ({ ...current, slug: e.target.value.toLowerCase() }))}
          />
          <p className={styles.hint}>{t('tenants.slugHint')}</p>

          {formError && <div className="form-feedback">{formError}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
