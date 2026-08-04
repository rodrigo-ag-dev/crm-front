import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from '../components/Modal';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import Input from '../components/Input';
import { ConfirmModal } from '../components/ConfirmModal';
import { ColorPicker } from '../components/ColorPicker';
import { SimpleDropdown } from '../components/SimpleDropdown';

interface Category {
  id?: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
}

const emptyCategory: Category = { name: '', type: 'EXPENSE', color: '' };

export const FinancialCategories: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Category>(emptyCategory);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/financial/categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditing(category);
      setFormData(category);
    } else {
      setEditing(null);
      setFormData(emptyCategory);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = formData.id
        ? await api.put<Category>(`/financial/categories/${formData.id}`, formData)
        : await api.post<Category>('/financial/categories', formData);
      const saved = response.data;
      setCategories(prev => {
        const exists = prev.some(c => c.id === saved.id);
        return exists ? prev.map(c => (c.id === saved.id ? saved : c)) : [...prev, saved];
      });
      handleCloseModal();
    } catch (err) {
      console.error('Error saving category', err);
      setError(t('financial.errorSaving'));
    }
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">{t('financial.categories')}</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          {t('financial.newCategory')}
        </button>
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('financial.name')}</th>
              <th>{t('financial.type')}</th>
              <th>{t('financial.color')}</th>
              <th className="table-header-actions">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id}>
                <td><strong>{category.name}</strong></td>
                <td>{category.type === 'INCOME' ? t('financial.income') : t('financial.expense')}</td>
                <td>{category.color && <div className="table-color-swatch" style={{ backgroundColor: `#${category.color}` }}></div>}</td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => handleOpenModal(category)} className="btn-icon" title={t('common.edit')}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => category.id && setConfirmDeleteId(category.id)} className="btn-icon-danger" title={t('common.delete')}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">{t('financial.noCategories')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editing ? t('financial.editCategory') : t('financial.newCategory')}>
        <form autoComplete="off" onSubmit={handleSubmit}>
          <Input required label={t('financial.name')} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />

          <SimpleDropdown
            label={t('financial.type')}
            value={formData.type}
            onChange={value => setFormData({ ...formData, type: value as 'INCOME' | 'EXPENSE' })}
            options={[
              { id: 'EXPENSE', name: t('financial.expense') },
              { id: 'INCOME', name: t('financial.income') }
            ]}
          />

          <ColorPicker label={t('financial.color')} value={formData.color} onChange={color => setFormData({ ...formData, color })} />

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteId != null}
        message={t('financial.deleteConfirm')}
        onConfirm={async (confirmed) => {
          if (confirmed && confirmDeleteId) {
            try {
              await api.delete(`/financial/categories/${confirmDeleteId}`);
              setCategories(prev => prev.filter(c => c.id !== confirmDeleteId));
            } catch (err) {
              console.error('Error deleting category', err);
              setError(t('financial.errorDeleting'));
            }
          }
          setConfirmDeleteId(null);
        }}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />
    </>
  );
};
