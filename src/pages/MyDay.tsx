import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { taskService, type TaskEntityType, type TaskItem } from '../services/taskService';
import { getTaskDueBucket, type TaskDueBucket } from '../utils/taskDueBucket';
import { ViewToggle } from '../components/ViewToggle';
import { getStoredViewMode, setStoredViewMode, type ViewMode } from '../utils/viewPreferences';
import { TasksKanbanView } from './TasksKanbanView';
import styles from './MyDay.module.css';

const ENTITY_PATH: Record<TaskEntityType, string> = {
  DEAL: 'deals',
  CONTACT: 'contacts',
  COMPANY: 'companies',
  TICKET: 'tickets',
};

const priorityClass = (priority: TaskItem['priority']) =>
  priority === 'HIGH' ? styles.priorityHigh : priority === 'LOW' ? styles.priorityLow : styles.priorityMedium;

export const MyDay: React.FC = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDate, setQuickAddDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('tasks'));

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setStoredViewMode('tasks', mode);
  };

  useEffect(() => {
    if (viewMode === 'list') fetchTasks();
  }, [viewMode]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const response = await taskService.getToday();
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching today tasks', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const handleQuickAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = quickAddTitle.trim();
    if (!title) return;

    setQuickAddTitle('');
    const dueAt = quickAddDate ? new Date(quickAddDate).toISOString() : undefined;
    setQuickAddDate('');

    try {
      await taskService.create({ title, dueAt, priority: 'MEDIUM' });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task', error);
    }
  };

  const handleComplete = async (task: TaskItem) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await taskService.changeStatus(task.id, 'DONE');
    } catch (error) {
      console.error('Error completing task', error);
      fetchTasks();
    }
  };

  const handleSnooze = async (task: TaskItem) => {
    const base = task.dueAt ? new Date(task.dueAt) : new Date();
    base.setDate(base.getDate() + 1);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await taskService.snooze(task.id, base.toISOString());
    } catch (error) {
      console.error('Error snoozing task', error);
      fetchTasks();
    }
  };

  const groups: { key: TaskDueBucket; labelKey: string; dotClass: string; items: TaskItem[] }[] = [
    { key: 'overdue', labelKey: 'tasks.groups.overdue', dotClass: styles.dotOverdue, items: [] },
    { key: 'today', labelKey: 'tasks.groups.today', dotClass: styles.dotToday, items: [] },
    { key: 'future', labelKey: 'tasks.groups.future', dotClass: styles.dotFuture, items: [] },
  ];

  for (const task of tasks) {
    const bucket = getTaskDueBucket(task.dueAt);
    if (!bucket) continue;
    groups.find((g) => g.key === bucket)?.items.push(task);
  }

  const hasAny = tasks.length > 0;

  if (viewMode === 'kanban') {
    return <TasksKanbanView viewMode={viewMode} onViewModeChange={handleViewModeChange} />;
  }

  return (
    <div className={styles.page}>
      <div className="page-header">
        <div className={styles.titleGroup}>
          <h1 className="page-title">{t('tasks.myDay.title')}</h1>
          <ViewToggle value={viewMode} onChange={handleViewModeChange} />
        </div>
      </div>

      <form className={styles.quickAdd} onSubmit={handleQuickAdd}>
        <input
          className={styles.quickAddInput}
          value={quickAddTitle}
          onChange={(e) => setQuickAddTitle(e.target.value)}
          placeholder={t('tasks.quickAddPlaceholder')}
        />
        <input
          type="datetime-local"
          className={styles.quickAddDate}
          value={quickAddDate}
          onChange={(e) => setQuickAddDate(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          <Plus size={16} />
          {t('tasks.addTask')}
        </button>
      </form>

      {loading ? (
        <div className="page-loading">{t('common.loading')}</div>
      ) : !hasAny ? (
        <p className="empty-state">{t('tasks.myDay.empty')}</p>
      ) : (
        groups.map((group) =>
          group.items.length === 0 ? null : (
            <div key={group.key} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={`${styles.groupDot} ${group.dotClass}`} />
                <span className={styles.groupTitle}>{t(group.labelKey)}</span>
                <span className={styles.groupCount}>{group.items.length}</span>
              </div>

              {group.items.map((task) => (
                <div key={task.id} className={styles.row}>
                  <button
                    type="button"
                    className={styles.checkbox}
                    onClick={() => handleComplete(task)}
                    aria-label={t('tasks.markDone')}
                  >
                    <Check size={14} />
                  </button>

                  <div className={styles.rowBody}>
                    <span className={styles.rowTitle}>{task.title}</span>
                    <div className={styles.rowMeta}>
                      <span className={priorityClass(task.priority)} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%' }} />
                      {task.entityType && task.entityId && (
                        <Link className={styles.entityLink} to={`/${ENTITY_PATH[task.entityType]}/${task.entityId}`}>
                          {task.entityLabel || task.entityId}
                        </Link>
                      )}
                      {task.checklistTotal > 0 && <span>{task.checklistDone}/{task.checklistTotal}</span>}
                    </div>
                  </div>

                  <button type="button" className={styles.snoozeButton} onClick={() => handleSnooze(task)}>
                    {t('tasks.snoozeOneDay')}
                  </button>
                </div>
              ))}
            </div>
          ),
        )
      )}
    </div>
  );
};
