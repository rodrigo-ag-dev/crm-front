import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useUserEvent } from '../contexts/UserEventsContext';
import { chatService, type ChatReadStreamEvent, type ChatStreamEvent } from '../services/chatService';
import styles from './NotificationBell.module.css';

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

  useUserEvent<ChatStreamEvent>('chat', (event) => {
    if (typeof event.totalUnreadCount === 'number') {
      setUnreadCount(event.totalUnreadCount);
    }
    void refreshCount();
  });
  useUserEvent<ChatReadStreamEvent>('chat-read', (event) => {
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
