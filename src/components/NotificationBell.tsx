import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, Trash2 } from 'lucide-react';
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
const PAGE_SIZE = 20;

type TabKey = 'unread' | 'read';

interface TabState {
  items: AppNotification[];
  page: number;
  totalPages: number;
  loading: boolean;
  loaded: boolean;
}

const emptyTabState: TabState = { items: [], page: 0, totalPages: 0, loading: false, loaded: false };

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
  const [activeTab, setActiveTab] = useState<TabKey>('unread');
  const [tabs, setTabs] = useState<Record<TabKey, TabState>>({ unread: emptyTabState, read: emptyTabState });
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const previousCountRef = useRef(0);
  const isCheckingRef = useRef(false);
  // Read from the mount-only taskChanged subscription below, which can't close
  // over `open`/`activeTab` without resubscribing on every change.
  const openRef = useRef(false);
  const activeTabRef = useRef<TabKey>('unread');
  useEffect(() => {
    openRef.current = open;
    activeTabRef.current = activeTab;
  }, [open, activeTab]);

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

  // page 0 replaces the tab's items; any later page appends (the "Carregar
  // mais" pagination footer).
  const fetchTab = async (tab: TabKey, page: number) => {
    setTabs((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: true } }));
    try {
      const response = await notificationService.getList(page, PAGE_SIZE, tab === 'read');
      const data = response.data;
      setTabs((prev) => ({
        ...prev,
        [tab]: {
          items: page === 0 ? (data.content || []) : [...prev[tab].items, ...(data.content || [])],
          page: data.page ?? page,
          totalPages: data.totalPages ?? 0,
          loading: false,
          loaded: true,
        },
      }));
    } catch (error) {
      console.error('Error fetching notifications', error);
      setTabs((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: false, loaded: true } }));
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
      if (openRef.current && activeTabRef.current === 'unread') fetchTab('unread', 0);
    });
  }, []);

  // Live push: the server sends this user's authoritative unread count the
  // moment anything changes, so the badge updates instantly rather than up to
  // a poll interval later. The visible list isn't auto-refreshed on this event
  // even when open - the unread tab is oldest-first, so a brand new item never
  // lands on the page currently in view anyway.
  useUserEvent<NotificationStreamEvent>('notification', (event) => {
    const count = event.unreadCount ?? 0;
    if (event.notification) {
      fireBrowserNotification(1, event.notification.title);
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
    if (next) {
      // Always reopen on "não lidas"; "lidas" is only fetched once that tab
      // is actually clicked, and starts fresh every time the dropdown opens.
      setActiveTab('unread');
      setTabs({ unread: emptyTabState, read: emptyTabState });
      fetchTab('unread', 0);
    }
  };

  const handleTabClick = (tab: TabKey) => {
    setActiveTab(tab);
    if (!tabs[tab].loaded) fetchTab(tab, 0);
  };

  const handleLoadMore = () => {
    const tab = tabs[activeTab];
    if (tab.loading || tab.page + 1 >= tab.totalPages) return;
    fetchTab(activeTab, tab.page + 1);
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const removeFromTab = (tab: TabKey, notificationId: string) => {
    setTabs((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], items: prev[tab].items.filter((n) => n.id !== notificationId) },
    }));
  };

  const decrementUnread = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
    previousCountRef.current = Math.max(0, previousCountRef.current - 1);
  };

  const handleComplete = async (notification: AppNotification) => {
    removeFromTab('unread', notification.id);
    decrementUnread();
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
    removeFromTab('unread', notification.id);
    decrementUnread();
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
      removeFromTab('unread', notification.id);
      decrementUnread();
      notificationService.markRead(notification.id).catch(() => {});
    }
    navigate(route);
  };

  const handleDelete = async (event: React.MouseEvent, notification: AppNotification) => {
    event.stopPropagation();
    removeFromTab('read', notification.id);
    try {
      await notificationService.deleteNotification(notification.id);
    } catch (error) {
      console.error('Error deleting notification', error);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    setUnreadCount(0);
    previousCountRef.current = 0;
    try {
      await notificationService.markAllRead();
    } catch (error) {
      console.error('Error marking all notifications as read', error);
    }

    fetchTab('unread', 0);
    // The read tab's cache is now stale (everything just moved into it) -
    // drop it so the next visit fetches fresh instead of showing old data.
    setTabs((prev) => ({ ...prev, read: emptyTabState }));
    if (activeTab === 'read') fetchTab('read', 0);
  };

  const currentTab = tabs[activeTab];

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

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'unread' ? styles.tabActive : ''}`}
              onClick={() => handleTabClick('unread')}
            >
              {t('notifications.unreadTab')}{unreadCount > 0 ? ` (${unreadCount > 99 ? '99+' : unreadCount})` : ''}
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'read' ? styles.tabActive : ''}`}
              onClick={() => handleTabClick('read')}
            >
              {t('notifications.readTab')}
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

          {currentTab.loading && currentTab.items.length === 0 ? (
            <div className="page-loading">{t('common.loading')}</div>
          ) : currentTab.items.length === 0 ? (
            <p className={styles.emptyState}>
              {activeTab === 'unread' ? t('notifications.empty') : t('notifications.emptyRead')}
            </p>
          ) : (
            <div className={styles.list}>
              {currentTab.items.map((notification) => {
                const isTask = notification.entityType === 'TASK';
                const isUpcoming = notification.kind === 'UPCOMING';
                const metaText = isUpcoming
                  ? t('notifications.dueSoon', { date: toFormatedDate(notification.dueAt) })
                  : t('notifications.overdueSince', { date: toFormatedDate(notification.dueAt) });
                const showActions = isTask && activeTab === 'unread';
                const showDelete = activeTab === 'read';

                return (
                  <div
                    key={notification.id}
                    className={`${styles.item} ${!notification.readAt ? styles.itemUnread : ''} ${!isTask ? styles.itemClickable : ''}`}
                    onClick={!isTask ? () => handleItemClick(notification) : undefined}
                  >
                    {(!isTask || showDelete) && (
                      <div className={styles.itemTopRow}>
                        {!isTask && (
                          <span className={styles.itemCategory}>{t(ENTITY_TYPE_LABEL_KEY[notification.entityType])}</span>
                        )}
                        {showDelete && (
                          <button
                            type="button"
                            className={styles.itemDeleteButton}
                            onClick={(event) => handleDelete(event, notification)}
                            aria-label={t('notifications.delete')}
                            title={t('notifications.delete')}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                    <span className={styles.itemTitle}>{notification.title || notification.entityId}</span>
                    <span className={`${styles.itemMeta} ${isUpcoming ? styles.itemMetaUpcoming : ''}`}>
                      {metaText}
                    </span>
                    {showActions && (
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

              {currentTab.page + 1 < currentTab.totalPages && (
                <button
                  type="button"
                  className={styles.loadMoreButton}
                  onClick={handleLoadMore}
                  disabled={currentTab.loading}
                >
                  {currentTab.loading ? t('common.loading') : t('notifications.loadMore')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
