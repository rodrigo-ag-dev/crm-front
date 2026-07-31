import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { taskService, type TaskChecklistItem, type TaskEntityType, type TaskItem } from '../services/taskService';
import { getTaskDueBucket } from '../utils/taskDueBucket';
import { emitTaskChanged } from '../utils/taskEvents';
import { ConfirmModal } from './ConfirmModal';
import styles from './TaskWidget.module.css';

interface TaskWidgetProps {
  entityType: TaskEntityType;
  entityId: string;
}

const DueBadge: React.FC<{ dueAt?: string }> = ({ dueAt }) => {
  const { t } = useTranslation();
  const bucket = getTaskDueBucket(dueAt);
  if (!bucket) return null;

  const locale = localStorage.getItem('@CRM:language') || navigator.language || 'pt-BR';
  const time = new Date(dueAt!).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const dateAndTime = new Date(dueAt!).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const className = bucket === 'overdue' ? styles.dueOverdue : bucket === 'today' ? styles.dueToday : styles.dueFuture;
  const text =
    bucket === 'overdue'
      ? `${t('tasks.due.overdue')} · ${dateAndTime}`
      : bucket === 'today'
      ? `${t('tasks.due.today')} · ${time}`
      : dateAndTime;

  return <span className={`${styles.dueBadge} ${className}`}>{text}</span>;
};

export const TaskWidget: React.FC<TaskWidgetProps> = ({ entityType, entityId }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, TaskChecklistItem[]>>({});
  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [entityType, entityId]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const response = await taskService.getByEntity(entityType, entityId);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching tasks', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const handleQuickAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = quickAddValue.trim();
    if (!title) return;

    setQuickAddValue('');
    try {
      await taskService.create({ title, entityType, entityId, priority: 'MEDIUM' });
      emitTaskChanged();
      fetchTasks();
    } catch (error) {
      console.error('Error creating task', error);
    }
  };

  const handleToggleDone = async (task: TaskItem) => {
    const nextStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      await taskService.changeStatus(task.id, nextStatus);
      emitTaskChanged();
    } catch (error) {
      console.error('Error updating task status', error);
      fetchTasks();
    }
  };

  const handleDelete = async (confirmed: boolean) => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!confirmed || !id) return;

    try {
      await taskService.remove(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      emitTaskChanged();
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const toggleExpand = async (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
      return;
    }

    setExpandedTaskId(taskId);
    if (!checklists[taskId]) {
      try {
        const response = await taskService.getChecklist(taskId);
        setChecklists((prev) => ({ ...prev, [taskId]: response.data || [] }));
      } catch (error) {
        console.error('Error fetching checklist', error);
      }
    }
  };

  const handleAddChecklistItem = async (taskId: string) => {
    const label = newChecklistLabel.trim();
    if (!label) return;

    setNewChecklistLabel('');
    try {
      const response = await taskService.addChecklistItem(taskId, label);
      setChecklists((prev) => ({ ...prev, [taskId]: [...(prev[taskId] || []), response.data] }));
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, checklistTotal: t.checklistTotal + 1 } : t)));
    } catch (error) {
      console.error('Error adding checklist item', error);
    }
  };

  const handleToggleChecklistItem = async (taskId: string, item: TaskChecklistItem) => {
    const nextDone = !item.done;
    setChecklists((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || []).map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)),
    }));
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, checklistDone: t.checklistDone + (nextDone ? 1 : -1) } : t)),
    );

    try {
      await taskService.updateChecklistItem(taskId, item.id, { label: item.label, done: nextDone, position: item.position });
    } catch (error) {
      console.error('Error updating checklist item', error);
    }
  };

  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const total = tasks.length;
  const progress = total > 0 ? doneCount / total : 0;
  const radius = 12;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3>{t('tasks.widgetTitle')}</h3>
          {total > 0 && (
            <div className={styles.progressRing} title={`${doneCount}/${total}`}>
              <svg width="30" height="30" viewBox="0 0 30 30">
                <circle className={styles.progressTrack} cx="15" cy="15" r={radius} />
                <circle
                  className={styles.progressValue}
                  cx="15"
                  cy="15"
                  r={radius}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                />
              </svg>
              <span className={styles.progressLabel}>{doneCount}/{total}</span>
            </div>
          )}
        </div>
      </div>

      <form className={styles.quickAdd} onSubmit={handleQuickAdd}>
        <input
          className={styles.quickAddInput}
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          placeholder={t('tasks.quickAddPlaceholder')}
        />
        <button type="submit" className="btn-secondary icon-button" title={t('tasks.addTask')}>
          <Plus size={16} />
        </button>
      </form>

      {loading ? (
        <div className="page-loading">{t('common.loading')}</div>
      ) : tasks.length === 0 ? (
        <p className={styles.emptyState}>{t('tasks.noTasksForEntity')}</p>
      ) : (
        <div className={styles.list}>
          {tasks.map((task) => (
            <React.Fragment key={task.id}>
              <div className={styles.row}>
                <button
                  type="button"
                  className={`${styles.checkbox} ${task.status === 'DONE' ? styles.checkboxDone : ''}`}
                  onClick={() => handleToggleDone(task)}
                  aria-label={t('tasks.markDone')}
                >
                  {task.status === 'DONE' && <Check size={12} />}
                </button>

                <div className={styles.rowBody}>
                  <div className={styles.rowTitleLine}>
                    <span className={`${styles.priorityDot} ${styles[`priority${task.priority.charAt(0)}${task.priority.slice(1).toLowerCase()}`]}`} />
                    <button
                      type="button"
                      className={`${styles.rowTitle} ${task.status === 'DONE' ? styles.rowTitleDone : ''}`}
                      onClick={() => toggleExpand(task.id)}
                    >
                      {task.title}
                    </button>
                  </div>
                  <div className={styles.rowMeta}>
                    <DueBadge dueAt={task.dueAt} />
                    {task.checklistTotal > 0 && <span>{task.checklistDone}/{task.checklistTotal}</span>}
                  </div>
                </div>

                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => toggleExpand(task.id)}
                    aria-label={t('tasks.viewChecklist')}
                  >
                    {expandedTaskId === task.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setConfirmDeleteId(task.id)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expandedTaskId === task.id && (
                <>
                  {(checklists[task.id] || []).map((item) => (
                    <div key={item.id} className={styles.checklistItem} style={{ marginLeft: 28 }}>
                      <button
                        type="button"
                        className={`${styles.checkbox} ${item.done ? styles.checkboxDone : ''}`}
                        onClick={() => handleToggleChecklistItem(task.id, item)}
                        aria-label={t('tasks.markDone')}
                      >
                        {item.done && <Check size={11} />}
                      </button>
                      <span className={`${styles.checklistLabel} ${item.done ? styles.checklistLabelDone : ''}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                  <form
                    className={styles.checklistAdd}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddChecklistItem(task.id);
                    }}
                  >
                    <input
                      className={styles.checklistAddInput}
                      value={newChecklistLabel}
                      onChange={(e) => setNewChecklistLabel(e.target.value)}
                      placeholder={t('tasks.addChecklistItem')}
                    />
                  </form>
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteId != null}
        message={t('tasks.confirmDelete')}
        onConfirm={handleDelete}
        isDangerous
      />
    </div>
  );
};
