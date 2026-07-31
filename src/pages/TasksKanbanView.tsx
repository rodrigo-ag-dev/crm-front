import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ViewToggle } from '../components/ViewToggle';
import { useTranslation } from '../hooks/useTranslation';
import { taskService, type TaskEntityType, type TaskItem, type TaskStatus } from '../services/taskService';
import { getTaskDueBucket } from '../utils/taskDueBucket';
import type { ViewMode } from '../utils/viewPreferences';
import styles from './Funnel.module.css';

interface TasksKanbanViewProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ENTITY_PATH: Record<TaskEntityType, string> = {
  DEAL: 'deals',
  CONTACT: 'contacts',
  COMPANY: 'companies',
  TICKET: 'tickets',
};

const COLUMNS: { status: TaskStatus; labelKey: string; color: string }[] = [
  { status: 'PENDING', labelKey: 'tasks.kanban.todo', color: 'var(--secondary-color)' },
  { status: 'IN_PROGRESS', labelKey: 'tasks.kanban.doing', color: 'var(--warning-color)' },
  { status: 'DONE', labelKey: 'tasks.kanban.done', color: 'var(--success-color)' },
];

export const TasksKanbanView: React.FC<TasksKanbanViewProps> = ({ viewMode, onViewModeChange }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await taskService.search({ page: 0, size: 1000 });
      const items = (response.data.content || []).filter((task) => task.status !== 'CANCELED');
      setTasks(items);
    } catch (error) {
      console.error('Error fetching tasks for kanban', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const handleDragStart = (event: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    try {
      event.dataTransfer.setData('text/plain', taskId);
    } catch {
      // no-op
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (event: React.DragEvent, targetStatus: TaskStatus) => {
    event.preventDefault();

    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task || task.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === draggedTaskId ? { ...t, status: targetStatus } : t)));

    try {
      await taskService.changeStatus(draggedTaskId, targetStatus);
    } catch (error) {
      console.error('Error updating task status', error);
      fetchData();
    } finally {
      setDraggedTaskId(null);
    }
  };

  return (
    <div className={styles.funnelContainer}>
      <div className="page-header">
        <div className={styles.funnelTitleGroup}>
          <h1 className="page-title">{t('tasks.myDay.title')}</h1>
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        </div>
      </div>

      {loading ? (
        <div className={styles.funnelLoading}>{t('common.loading')}</div>
      ) : (
        <div className={styles.funnelBoard}>
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);

            return (
              <div
                key={column.status}
                className={styles.funnelColumn}
                style={{ '--stage-color': column.color } as React.CSSProperties}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, column.status)}
              >
                <div className={styles.funnelColumnHeader}>
                  <h3 className={styles.funnelColumnName}>{t(column.labelKey)}</h3>
                  <span className={styles.funnelColumnBadge}>{columnTasks.length}</span>
                </div>

                <div className={styles.funnelColumnContent}>
                  {columnTasks.map((task) => {
                    const bucket = getTaskDueBucket(task.dueAt);
                    return (
                      <div
                        key={task.id}
                        className={`${styles.funnelCard} ${draggedTaskId === task.id ? styles.funnelCardDragging : ''}`}
                        draggable
                        onDragStart={(event) => handleDragStart(event, task.id)}
                      >
                        <div className={styles.funnelCardHeader}>
                          <span className={styles.funnelCardTitle}>{task.title}</span>
                        </div>
                        <div className={styles.funnelCardBody}>
                          {task.entityType && task.entityId && (
                            <div className={styles.funnelCardBodyRow}>
                              <Link to={`/${ENTITY_PATH[task.entityType]}/${task.entityId}`}>
                                {task.entityLabel || task.entityId}
                              </Link>
                            </div>
                          )}
                          {task.checklistTotal > 0 && (
                            <div className={styles.funnelCardBodyRow}>
                              <span>{task.checklistDone}/{task.checklistTotal}</span>
                            </div>
                          )}
                        </div>
                        {task.dueAt && (
                          <div className={styles.funnelCardFooter}>
                            <span
                              style={{
                                color:
                                  bucket === 'overdue'
                                    ? 'var(--danger-color)'
                                    : bucket === 'today'
                                    ? 'var(--warning-color)'
                                    : 'var(--text-secondary)',
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {bucket === 'overdue' ? t('tasks.due.overdue') : bucket === 'today' ? t('tasks.due.today') : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
