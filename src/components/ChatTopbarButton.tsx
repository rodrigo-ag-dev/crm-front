import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useUserEvent } from '../contexts/UserEventsContext';
import { chatService, type ChatReadStreamEvent, type ChatStreamEvent } from '../services/chatService';
import styles from './NotificationBell.module.css';

// Safety net only - the badge is pushed over the shared per-user stream. Same
// role and interval as the notification bell's fallback.
const FALLBACK_POLL_INTERVAL_MS = 60000;

// Deliberately just a badge + link, not a dropdown: reading a message means
// opening the conversation, so there is nothing useful to show in a popover
// that the /chat page doesn't already show better. Reuses NotificationBell's
// CSS module so both topbar icons stay visually identical.
export const ChatTopbarButton: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = async () => {
    try {
      const response = await chatService.getUnreadCount();
      setUnreadCount(response.data?.count ?? 0);
    } catch (error) {
      console.error('Error fetching chat unread count', error);
    }
  };

  useEffect(() => {
    refreshCount();
    const timer = setInterval(() => refreshCount(), FALLBACK_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // totalUnreadCount is authoritative server-side - assign it rather than
  // incrementing, so a dropped or duplicated event can't make the badge drift.
  useUserEvent<ChatStreamEvent>('chat', (event) => setUnreadCount(event.totalUnreadCount ?? 0));
  useUserEvent<ChatReadStreamEvent>('chat-read', (event) => setUnreadCount(event.totalUnreadCount ?? 0));

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={() => navigate('/chat')}
        aria-label={t('chat.title')}
        title={t('chat.title')}
      >
        <MessageCircle size={18} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
    </div>
  );
};
