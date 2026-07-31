import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Briefcase, Check, Plus, Ticket, Trash2, Users } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import {
  taskService,
  type TaskChecklistItem,
  type TaskEntityType,
  type TaskItem,
  type TaskPriority,
} from '../services/taskService';
import { emitTaskChanged } from '../utils/taskEvents';
import { searchMentionCandidates, type MentionCandidate } from '../utils/entityMentionSearch';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import Input from './Input';
import Textarea from './Textarea';
import styles from './TaskModal.module.css';

const ENTITY_ICON: Record<TaskEntityType, React.ElementType> = {
  DEAL: Briefcase,
  CONTACT: Users,
  COMPANY: Building2,
  TICKET: Ticket,
};

const MENTION_PATTERN = /@([^\s@]*)$/;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onSaved?: () => void;
  onDeleted?: () => void;
}

const toDatetimeLocalValue = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSaved, onDeleted }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [selectedEntity, setSelectedEntity] = useState<MentionCandidate | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);
  const titleFieldRef = useRef<HTMLDivElement | null>(null);

  async function fetchChecklist(taskId: string) {
    setChecklistLoading(true);
    try {
      const response = await taskService.getChecklist(taskId);
      setChecklist(response.data || []);
    } catch (err) {
      console.error('Error fetching checklist', err);
      setChecklist([]);
    } finally {
      setChecklistLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !task) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setDueAt(toDatetimeLocalValue(task.dueAt));
    setPriority(task.priority);
    setError('');
    setMentionCandidates([]);
    setSelectedEntity(
      task.entityType && task.entityId
        ? { entityType: task.entityType, entityId: task.entityId, label: task.entityLabel || task.entityId }
        : null,
    );
    fetchChecklist(task.id);
  }, [isOpen, task]);

  const activeMentionQuery = useMemo(() => {
    const match = title.match(MENTION_PATTERN);
    return match ? match[1] : null;
  }, [title]);

  useEffect(() => {
    if (activeMentionQuery === null || activeMentionQuery.trim().length < 2) {
      setMentionCandidates([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const candidates = await searchMentionCandidates(activeMentionQuery);
        setMentionCandidates(candidates);
      } catch (err) {
        console.error('Error searching mention candidates', err);
        setMentionCandidates([]);
      }
    }, 250);

    return () => clearTimeout(delay);
  }, [activeMentionQuery]);

  const handleSelectMention = (candidate: MentionCandidate) => {
    setTitle((current) => current.replace(MENTION_PATTERN, `@${candidate.label} `));
    setSelectedEntity(candidate);
    setMentionCandidates([]);
  };

  useEffect(() => {
    if (mentionCandidates.length === 0) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!titleFieldRef.current?.contains(event.target as Node)) {
        setMentionCandidates([]);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [mentionCandidates.length]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task || !title.trim()) return;

    setSaving(true);
    setError('');
    try {
      await taskService.update(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        priority,
        entityType: selectedEntity?.entityType,
        entityId: selectedEntity?.entityId,
      });
      emitTaskChanged();
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving task', err);
      setError(t('tasks.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (confirmed: boolean) => {
    setConfirmDelete(false);
    if (!confirmed || !task) return;

    try {
      await taskService.remove(task.id);
      emitTaskChanged();
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error('Error deleting task', err);
      setError(t('tasks.errorSaving'));
    }
  };

  const handleAddChecklistItem = async () => {
    const label = newItemLabel.trim();
    if (!label || !task) return;

    setNewItemLabel('');
    try {
      const response = await taskService.addChecklistItem(task.id, label);
      setChecklist((prev) => [...prev, response.data]);
    } catch (err) {
      console.error('Error adding checklist item', err);
    }
  };

  const handleToggleChecklistItem = async (item: TaskChecklistItem) => {
    if (!task) return;
    const nextDone = !item.done;
    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)));
    try {
      await taskService.updateChecklistItem(task.id, item.id, { label: item.label, done: nextDone, position: item.position });
    } catch (err) {
      console.error('Error updating checklist item', err);
    }
  };

  const handleRemoveChecklistItem = async (item: TaskChecklistItem) => {
    if (!task) return;
    setChecklist((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await taskService.removeChecklistItem(task.id, item.id);
    } catch (err) {
      console.error('Error removing checklist item', err);
    }
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tasks.editTask')}>
      <form autoComplete="off" onSubmit={handleSubmit}>
        {error && <div className="status-message status-message--error">{error}</div>}

        <div className={styles.titleFieldWrapper} ref={titleFieldRef}>
          <Input
            required
            label={t('tasks.form.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && mentionCandidates.length > 0) {
                e.preventDefault();
                handleSelectMention(mentionCandidates[0]);
              }
            }}
          />

          {mentionCandidates.length > 0 && (
            <div className={styles.mentionList}>
              {mentionCandidates.map((candidate) => {
                const Icon = ENTITY_ICON[candidate.entityType];
                return (
                  <button
                    key={`${candidate.entityType}-${candidate.entityId}`}
                    type="button"
                    className={styles.mentionItem}
                    onClick={() => handleSelectMention(candidate)}
                  >
                    <Icon size={16} className={styles.mentionIcon} />
                    <span className={styles.mentionText}>
                      <span className={styles.mentionPrimary}>{candidate.label}</span>
                      {candidate.secondary && <span className={styles.mentionSecondary}>{candidate.secondary}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Textarea
          label={t('tasks.form.description')}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className={styles.row}>
          <Input
            type="datetime-local"
            label={t('tasks.form.dueAt')}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">{t('tasks.form.priority')}</label>
            <select
              className="input-field"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="LOW">{t('tasks.priority.low')}</option>
              <option value="MEDIUM">{t('tasks.priority.medium')}</option>
              <option value="HIGH">{t('tasks.priority.high')}</option>
            </select>
          </div>
        </div>

        <div className={styles.checklistSection}>
          <span className="form-label">{t('tasks.form.checklist')}</span>

          {checklistLoading ? (
            <div className="page-loading">{t('common.loading')}</div>
          ) : (
            <div className={styles.checklistList}>
              {checklist.map((item) => (
                <div key={item.id} className={styles.checklistItem}>
                  <button
                    type="button"
                    className={`${styles.checkbox} ${item.done ? styles.checkboxDone : ''}`}
                    onClick={() => handleToggleChecklistItem(item)}
                    aria-label={t('tasks.markDone')}
                  >
                    {item.done && <Check size={12} />}
                  </button>
                  <span className={`${styles.checklistLabel} ${item.done ? styles.checklistLabelDone : ''}`}>
                    {item.label}
                  </span>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleRemoveChecklistItem(item)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {checklist.length === 0 && <p className={styles.emptyText}>{t('tasks.noTasksForEntity')}</p>}
            </div>
          )}

          <div className={styles.addItemRow}>
            <input
              className={styles.addItemInput}
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              placeholder={t('tasks.addChecklistItem')}
            />
            <button
              type="button"
              className="btn-secondary icon-button"
              title={t('tasks.addTask')}
              onClick={handleAddChecklistItem}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-icon-danger" onClick={() => setConfirmDelete(true)} title={t('common.delete')}>
            <Trash2 size={18} />
          </button>
          <div className={styles.footerSpacer} />
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {t('common.save')}
          </button>
        </div>
      </form>

      <ConfirmModal isOpen={confirmDelete} message={t('tasks.confirmDelete')} onConfirm={handleDelete} isDangerous />
    </Modal>
  );
};
