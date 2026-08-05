import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from '../components/Modal';
import { DataTablePage } from '../components/DataTablePage';
import { Edit2, Trash2 } from 'lucide-react';
import Input from '../components/Input';
import { ConfirmModal } from '../components/ConfirmModal';
import { ColorPicker } from '../components/ColorPicker';

interface Stage {
  id?: string;
  name: string;
  description: string;
  color: string;
  order: number;
  daysSla: number;
}

export const Stages: React.FC = () => {
  const { t } = useTranslation();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);

  const [formData, setFormData] = useState<Stage>({
    name: '', description: '', color: '', order: 0, daysSla: 0
  });

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const size = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [confirmModalOpen, setConfirmModalOpen] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (page !== 0) setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchStages();
  }, [page, debouncedSearch]);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: size.toString()
      });
      if (debouncedSearch) {
        queryParams.append('name', debouncedSearch);
      }
      const response = await api.get(`/stages/search?${queryParams.toString()}`);
      setStages(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
    } catch (error) {
      console.error('Error fetching stages', error);
      setStages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (stage?: Stage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData(stage);
    } else {
      setEditingStage(null);
      setFormData({ name: '', description: '', color: '', order: 0, daysSla: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = formData.id
        ? await api.put<Stage>(`/stages/${formData.id}`, formData)
        : await api.post<Stage>('/stages', formData);
      const saved = response.data;
      // Apply the just-saved record straight from the response rather than refetching - a
      // refetch right after a write can race a Redis cache eviction still propagating and
      // briefly return the pre-edit value, silently undoing this update.
      setStages(prev => {
        const exists = prev.some(s => s.id === saved.id);
        return exists ? prev.map(s => (s.id === saved.id ? saved : s)) : [...prev, saved];
      });
      handleCloseModal();
    } catch (err) {
      console.error('Error saving stage', err);
      setError(t('stages.errorSaving'));
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModalOpen(id);
  };

  return (
    <>
      <DataTablePage
        title={t('stages.title')}
        primaryActionText={t('stages.createStage')}
        onPrimaryAction={() => handleOpenModal()}
        loading={loading}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={`${t('common.search')} ${t('stages.title').toLowerCase()}...`}
        error={error}
        tableHeaders={
          <>
            <th>{t('stages.name')}</th>
            <th>{t('stages.description')}</th>
            <th>{t('stages.color')}</th>
            <th className="table-header-actions--right">{t('stages.daysSla')}</th>
            <th className="table-header-actions">{t('common.actions')}</th>
          </>
        }
        skeletonColumns={5}
      >
        {stages.map(stage => (
          <tr key={stage.id}>
            <td><strong>{stage.name}</strong></td>
            <td>{stage.description}</td>
            <td><div className="table-color-swatch" style={{ backgroundColor: `#${stage.color}` }}></div></td>
            <td className="table-cell-right">{stage.daysSla}</td>
            <td>
              <div className="row-actions">
                <button onClick={() => handleOpenModal(stage)} className="btn-icon" title={t('common.edit')}>
                  <Edit2 size={18} />
                </button>
                <button onClick={() => stage.id && handleDelete(stage.id)} className="btn-icon-danger" title={t('common.delete')}>
                  <Trash2 size={18} />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {stages.length === 0 && (
          <tr>
            <td colSpan={5} className="empty-state">{t('stages.noStages')}</td>
          </tr>
        )}
      </DataTablePage>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStage ? t('stages.editStage') : t('stages.createStage')}>
        <form autoComplete='off' onSubmit={handleSubmit}>
          <Input required label={t('stages.name')} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label={t('stages.description')} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          <ColorPicker label={t('stages.color')} value={formData.color} onChange={color => setFormData({ ...formData, color })} />
          <Input type="number" label={t('stages.daysSla')} value={formData.daysSla} onChange={e => setFormData({ ...formData, daysSla: parseInt(e.target.value) || 0 })} />

          {error && <div className="form-feedback">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModalOpen != null}
        title={''}
        message={t('stages.deleteConfirm')}
        onConfirm={async (confirmed) => {
          if (confirmed) {
            try {
              setError('');
              await api.delete(`/stages/${confirmModalOpen}`);
              const deletedId = confirmModalOpen;
              setStages(prev => prev.filter(s => s.id !== deletedId));
            } catch (err) {
              console.error('Error deleting stage', err);
              setError(t('stages.errorDeleting'));
            }
          }
          setConfirmModalOpen(null);
        }}
        confirmText={t('modals.yes')}
        isDangerous={true}
      />
    </>
  );
};
