import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useUserEvent } from '../contexts/UserEventsContext';
import {
  notificationService,
  type AppNotification,
  type NotificationEntityType,
  type NotificationStreamEvent,
} from '../services/notificationService';
import { taskService } from '../services/taskService';
import { emitTaskChanged, subscribeTaskChanged } from '../utils/taskEvents';
import { toFormatedDate } from '../utils/dateUtils';
import styles from './NotificationBell.module.css';

// The badge is driven by the shared per-user SSE stream, not by polling - this
// is only a safety net for a silently stalled connection (backgrounded tab, a
// proxy that drops the connection without firing EventSource.onerror), same
// role and interval as the ticket comment streams' fallback.
const FALLBACK_POLL_INTERVAL_MS = 60000;

const ENTITY_TYPE_LABEL_KEY: Record<NotificationEntityType, string> = {
  TASK: 'notifications.entityTypeLabel.TASK',
  FINANCIAL_INSTALLMENT: 'notifications.entityTypeLabel.FINANCIAL_INSTALLMENT',
  TICKET: 'notifications.entityTypeLabel.TICKET',
  DEAL_CLOSE_DATE: 'notifications.entityTypeLabel.DEAL_CLOSE_DATE',
  DEAL_STAGE_SLA: 'notifications.entityTypeLabel.DEAL_STAGE_SLA',
};

// Tasks keep their own quick actions (Concluir/Adiar) below; everything else
// is a plain click-through that marks read and navigates to where the
// overdue/due-soon item actually lives. Financial installments have no
// per-installment detail route (Financial.tsx is list+modal only), so that
// one just opens the list.
const routeForNotification = (notification: AppNotification): string | null => {
  switch (notification.entityType) {
    case 'TICKET':
      return `/tickets/${notification.entityId}`;
    case 'DEAL_CLOSE_DATE':
    case 'DEAL_STAGE_SLA':
      return `/deals/${notification.entityId}`;
    case 'FINANCIAL_INSTALLMENT':
      return '/financial';
    default:
      return null;
  }
};

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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

  const fireBrowserNotification = (count: number, title?: string) => {
    if (permission !== 'granted' || typeof Notification === 'undefined') return;
    try {
      new Notification(t('notifications.browserPushTitle'), {
        // A pushed notification knows exactly which item it is, so show that
        // instead of the generic "you have N new alerts" the poll path uses.
        body: title || t('notifications.browserPushBody', { count }),
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
    // Financial/Ticket/Deal mutations elsewhere in the app don't have an
    // equivalent event yet - the 60s fallback poll below is what catches those up.
    return subscribeTaskChanged(() => {
      checkUnreadCount();
      if (openRef.current) fetchList();
    });
  }, []);

  // Live push: the server sends this user's authoritative unread count (plus the
  // new notification itself, when there is one) the moment anything changes, so
  // the bell updates instantly rather than up to a poll interval later.
  useUserEvent<NotificationStreamEvent>('notification', (event) => {
    const count = event.unreadCount ?? 0;

    if (event.notification) {
      fireBrowserNotification(1, event.notification.title);
      // Only when the dropdown is already open - otherwise toggleOpen fetches it.
      if (open) fetchList();
    }

    previousCountRef.current = count;
    setUnreadCount(count);
  });

  useEffect(() => {
    const timer = setInterval(() => checkUnreadCount(), FALLBACK_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

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

  const handleComplete = async (notification: AppNotification) => {
    removeLocally(notification.id);
    try {
      await Promise.all([
        taskService.changeStatus(notification.entityId, 'DONE'),
        notificationService.markRead(notification.id),
      ]);
      emitTaskChanged();
    } catch (error) {
      console.error('Error completing task from notification', error);
    }
  };

  const handleSnooze = async (notification: AppNotification) => {
    removeLocally(notification.id);
    const base = notification.dueAt ? new Date(notification.dueAt) : new Date();
    base.setDate(base.getDate() + 1);
    try {
      await Promise.all([
        taskService.snooze(notification.entityId, base.toISOString()),
        notificationService.markRead(notification.id),
      ]);
      emitTaskChanged();
    } catch (error) {
      console.error('Error snoozing task from notification', error);
    }
  };

  const handleItemClick = (notification: AppNotification) => {
    const route = routeForNotification(notification);
    if (!route) return;

    setOpen(false);
    if (!notification.readAt) {
      removeLocally(notification.id);
      notificationService.markRead(notification.id).catch(() => {});
    }
    navigate(route);
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
              {notifications.map((notification) => {
                const isTask = notification.entityType === 'TASK';
                const isUpcoming = notification.kind === 'UPCOMING';
                const metaText = isUpcoming
                  ? t('notifications.dueSoon', { date: toFormatedDate(notification.dueAt) })
                  : t('notifications.overdueSince', { date: toFormatedDate(notification.dueAt) });

                return (
                  <div
                    key={notification.id}
                    className={`${styles.item} ${!notification.readAt ? styles.itemUnread : ''} ${!isTask ? styles.itemClickable : ''}`}
                    onClick={!isTask ? () => handleItemClick(notification) : undefined}
                  >
                    {!isTask && (
                      <span className={styles.itemCategory}>{t(ENTITY_TYPE_LABEL_KEY[notification.entityType])}</span>
                    )}
                    <span className={styles.itemTitle}>{notification.title || notification.entityId}</span>
                    <span className={`${styles.itemMeta} ${isUpcoming ? styles.itemMetaUpcoming : ''}`}>
                      {metaText}
                    </span>
                    {isTask && (
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
