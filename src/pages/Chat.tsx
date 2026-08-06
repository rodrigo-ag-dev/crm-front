import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Plus, Send, X } from 'lucide-react';
import {
  chatService,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
  type ChatReadStreamEvent,
  type ChatStreamEvent,
} from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import { useUserEvent } from '../contexts/UserEventsContext';
import { useTranslation } from '../hooks/useTranslation';
import { SplitViewShell, RecordListRow, RecordListRowsSkeleton } from '../components/SplitViewShell';
import { Modal } from '../components/Modal';
import splitStyles from '../components/SplitViewShell.module.css';
import styles from './Chat.module.css';

const formatTime = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const Chat: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    activeIdRef.current = id;
  }, [id]);

  const active = useMemo(() => conversations.find((c) => c.id === id), [conversations, id]);

  const fetchConversations = async () => {
    try {
      const response = await chatService.getConversations();
      setConversations(response.data || []);
    } catch (err) {
      console.error('Error fetching conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!id) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    chatService
      .getMessages(id)
      .then((response) => {
        if (!cancelled) setMessages(response.data || []);
      })
      .catch((err) => {
        console.error('Error fetching messages', err);
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    // Opening a conversation is what marks it read; the backend echoes the new
    // total back over the stream so other tabs drop the badge too.
    chatService.markRead(id).catch((err) => console.error('Error marking conversation read', err));
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useUserEvent<ChatStreamEvent>('chat', (event) => {
    const isActive = event.conversation.id === activeIdRef.current;

    setConversations((prev) => {
      const summary = isActive ? { ...event.conversation, unreadCount: 0 } : event.conversation;
      const without = prev.filter((c) => c.id !== summary.id);
      return [summary, ...without];
    });

    if (!isActive) return;

    // The backend publishes before the POST resolves, so this can be the echo of
    // a message this tab just sent - dedupe by id instead of appending blindly.
    setMessages((prev) => (
      prev.some((m) => m.id === event.message.id)
        ? prev.map((m) => (m.id === event.message.id ? event.message : m))
        : [...prev, event.message]
    ));

    if (event.message.senderId !== user?.id) {
      chatService.markRead(event.conversation.id).catch(() => {});
    }
  });

  useUserEvent<ChatReadStreamEvent>('chat-read', (event) => {
    setConversations((prev) => prev.map((c) => (c.id === event.conversationId ? { ...c, unreadCount: 0 } : c)));
  });

  const openContacts = async () => {
    setContactsOpen(true);
    setLoadingContacts(true);
    try {
      const response = await chatService.getContacts();
      setContacts(response.data || []);
    } catch (err) {
      console.error('Error fetching chat contacts', err);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (!contactsOpen) return;

    const timer = setTimeout(async () => {
      setLoadingContacts(true);
      try {
        const response = await chatService.getContacts(contactSearch || undefined);
        setContacts(response.data || []);
      } catch (err) {
        console.error('Error searching chat contacts', err);
      } finally {
        setLoadingContacts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [contactSearch, contactsOpen]);

  const startConversation = async (contact: ChatContact) => {
    try {
      const response = await chatService.startConversation(contact.id);
      setContactsOpen(false);
      setContactSearch('');
      setConversations((prev) => (
        prev.some((c) => c.id === response.data.id) ? prev : [response.data, ...prev]
      ));
      navigate(`/chat/${response.data.id}`);
    } catch (err) {
      console.error('Error starting conversation', err);
      setError(t('chat.errorStarting'));
    }
  };

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || !id || sending) return;

    setSending(true);
    setError('');
    try {
      const response = await chatService.sendMessage(id, trimmed);
      setBody('');
      // Same race as the ticket timeline: the SSE echo of this exact message can
      // beat this response back, so dedupe rather than appending.
      setMessages((prev) => (
        prev.some((m) => m.id === response.data.id) ? prev : [...prev, response.data]
      ));
    } catch (err) {
      console.error('Error sending message', err);
      setError(t('chat.errorSending'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className={splitStyles.page}>
        <div className="page-header">
          <h1 className="page-title">{t('chat.title')}</h1>
          <div className="toolbar-actions">
            <button className="btn-primary" onClick={openContacts}>
              <Plus size={18} />
              {t('chat.newConversation')}
            </button>
          </div>
        </div>

        <SplitViewShell
          hasSelection={!!id}
          left={
            <>
              <div className={splitStyles.listPaneHeader}>
                <span className={splitStyles.listPaneTitle}>{t('chat.conversations')}</span>
              </div>

              <div className={splitStyles.listPaneBody}>
                {loadingConversations ? (
                  <RecordListRowsSkeleton />
                ) : conversations.length === 0 ? (
                  <p className="empty-state">{t('chat.noConversations')}</p>
                ) : (
                  conversations.map((conversation) => (
                    <RecordListRow
                      key={conversation.id}
                      to={`/chat/${conversation.id}`}
                      isActive={conversation.id === id}
                      primary={conversation.participant.fullName}
                      secondary={conversation.lastMessagePreview || conversation.participant.email}
                      meta={formatTime(conversation.lastMessageAt)}
                      badge={
                        conversation.unreadCount > 0 ? (
                          <span className={styles.unreadBadge}>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        ) : undefined
                      }
                    />
                  ))
                )}
              </div>
            </>
          }
          right={
            !active ? (
              <p className="empty-state">{t('chat.selectConversation')}</p>
            ) : (
              <div className={`card ${styles.thread}`}>
                <div className={styles.threadHeader}>
                  <div className={styles.threadTitleGroup}>
                    <span className={styles.threadTitle}>{active.participant.fullName}</span>
                    {active.participant.crossTenant && (
                      <span className={styles.tenantTag}>
                        <Building2 size={11} />
                        {active.participant.tenantName || t('chat.otherTenant')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.closeThread}
                    onClick={() => navigate('/chat')}
                    aria-label={t('common.close')}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className={styles.messageList}>
                  {loadingMessages ? (
                    <div className="page-loading">{t('common.loading')}</div>
                  ) : messages.length === 0 ? (
                    <p className={styles.emptyText}>{t('chat.noMessages')}</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${styles.bubble} ${message.senderId === user?.id ? styles.bubbleMine : styles.bubbleTheirs}`}
                      >
                        <div className={styles.bubbleHeader}>
                          <span className={styles.bubbleAuthor}>{message.senderName}</span>
                          <span className={styles.timestamp}>{formatTime(message.createdAt)}</span>
                        </div>
                        <span className={styles.bubbleBody}>{message.body}</span>
                      </div>
                    ))
                  )}
                  <div ref={listEndRef} />
                </div>

                {error && <p className="form-error">{error}</p>}

                <div className={styles.composer}>
                  <textarea
                    className={styles.composerTextarea}
                    rows={2}
                    value={body}
                    placeholder={t('chat.messagePlaceholder')}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button className="btn-primary" onClick={handleSend} disabled={sending || !body.trim()}>
                    <Send size={16} />
                    {t('chat.send')}
                  </button>
                </div>
              </div>
            )
          }
        />
      </div>

      {contactsOpen && (
        <Modal isOpen title={t('chat.newConversation')} onClose={() => setContactsOpen(false)}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              autoFocus
              placeholder={t('chat.searchContacts')}
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
            />
          </div>

          <div className={styles.contactList}>
            {loadingContacts ? (
              <div className="page-loading">{t('common.loading')}</div>
            ) : contacts.length === 0 ? (
              <p className={styles.emptyText}>{t('chat.noContacts')}</p>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={styles.contactRow}
                  onClick={() => startConversation(contact)}
                >
                  <span className={styles.contactName}>{contact.fullName}</span>
                  <span className={styles.contactMeta}>
                    {contact.email}
                    {contact.crossTenant && ` · ${contact.tenantName || t('chat.otherTenant')}`}
                  </span>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default Chat;
