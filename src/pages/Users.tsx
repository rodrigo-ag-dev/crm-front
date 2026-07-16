import React, { useEffect, useState } from 'react';
import { Copy, Edit2, KeyRound, Plus, ShieldMinus, ShieldPlus, UserCheck, UserX } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { userService, type UserRecord, type UserRole } from '../services/userService';
import { getInitials, getAvatarStyle } from '../utils/avatarUtils';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import splitStyles from '../components/SplitViewShell.module.css';
import styles from './Users.module.css';

interface UserFormData {
  username: string;
  fullName: string;
  email: string;
  password: string;
}

const emptyForm: UserFormData = { username: '', fullName: '', email: '', password: '' };

export const Users: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<UserRecord | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserRecord | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ user: UserRecord; temporaryPassword: string } | null>(null);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const response = await userService.listUsers();
      setUsers(response.data || []);
    } catch (err) {
      console.error('Error fetching users', err);
      setError(t('users.errorLoading'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (targetUser: UserRecord) => {
    const nextRole: UserRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setUpdatingId(targetUser.id);
    setError('');
    try {
      const response = await userService.updateUserRole(targetUser.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? response.data : u)));
    } catch (err) {
      console.error('Error updating user role', err);
      setError(t('users.errorUpdating'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (targetUser: UserRecord) => {
    if (targetUser.active) {
      setDeactivateTarget(targetUser);
      return;
    }
    await setActive(targetUser, true);
  };

  const setActive = async (targetUser: UserRecord, active: boolean) => {
    setUpdatingId(targetUser.id);
    setError('');
    try {
      const response = await userService.setUserActive(targetUser.id, active);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? response.data : u)));
    } catch (err) {
      console.error('Error updating user status', err);
      setError(t('users.errorUpdatingStatus'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPassword = async (targetUser: UserRecord) => {
    setUpdatingId(targetUser.id);
    setError('');
    try {
      const response = await userService.resetPassword(targetUser.id);
      setResetPasswordResult({ user: targetUser, temporaryPassword: response.data.temporaryPassword });
    } catch (err) {
      console.error('Error resetting password', err);
      setError(t('users.errorResettingPassword'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (targetUser: UserRecord) => {
    setEditingUser(targetUser);
    setFormData({ username: targetUser.username, fullName: targetUser.fullName, email: targetUser.email, password: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editingUser) {
        const response = await userService.updateUser(editingUser.id, {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
        });
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? response.data : u)));
      } else {
        const response = await userService.createUser(formData);
        setUsers((prev) => [...prev, response.data]);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error saving user', err);
      setFormError(t('users.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={splitStyles.page}>
      <div className="page-header">
        <h1 className="page-title">{t('users.title')}</h1>
        <div className="toolbar-actions">
          <button className="btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            {t('users.createUser')}
          </button>
        </div>
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      <div className={`card ${styles.card}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('users.name')}</th>
              <th>{t('users.email')}</th>
              <th>{t('users.role')}</th>
              <th>{t('users.status')}</th>
              <th className="table-header-actions--right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className={styles.userCell}>
                    <span className={styles.avatar} style={getAvatarStyle(u.fullName || u.username)}>
                      {getInitials(u.fullName || u.username)}
                    </span>
                    <strong>{u.fullName || u.username}</strong>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'ADMIN' ? styles.badgeAdmin : ''}`}>
                    {u.role === 'ADMIN' ? t('users.roleAdmin') : t('users.roleUser')}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.active ? styles.badgeActive : styles.badgeInactive}`}>
                    {u.active ? t('users.statusActive') : t('users.statusInactive')}
                  </span>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className="btn-icon"
                      title={t('common.edit')}
                      onClick={() => handleOpenEditModal(u)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={u.id === currentUser?.id || updatingId === u.id}
                      title={u.id === currentUser?.id ? t('users.cannotChangeSelf') : (u.role === 'ADMIN' ? t('users.demoteToUser') : t('users.promoteToAdmin'))}
                      aria-label={u.role === 'ADMIN' ? t('users.demoteToUser') : t('users.promoteToAdmin')}
                      onClick={() => handleToggleRole(u)}
                    >
                      {u.role === 'ADMIN' ? <ShieldMinus size={16} /> : <ShieldPlus size={16} />}
                    </button>
                    <button
                      type="button"
                      className={u.active ? 'btn-icon-danger' : 'btn-icon'}
                      disabled={u.id === currentUser?.id || updatingId === u.id}
                      title={u.id === currentUser?.id ? t('users.cannotChangeSelf') : (u.active ? t('users.deactivate') : t('users.activate'))}
                      aria-label={u.active ? t('users.deactivate') : t('users.activate')}
                      onClick={() => handleToggleActive(u)}
                    >
                      {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={updatingId === u.id}
                      title={t('users.resetPassword')}
                      aria-label={t('users.resetPassword')}
                      onClick={() => setResetPasswordTarget(u)}
                    >
                      <KeyRound size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">{t('users.noUsers')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? t('users.editUser') : t('users.createUser')}
      >
        <form autoComplete="off" onSubmit={handleSubmit}>
          <Input
            required
            label={t('users.name')}
            value={formData.fullName}
            onChange={(e) => setFormData((current) => ({ ...current, fullName: e.target.value }))}
          />
          <Input
            required
            label={t('users.username')}
            value={formData.username}
            onChange={(e) => setFormData((current) => ({ ...current, username: e.target.value }))}
          />
          <Input
            required
            type="email"
            label={t('users.email')}
            value={formData.email}
            onChange={(e) => setFormData((current) => ({ ...current, email: e.target.value }))}
          />
          {!editingUser && (
            <Input
              required
              type="password"
              label={t('users.password')}
              placeholder={t('users.passwordPlaceholder')}
              value={formData.password}
              onChange={(e) => setFormData((current) => ({ ...current, password: e.target.value }))}
            />
          )}

          {formError && <div className="form-feedback">{formError}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deactivateTarget != null}
        title={''}
        message={t('users.deactivateConfirm', { name: deactivateTarget?.fullName || deactivateTarget?.username || '' })}
        onConfirm={async (confirmed) => {
          const target = deactivateTarget;
          setDeactivateTarget(null);
          if (confirmed && target) {
            await setActive(target, false);
          }
        }}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={resetPasswordTarget != null}
        title={''}
        message={t('users.resetPasswordConfirm', { name: resetPasswordTarget?.fullName || resetPasswordTarget?.username || '' })}
        onConfirm={async (confirmed) => {
          const target = resetPasswordTarget;
          setResetPasswordTarget(null);
          if (confirmed && target) {
            await handleResetPassword(target);
          }
        }}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />

      <Modal
        isOpen={resetPasswordResult != null}
        onClose={() => setResetPasswordResult(null)}
        title={t('users.resetPasswordResultTitle')}
      >
        <p className={styles.resetPasswordHint}>
          {t('users.resetPasswordResultHint', {
            name: resetPasswordResult?.user.fullName || resetPasswordResult?.user.username || '',
          })}
        </p>
        <div className={styles.resetPasswordValueRow}>
          <code className={styles.resetPasswordValue}>{resetPasswordResult?.temporaryPassword}</code>
          <button
            type="button"
            className="btn-icon"
            title={t('common.copy')}
            aria-label={t('common.copy')}
            onClick={() => {
              if (resetPasswordResult) navigator.clipboard.writeText(resetPasswordResult.temporaryPassword);
            }}
          >
            <Copy size={16} />
          </button>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={() => setResetPasswordResult(null)}>
            {t('common.close')}
          </button>
        </div>
      </Modal>
    </div>
  );
};
