import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useUserEvent } from '../contexts/UserEventsContext';
import { chatService, type ChatReadStreamEvent, type ChatStreamEvent } from '../services/chatService';
import styles from './NotificationBell.module.css';

// The badge is driven by the shared per-user stream. Keeping this polling-free
// avoids unnecessary API traffic and server load while still letting the UI
// update on real chat events.

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
    void refreshCount();
  }, []);

  // totalUnreadCount is authoritative server-side - assign it rather than
  // incrementing, so a dropped or duplicated event can't make the badge drift.
  // Re-sync from the backend on every chat event as a safety net, because the
  // badge must stay correct even when the chat page is closed and the user is
  // only looking at the header.
  useUserEvent<ChatStreamEvent>('chat', (event) => {
    console.debug('[chat-badge] chat event', event);
    if (typeof event.totalUnreadCount === 'number') {
      setUnreadCount(event.totalUnreadCount);
    }
    void refreshCount();
  });
  useUserEvent<ChatReadStreamEvent>('chat-read', (event) => {
    console.debug('[chat-badge] chat-read event', event);
    if (typeof event.totalUnreadCount === 'number') {
      setUnreadCount(event.totalUnreadCount);
    }
    void refreshCount();
  });

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
