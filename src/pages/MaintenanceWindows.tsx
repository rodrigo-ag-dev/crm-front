import React, { useEffect, useState } from 'react';
import { Plus, Ban } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import {
  maintenanceWindowService,
  type MaintenanceWindowRecord,
} from '../services/maintenanceWindowService';
import { toFormatedDateTime } from '../utils/dateUtils';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import { SkeletonTableRows } from '../components/Skeleton';
import splitStyles from '../components/SplitViewShell.module.css';
import styles from './Tenants.module.css';

interface MaintenanceFormData {
  startsAt: string;
  endsAt: string;
  message: string;
}

const emptyForm: MaintenanceFormData = { startsAt: '', endsAt: '', message: '' };

const toDateTimeLocalValue = (isoValue: string): string => {
  const date = new Date(isoValue);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoValue = (dateTimeLocalValue: string): string => {
  const date = new Date(dateTimeLocalValue);
  return date.toISOString();
};

export const MaintenanceWindows: React.FC = () => {
  const { t } = useTranslation();
  const [windows, setWindows] = useState<MaintenanceWindowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MaintenanceFormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  async function fetchWindows() {
    setLoading(true);
    setError('');
    try {
      const response = await maintenanceWindowService.list();
      setWindows(response.data || []);
    } catch (err) {
      console.error('Error fetching maintenance windows', err);
      setError(t('maintenanceWindows.errorLoading'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWindows();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (window: MaintenanceWindowRecord) => {
    setEditingId(window.id);
    setFormData({
      startsAt: toDateTimeLocalValue(window.startsAt),
      endsAt: toDateTimeLocalValue(window.endsAt),
      message: window.message,
    });
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

    const payload = {
      startsAt: toIsoValue(formData.startsAt),
      endsAt: toIsoValue(formData.endsAt),
      message: formData.message,
    };

    try {
      if (editingId) {
        const response = await maintenanceWindowService.update(editingId, payload);
        setWindows((prev) => prev.map((w) => (w.id === editingId ? response.data : w)));
      } else {
        const response = await maintenanceWindowService.create(payload);
        setWindows((prev) => [response.data, ...prev]);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error saving maintenance window', err);
      setFormError(t('maintenanceWindows.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelWindow = async (confirmed: boolean) => {
    const id = cancelTargetId;
    setCancelTargetId(null);
    if (!confirmed || !id) return;

    try {
      await maintenanceWindowService.cancel(id);
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, cancelled: true } : w)));
    } catch (err) {
      console.error('Error cancelling maintenance window', err);
      setError(t('maintenanceWindows.errorCancelling'));
    }
  };

  return (
    <div className={splitStyles.page}>
      <div className="page-header">
        <h1 className="page-title">{t('maintenanceWindows.title')}</h1>
        <div className="toolbar-actions">
          <button className="btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            {t('maintenanceWindows.createWindow')}
          </button>
        </div>
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      <div className={`card ${styles.card}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('maintenanceWindows.startsAt')}</th>
              <th>{t('maintenanceWindows.endsAt')}</th>
              <th>{t('maintenanceWindows.message')}</th>
              <th>{t('users.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && windows.length === 0 ? (
              <SkeletonTableRows columns={5} />
            ) : (
              <>
                {windows.map((window) => (
                  <tr
                    key={window.id}
                    onClick={() => !window.cancelled && handleOpenEditModal(window)}
                    style={{ cursor: window.cancelled ? 'default' : 'pointer' }}
                  >
                    <td>{toFormatedDateTime(window.startsAt)}</td>
                    <td>{toFormatedDateTime(window.endsAt)}</td>
                    <td>{window.message}</td>
                    <td>
                      <span className={`badge ${window.cancelled ? styles.badgeInactive : styles.badgeActive}`}>
                        {window.cancelled ? t('maintenanceWindows.statusCancelled') : t('maintenanceWindows.statusScheduled')}
                      </span>
                    </td>
                    <td>
                      {!window.cancelled && (
                        <button
                          type="button"
                          className="btn-icon"
                          title={t('maintenanceWindows.cancelWindow')}
                          aria-label={t('maintenanceWindows.cancelWindow')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelTargetId(window.id);
                          }}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {windows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">{t('maintenanceWindows.noWindows')}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('maintenanceWindows.editWindow') : t('maintenanceWindows.createWindow')}
      >
        <form autoComplete="off" onSubmit={handleSubmit}>
          <p className={styles.hint}>{t('maintenanceWindows.createHint')}</p>
          <Input
            required
            type="datetime-local"
            label={t('maintenanceWindows.startsAt')}
            value={formData.startsAt}
            onChange={(e) => setFormData((current) => ({ ...current, startsAt: e.target.value }))}
          />
          <Input
            required
            type="datetime-local"
            label={t('maintenanceWindows.endsAt')}
            value={formData.endsAt}
            onChange={(e) => setFormData((current) => ({ ...current, endsAt: e.target.value }))}
          />
          <div className="form-group">
            <label className="form-label" htmlFor="maintenance-message">{t('maintenanceWindows.message')} *</label>
            <textarea
              id="maintenance-message"
              className="input-field"
              required
              maxLength={500}
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData((current) => ({ ...current, message: e.target.value }))}
            />
          </div>

          {formError && <div className="form-feedback">{formError}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={cancelTargetId !== null}
        message={t('maintenanceWindows.confirmCancel')}
        onConfirm={handleCancelWindow}
        isDangerous
      />
    </div>
  );
};
