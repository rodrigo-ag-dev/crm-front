import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useEventStream } from '../hooks/useEventStream';
import {
  notificationService,
  type NotificationStreamEvent,
  type TaskNotification,
} from '../services/notificationService';
import { taskService } from '../services/taskService';
import { emitTaskChanged, subscribeTaskChanged } from '../utils/taskEvents';
import { toFormatedDate } from '../utils/dateUtils';
import styles from './NotificationBell.module.css';

// The badge is driven by the SSE stream below, not by polling - this is only a
// safety net for a silently stalled connection (backgrounded tab, a proxy that
// drops the connection without firing EventSource.onerror), same role and
// interval as the ticket comment streams' fallback.
const FALLBACK_POLL_INTERVAL_MS = 60000;

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const previousCountRef = useRef(0);
  const isCheckingRef = useRef(false);
  // Read from the mount-only taskChanged subscription below, which can't close
  // over `open` without resubscribing on every toggle.
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const streamUrl = notificationService.getStreamUrl();

  const fireBrowserNotification = (count: number, taskTitle?: string) => {
    if (permission !== 'granted' || typeof Notification === 'undefined') return;
    try {
      new Notification(t('notifications.browserPushTitle'), {
        // A pushed notification knows exactly which task it is, so show that
        // instead of the generic "you have N overdue tasks" the poll path uses.
        body: taskTitle || t('notifications.browserPushBody', { count }),
      });
    } catch {
      // Some browsers disallow direct construction in certain contexts; safe to ignore.
    }
  };

  const checkUnreadCount = async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      const response = await notificationService.getUnreadCount();
      const count = response.data?.count ?? 0;
      if (count > previousCountRef.current) {
        fireBrowserNotification(count - previousCountRef.current);
      }
      previousCountRef.current = count;
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread notification count', error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getList(20);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUnreadCount();
    // Completing/snoozing/deleting a task anywhere else in the app (Meu Dia's
    // Kanban, a TaskWidget, the quick-add bar) can invalidate this user's own
    // notifications. The backend only purges those lazily, on read - so re-read
    // here to drop the badge immediately instead of waiting for the fallback poll.
    return subscribeTaskChanged(() => {
      checkUnreadCount();
      if (openRef.current) fetchList();
    });
  }, []);

  // Live push: the server sends this user's authoritative unread count (plus the
  // new notification itself, when there is one) the moment anything changes, so
  // the bell updates instantly rather than up to a poll interval later.
  useEventStream<NotificationStreamEvent>({
    url: streamUrl,
    eventName: 'notification',
    onEvent: (event) => {
      const count = event.unreadCount ?? 0;

      if (event.notification) {
        fireBrowserNotification(1, event.notification.taskTitle);
        // Only when the dropdown is already open - otherwise toggleOpen fetches it.
        if (open) fetchList();
      }

      previousCountRef.current = count;
      setUnreadCount(count);
    },
    fallbackPoll: checkUnreadCount,
    fallbackIntervalMs: FALLBACK_POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const removeLocally = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    previousCountRef.current = Math.max(0, previousCountRef.current - 1);
  };

  const handleComplete = async (notification: TaskNotification) => {
    removeLocally(notification.id);
    try {
      await Promise.all([
        taskService.changeStatus(notification.taskId, 'DONE'),
        notificationService.markRead(notification.id),
      ]);
      emitTaskChanged();
    } catch (error) {
      console.error('Error completing task from notification', error);
    }
  };

  const handleSnooze = async (notification: TaskNotification) => {
    removeLocally(notification.id);
    const base = notification.taskDueAt ? new Date(notification.taskDueAt) : new Date();
    base.setDate(base.getDate() + 1);
    try {
      await Promise.all([
        taskService.snooze(notification.taskId, base.toISOString()),
        notificationService.markRead(notification.id),
      ]);
      emitTaskChanged();
    } catch (error) {
      console.error('Error snoozing task from notification', error);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    previousCountRef.current = 0;
    if (unreadIds.length === 0) return;

    try {
      await notificationService.markAllRead();
    } catch (error) {
      console.error('Error marking all notifications as read', error);
    }
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={toggleOpen}
        aria-label={t('notifications.title')}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>{t('notifications.title')}</span>
            <button
              type="button"
              className={styles.markAllButton}
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              {t('notifications.markAllRead')}
            </button>
          </div>

          {permission === 'default' && (
            <div className={styles.permissionBanner}>
              <span>{t('notifications.enableBrowserPush')}</span>
              <button type="button" className={styles.permissionButton} onClick={requestPushPermission}>
                {t('notifications.enable')}
              </button>
            </div>
          )}

          {loading ? (
            <div className="page-loading">{t('common.loading')}</div>
          ) : notifications.length === 0 ? (
            <p className={styles.emptyState}>{t('notifications.empty')}</p>
          ) : (
            <div className={styles.list}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.item} ${!notification.readAt ? styles.itemUnread : ''}`}
                >
                  <span className={styles.itemTitle}>{notification.taskTitle || notification.taskId}</span>
                  <span className={styles.itemMeta}>
                    {t('notifications.overdueSince', { date: toFormatedDate(notification.taskDueAt) })}
                  </span>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={`${styles.itemActionButton} ${styles.itemActionPrimary}`}
                      onClick={() => handleComplete(notification)}
                    >
                      <Check size={13} />
                      {t('tasks.markDone')}
                    </button>
                    <button
                      type="button"
                      className={styles.itemActionButton}
                      onClick={() => handleSnooze(notification)}
                    >
                      <Clock size={13} />
                      {t('tasks.snoozeOneDay')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
